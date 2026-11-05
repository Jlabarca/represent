#!/usr/bin/env python3
"""orkest-hooks -- one engine-neutral tool for Orkest hook wiring (stdlib only).

Subcommands
  run --engine codex|claude <hook>
      Payload adapter. Reads the engine's hook payload on stdin, normalizes it to the
      Claude-shaped contract the bin/<hook>.{ps1,sh} policy scripts read
      (tool_input.file_path / tool_input.command / session_id), runs the policy script
      from the repository root, and translates the result back into the engine's output
      contract. Codex `apply_patch` carries the whole patch in tool_input.command, so the
      patch is expanded into one policy call per affected file -- without this, every
      file_path-based gate (tdd-test-gate, check-impl-phase) silently allows Codex edits.

  reconcile --target <root> [--template <root>] [--engine claude|codex|all] [--execute] [--json]
      Install/update lifecycle for the live, project-scoped wiring files
      (.claude/settings.json, .codex/hooks.json). Absent file -> created from the example.
      Present file -> canonical handlers that are missing are added, recognized older
      canonical commands are refreshed, everything else is preserved: local handlers,
      customized commands/matchers, explicit disables. Dry-run unless --execute.

  check --target <root> [--template <root>] [--json] [--globals]
      Read-only, handler-aware diagnosis per engine: ok | partial (deliberate disables) |
      off (engine opted out) | missing (no live file) | drift (canonical handler missing or
      stale, referenced bin/ script absent, malformed file). Exit 1 on drift/missing.
      --globals lists user-global hooks as information only (never part of a verdict).

Disables (never re-added by reconcile): an event whose array is present and empty, or an
entry in <root>/.orkest/hooks.json {"disabled": ["codex:tdd-test-gate", "claude:*", ...]}
("<engine>:<hook>", "<hook>" for every engine, "<engine>:*" to opt an engine out).
User-global engine configuration and Codex trust hashes are never read or written here.

Launchers: bin/orkest-hooks.ps1 and bin/orkest-hooks.sh find a Python 3 and forward
stdin, arguments and the exit code. Contract: docs/reference/hooks-parity.md.

Exit codes (run): 0 allow / warned / informational, 2 block (stderr carries the reason).
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

def environment(name):
    return os.environ.get('ORKEST_' + name) or os.environ.get('GHOSTDEV_' + name)


BIN_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(BIN_DIR)

# Events whose plain stdout the engine adds as model context (Codex contract).
CONTEXT_EVENTS = {"SessionStart", "UserPromptSubmit", "SubagentStart"}
# Events that must answer with JSON on exit 0 (Codex contract: plain text is invalid).
JSON_REQUIRED_EVENTS = {"Stop", "SubagentStop"}
# Tool names that carry an apply_patch body in tool_input.command.
PATCH_TOOLS = {"apply_patch"}
# Codex shell tools that match the `Bash` matcher alias; normalized for the policy scripts.
SHELL_TOOLS = {"exec_command", "shell", "local_shell", "unified_exec", "container.exec"}


# ---------------------------------------------------------------------------------------
# apply_patch parsing
# ---------------------------------------------------------------------------------------
_HEADER = re.compile(r"^\*\*\* (Add|Update|Delete) File: (.+?)\s*$")
_MOVE = re.compile(r"^\*\*\* Move to: (.+?)\s*$")


def parse_patch(text):
    """Return [{op, path, move_to, added}] for every file an apply_patch body touches.

    Tolerates the heredoc wrapper (`apply_patch <<'EOF' ... EOF`) and CRLF. `added` is the
    text of the file's `+` lines (the new content for Add, the inserted lines for Update)."""
    files = []
    cur = None
    for raw in (text or "").replace("\r\n", "\n").split("\n"):
        m = _HEADER.match(raw)
        if m:
            cur = {"op": m.group(1).lower(), "path": m.group(2), "move_to": None, "added": []}
            files.append(cur)
            continue
        if cur is None:
            continue
        m = _MOVE.match(raw)
        if m:
            cur["move_to"] = m.group(1)
            continue
        if raw.startswith("*** "):
            # End Patch / End of File / unknown marker: close the current file section.
            if raw.startswith("*** End of File"):
                continue
            cur = None
            continue
        if raw.startswith("+"):
            cur["added"].append(raw[1:])
    for f in files:
        f["added"] = "\n".join(f["added"])
    return files


def patch_targets(files, event, cwd):
    """Expand parsed patch files into (tool_name, abs_path, op, added) policy targets.

    PreToolUse evaluates what the patch will WRITE (add, update, move destination);
    PostToolUse records every path it touched, deletes and move sources included."""
    out = []
    for f in files:
        src = os.path.normpath(os.path.join(cwd, f["path"]))
        dst = os.path.normpath(os.path.join(cwd, f["move_to"])) if f["move_to"] else None
        if event == "PostToolUse":
            out.append(("Edit", src, f["op"], f["added"]))
            if dst:
                out.append(("Write", dst, "move", f["added"]))
            continue
        if f["op"] == "delete":
            continue
        tool = "Write" if f["op"] == "add" else "Edit"
        out.append((tool, dst or src, f["op"], f["added"]))
    return out


# ---------------------------------------------------------------------------------------
# policy-script execution
# ---------------------------------------------------------------------------------------
def _which(names):
    for n in names:
        p = shutil.which(n)
        if p:
            return p
    return None


def resolve_runner(hook):
    """Return argv prefix for bin/<hook> in the preferred shell, or None if unavailable.

    ORKEST_HOOK_SHELL=pwsh|bash forces one; default prefers pwsh (the settings default)
    and falls back to bash so a POSIX host without PowerShell still enforces policy."""
    prefer = (environment('HOOK_SHELL') or "").strip().lower()
    order = [prefer] if prefer in ("pwsh", "bash") else ["pwsh", "bash"]
    for shell in order:
        if shell == "pwsh":
            script = os.path.join(BIN_DIR, hook + ".ps1")
            exe = _which(["pwsh", "pwsh.exe"])
            if exe and os.path.isfile(script):
                return [exe, "-NoProfile", "-File", script]
        else:
            script = os.path.join(BIN_DIR, hook + ".sh")
            exe = environment('BASH') or _which(["bash"])
            if exe and os.path.isfile(script):
                return [exe, script]
    return None


def run_policy(argv, payload_text, env):
    try:
        r = subprocess.run(argv, input=payload_text.encode("utf-8"), stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE, cwd=REPO_ROOT, env=env)
    except OSError as e:
        return 127, "", str(e)
    return (r.returncode, r.stdout.decode("utf-8", "replace"),
            r.stderr.decode("utf-8", "replace"))


def _child_env(payload, engine, extra=None):
    env = dict(os.environ)
    env["ORKEST_ENGINE"] = engine
    sid = payload.get("session_id") if isinstance(payload, dict) else None
    if sid and not env.get("ORKEST_SESSION_ID"):
        env["ORKEST_SESSION_ID"] = str(sid)
    if extra:
        env.update(extra)
    return env


# ---------------------------------------------------------------------------------------
# output translation
# ---------------------------------------------------------------------------------------
def _split_context(stdout):
    """(context_text, hookSpecificOutput dict or None) from a policy script's stdout."""
    text = (stdout or "").strip()
    if not text:
        return "", None
    try:
        obj = json.loads(text)
    except ValueError:
        return text, None
    if isinstance(obj, dict) and isinstance(obj.get("hookSpecificOutput"), dict):
        hso = dict(obj["hookSpecificOutput"])
        return str(hso.get("additionalContext") or ""), hso
    return text, None


def emit_codex(event, results, hook):
    """Fold one or more (code, stdout, stderr) results into Codex's output contract."""
    blocks = [r for r in results if r[0] == 2]
    if blocks:
        msg = "\n".join((r[2].strip() or "blocked by %s" % hook) for r in blocks)
        sys.stderr.write(msg + "\n")
        return 2
    notes, contexts = [], []
    for code, out, err in results:
        if code not in (0, 1):
            notes.append("[orkest] hook %s failed (exit %s): %s" % (hook, code, err.strip()[:300]))
            continue
        if err.strip():
            notes.append(err.strip())
        if event in CONTEXT_EVENTS:
            ctx, _ = _split_context(out)
            if ctx:
                contexts.append(ctx)
    obj = {}
    if contexts:
        obj["hookSpecificOutput"] = {"hookEventName": event, "additionalContext": "\n".join(contexts)}
    if notes:
        obj["systemMessage"] = "\n".join(notes)
    if event in JSON_REQUIRED_EVENTS:
        obj.setdefault("continue", True)
    if obj:
        sys.stdout.write(json.dumps(obj) + "\n")
    return 0


def cmd_run(args):
    raw = sys.stdin.buffer.read().decode("utf-8", "replace")
    hook = args.hook
    if not re.match(r"^[A-Za-z0-9._-]+$", hook):
        sys.stderr.write("[orkest] invalid hook name: %r\n" % hook)
        return 0
    argv = resolve_runner(hook)
    if argv is None:
        msg = "[orkest] hook %s not runnable: no bin/%s.ps1 with pwsh or bin/%s.sh with bash" % (hook, hook, hook)
        if args.engine == "codex":
            return emit_codex("", [(127, "", msg)], hook)
        sys.stderr.write(msg + "\n")
        return 0

    try:
        payload = json.loads(raw) if raw.strip() else {}
    except ValueError:
        payload = None

    if args.engine != "codex" or not isinstance(payload, dict):
        # Claude (or an unparseable payload): the scripts already speak this contract.
        code, out, err = run_policy(argv, raw, _child_env(payload or {}, args.engine))
        if args.engine == "codex":
            return emit_codex("", [(code, out, err)], hook)
        sys.stdout.write(out)
        sys.stderr.write(err)
        return code

    event = str(payload.get("hook_event_name") or "")
    tool = str(payload.get("tool_name") or "")
    cwd = str(payload.get("cwd") or os.getcwd())
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else {}

    if tool in SHELL_TOOLS:
        payload = dict(payload, tool_name="Bash")

    if tool in PATCH_TOOLS and event in ("PreToolUse", "PostToolUse"):
        files = parse_patch(str(tool_input.get("command") or tool_input.get("input") or ""))
        targets = patch_targets(files, event, cwd)
        if not targets:
            if files:  # e.g. a delete-only patch on PreToolUse: nothing is written
                return emit_codex(event, [(0, "", "")], hook)
            return emit_codex(event, [(1, "", "[orkest] %s: apply_patch body not parseable; policy not evaluated" % hook)], hook)
        # A patch that adds a test alongside the implementation satisfies test-first:
        # hand the gate the patch's added lines as pending diff (ORKEST_TDD_PENDING_DIFF).
        pending = "\n".join("+" + ln for f in files for ln in f["added"].split("\n") if f["added"])
        tmp = None
        extra = {}
        if pending:
            fd, tmp = tempfile.mkstemp(prefix="orkest-patch-", suffix=".diff")
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(pending + "\n")
            extra["ORKEST_TDD_PENDING_DIFF"] = tmp
        try:
            results = []
            for name, path, op, added in targets:
                ti = {"file_path": path}
                if op == "add":
                    ti["content"] = added
                elif added:
                    ti["new_string"] = added
                one = dict(payload, tool_name=name, tool_input=ti, orkest_patch_op=op)
                results.append(run_policy(argv, json.dumps(one), _child_env(payload, "codex", extra)))
        finally:
            if tmp:
                try:
                    os.unlink(tmp)
                except OSError:
                    pass
        return emit_codex(event, results, hook)

    return emit_codex(event, [run_policy(argv, json.dumps(payload), _child_env(payload, "codex"))], hook)


# ---------------------------------------------------------------------------------------
# wiring model (shared by reconcile and check)
# ---------------------------------------------------------------------------------------
ENGINES = {
    "claude": {"live": ".claude/settings.json", "example": ".claude/settings.example.json"},
    "codex": {"live": ".codex/hooks.json", "example": ".codex/hooks.example.json"},
}
_ADAPTER_REF = re.compile(r"(?:orkest|ghostdev)-hooks\.(?:sh|ps1|py)[\"']?\s+run\s+--engine\s+\w+\s+([A-Za-z0-9._-]+)")
# Any script token: bin/x.ps1, "$CLAUDE_PROJECT_DIR/bin/x.ps1", D:/custom/x.ps1 -- an operator who
# points a canonical hook at a custom path still owns *that* hook (no duplicate gets added).
_SCRIPT_REF = re.compile(r"(?:^|[\s\"'/\\])([A-Za-z0-9._-]+)\.(?:ps1|sh)(?=$|[\s\"'])")
_NOT_HOOKS = {"orkest-hooks", "ghostdev-hooks", "hook-shim"}


def hook_name(command):
    """The bin/ hook a handler command runs, or None for a command Orkest does not own."""
    command = command or ""
    m = _ADAPTER_REF.search(command)
    if m:
        return m.group(1)
    names = [n for n in _SCRIPT_REF.findall(command) if n not in _NOT_HOOKS]
    return names[-1] if names else None


def legacy_forms(engine, hook):
    """Regexes for earlier canonical commands of `hook` that reconcile may refresh in place.

    Only Orkest-shipped shapes are listed: the cwd-relative template commands every
    adopter received before HOOKS-PARITY, and the hand-wired Grok shim form."""
    h = re.escape(hook)
    q = "[\"']?"
    forms = [
        r"^(pwsh|powershell)(\.exe)?\s+(-NoProfile\s+)?-File\s+%s(\./)?bin[/\\]%s\.ps1%s$" % (q, h, q),
        r"^bash\s+%s(\./)?bin/%s\.sh%s$" % (q, h, q),
        r"^(pwsh|powershell)(\.exe)?\s+(-NoProfile\s+)?-File\s+%s(\./)?bin[/\\]hook-shim\.ps1%s\s+-Hook\s+%s(\./)?bin[/\\]%s\.ps1%s$"
        % (q, q, q, h, q),
    ]
    return [re.compile(f, re.I) for f in forms]


def bash_variant(command):
    """The bash twin of a canonical pwsh Claude command (both are canonical)."""
    m = re.match(r'^pwsh -NoProfile -File "(\$CLAUDE_PROJECT_DIR/bin/[A-Za-z0-9._-]+)\.ps1"$', command or "")
    return 'bash "%s.sh"' % m.group(1) if m else None


def load_json(path):
    """(object, error) -- error is 'absent' or a parse message."""
    if not os.path.isfile(path):
        return None, "absent"
    try:
        with open(path, encoding="utf-8-sig") as fh:
            obj = json.load(fh)
    except (OSError, ValueError) as e:
        return None, "malformed: %s" % e
    if not isinstance(obj, dict):
        return None, "malformed: top level is not an object"
    return obj, None


def _groups(value):
    return [g for g in value if isinstance(g, dict)] if isinstance(value, list) else []


def _handlers(group):
    hs = group.get("hooks")
    return [h for h in hs if isinstance(h, dict)] if isinstance(hs, list) else []


def canonical_handlers(example):
    """[(event, matcher, hook, handler)] for every Orkest-owned handler in an example."""
    out = []
    for event, groups in ((example or {}).get("hooks") or {}).items():
        for g in _groups(groups):
            for h in _handlers(g):
                name = hook_name(h.get("command"))
                if name:
                    out.append((event, g.get("matcher"), name, h))
    return out


def load_disables(target):
    new = os.path.join(target, ".orkest", "hooks.json")
    path = new if os.path.isfile(new) else os.path.join(target, ".ghostdev", "hooks.json")
    obj, err = load_json(path)
    if err and err != "absent":
        raise ValueError("Invalid local hook-disable configuration")
    raw = (obj or {}).get("disabled") or []
    return {str(x).strip() for x in raw if str(x).strip()}


def is_disabled(disables, engine, hook):
    return bool({"%s:*" % engine, "%s:%s" % (engine, hook), hook} & disables)


def _match(live_h, canon_h, engine, hook):
    """'ok' | 'stale' | 'custom' for a live handler that runs the same hook."""
    lc, cc = live_h.get("command") or "", canon_h.get("command") or ""
    previous = {k: (v.replace('orkest-hooks', 'ghostdev-hooks') if isinstance(v, str) else v)
                for k, v in canon_h.items()}
    if lc != cc and all(live_h.get(k) == v for k, v in previous.items()):
        return "stale"
    accepted = {cc}
    if engine == "claude" and bash_variant(cc):
        accepted.add(bash_variant(cc))
    if lc in accepted:
        extra = {k: v for k, v in canon_h.items() if k != "command"}
        if all(live_h.get(k) == v for k, v in extra.items()):
            return "ok"
        # same command, an older canonical lacked a field (commandWindows/timeout): refresh
        if all(k not in live_h or live_h.get(k) == v for k, v in extra.items()):
            return "stale"
        return "custom"
    if any(f.match(lc.strip()) for f in legacy_forms(engine, hook)):
        return "stale"
    return "custom"


def _refreshed(live_h, canon_h, engine):
    """Canonical replacement for a stale handler, keeping the adopter's shell choice."""
    new = dict(live_h)
    new.update(canon_h)
    if engine == "claude" and re.match(r"^bash\s", (live_h.get("command") or "").strip()):
        new["command"] = bash_variant(canon_h.get("command")) or canon_h.get("command")
    return new


def plan_engine(target, template, engine, disables):
    """Classify one engine's live wiring against the template. Pure: writes nothing."""
    spec = ENGINES[engine]
    live_path = os.path.join(target, spec["live"])
    example, err = load_json(os.path.join(template, spec["example"]))
    res = {"engine": engine, "file": spec["live"], "outcome": None, "items": [], "local": []}
    if err:
        res["outcome"] = "no-example"
        return res, None
    if "%s:*" % engine in disables:
        res["outcome"] = "disabled"
        return res, None
    live, lerr = load_json(live_path)
    if lerr == "absent":
        res["outcome"] = "create"
        res["items"] = [{"event": e, "hook": n,
                         "state": "disabled" if is_disabled(disables, engine, n) else "missing",
                         "action": "keep" if is_disabled(disables, engine, n) else "add"}
                        for e, _, n, _ in canonical_handlers(example)]
        new = json.loads(json.dumps(example))
        for event, groups in new.get('hooks', {}).items():
            for group in groups:
                group['hooks'] = [h for h in group.get('hooks', [])
                                  if not is_disabled(disables, engine, hook_name(h.get('command')))]
        return res, new
    if lerr:
        res["outcome"] = "conflict"
        res["detail"] = lerr
        return res, None
    hooks = live.get("hooks")
    if hooks is None:
        hooks = {}
    if not isinstance(hooks, dict):
        res["outcome"] = "conflict"
        res["detail"] = "malformed: hooks is not an object"
        return res, None
    new = json.loads(json.dumps(live))
    new_hooks = new.setdefault("hooks", {})
    owned = set()
    for event, matcher, name, canon_h in canonical_handlers(example):
        owned.add((event, name))
        item = {"event": event, "hook": name}
        groups = hooks.get(event)
        found = []
        for gi, g in enumerate(groups if isinstance(groups, list) else []):
            hs = g.get("hooks") if isinstance(g, dict) else None
            for hi, h in enumerate(hs if isinstance(hs, list) else []):
                if isinstance(h, dict) and hook_name(h.get("command")) == name:
                    found.append((gi, hi, g, h))
        if not found:
            if is_disabled(disables, engine, name):
                item.update(state="disabled", action="keep", why="disabled in .orkest/hooks.json")
            elif isinstance(groups, list) and len(groups) == 0:
                item.update(state="disabled", action="keep", why="event wired as []")
            else:
                item.update(state="missing", action="add")
                tgt = new_hooks.get(event)
                if not isinstance(tgt, list):
                    tgt = new_hooks[event] = []
                grp = next((g for g in _groups(tgt) if g.get("matcher") == matcher and isinstance(g.get("hooks"), list)), None)
                if grp is None:
                    grp = {"matcher": matcher, "hooks": []} if matcher is not None else {"hooks": []}
                    tgt.append(grp)
                grp["hooks"].append(dict(canon_h))
            res["items"].append(item)
            continue
        gi, hi, g, h = found[0]
        state = _match(h, canon_h, engine, name)
        item.update(state=state, action="refresh" if state == "stale" else "keep")
        if state == "stale":
            new_hooks[event][gi]["hooks"][hi] = _refreshed(h, canon_h, engine)
        if g.get("matcher") != matcher:
            item["matcher"] = {"live": g.get("matcher"), "canonical": matcher}
        res["items"].append(item)
    for event, groups in hooks.items():
        for g in _groups(groups):
            for h in _handlers(g):
                name = hook_name(h.get("command"))
                if (event, name) not in owned:
                    res["local"].append({"event": event, "hook": name, "command": h.get("command")})
    changed = any(i["action"] in ("add", "refresh") for i in res["items"])
    res["outcome"] = "update" if changed else "ok"
    return res, (new if changed else None)


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".orkest-tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")
    os.replace(tmp, path)


def reconcile(target, template, engines, execute):
    disables = load_disables(target)
    results = []
    for engine in engines:
        res, new = plan_engine(target, template, engine, disables)
        live_path = os.path.join(target, ENGINES[engine]["live"])
        if new is not None and execute:
            if os.path.isfile(live_path):
                shutil.copy2(live_path, live_path + ".orkest-bak")
                res["backup"] = ENGINES[engine]["live"] + ".orkest-bak"
            write_json(live_path, new)
        res["applied"] = bool(new is not None and execute)
        results.append(res)
    return results


_VERB = {"create": ("created", "would-create"), "update": ("updated", "would-update")}


def describe(results, execute):
    lines = []
    for r in results:
        oc = r["outcome"]
        word = _VERB[oc][0 if execute else 1] if oc in _VERB else oc
        counts = {}
        for i in r["items"]:
            counts[i["state"]] = counts.get(i["state"], 0) + 1
        summary = " ".join("%s=%d" % kv for kv in sorted(counts.items()))
        lines.append("hooks[%s]: %s %s%s" % (r["engine"], word, r["file"], ("  (" + summary + ")") if summary else ""))
        if r.get("detail"):
            lines.append("  ! %s -- left untouched" % r["detail"])
        if oc == "create":
            continue
        for i in r["items"]:
            mark = {"missing": "+", "stale": "~", "custom": "=", "disabled": "-"}.get(i["state"])
            if mark:
                note = {"missing": "add", "stale": "refresh older canonical command",
                        "custom": "customized, kept", "disabled": i.get("why", "disabled, kept")}[i["state"]]
                lines.append("  %s %s %s (%s)" % (mark, i["event"], i["hook"], note))
            if i.get("matcher"):
                lines.append("  = %s %s matcher %r (canonical %r, kept)" % (
                    i["event"], i["hook"], i["matcher"]["live"], i["matcher"]["canonical"]))
        for l in r["local"]:
            lines.append("  . %s local handler kept: %s" % (l["event"], l["hook"] or l["command"]))
    return lines


def cmd_reconcile(args):
    target = os.path.abspath(args.target)
    template = os.path.abspath(args.template or REPO_ROOT)
    engines = list(ENGINES) if args.engine == "all" else [args.engine]
    if not os.path.isdir(target):
        sys.stderr.write("target not found: %s\n" % target)
        return 2
    results = reconcile(target, template, engines, args.execute)
    if args.json:
        print(json.dumps({"execute": args.execute, "results": results}, indent=2))
    else:
        for line in describe(results, args.execute):
            print(line)
    return 0


# ---------------------------------------------------------------------------------------
# check: handler-aware diagnosis of the live wiring (read-only)
# ---------------------------------------------------------------------------------------
STATUS_RANK = {"ok": 0, "off": 0, "partial": 1, "missing": 2, "drift": 2}


def _script_missing(target, live_h):
    """Bin files a live Orkest handler needs that are absent in the target."""
    name = hook_name(live_h.get("command"))
    missing = []
    if name and not any(os.path.isfile(os.path.join(target, "bin", name + ext)) for ext in (".ps1", ".sh")):
        missing.append("bin/%s.{ps1,sh}" % name)
    if _ADAPTER_REF.search(live_h.get("command") or "") and not os.path.isfile(os.path.join(target, "bin", "orkest-hooks.py")):
        missing.append("bin/orkest-hooks.py")
    return missing


def check_engine(target, template, engine, disables):
    """{engine, file, status, items, local, missing_scripts, detail?} for one engine.

    status: ok (every canonical handler wired), partial (wired except deliberate disables),
    off (engine opted out), missing (no live file), drift (missing/stale handler, absent
    script, malformed file)."""
    res, _ = plan_engine(target, template, engine, disables)
    out = {"engine": engine, "file": res["file"], "items": res["items"], "local": res["local"],
           "missing_scripts": []}
    oc = res["outcome"]
    if res.get("detail"):
        out["detail"] = res["detail"]
    if oc == "no-example":
        out["status"] = "ok"
        out["detail"] = "template ships no %s example" % engine
        return out
    if oc == "disabled":
        out["status"] = "off"
        return out
    if oc == "create":
        out["status"] = "missing"
        return out
    if oc == "conflict":
        out["status"] = "drift"
        return out
    live, _ = load_json(os.path.join(target, ENGINES[engine]["live"]))
    for groups in (live.get("hooks") or {}).values():
        for g in _groups(groups):
            for h in _handlers(g):
                for m in _script_missing(target, h):
                    if m not in out["missing_scripts"]:
                        out["missing_scripts"].append(m)
    states = {i["state"] for i in res["items"]}
    if out["missing_scripts"] or states & {"missing", "stale"}:
        out["status"] = "drift"
    elif "disabled" in states:
        out["status"] = "partial"
    else:
        out["status"] = "ok"
    return out


def global_handlers(home=None):
    """User-global hooks per engine -- informational only, never part of a verdict."""
    home = home or os.path.expanduser("~")
    out = []
    for engine, rel in (("claude", ".claude/settings.json"), ("codex", ".codex/hooks.json")):
        obj, err = load_json(os.path.join(home, rel))
        if err:
            continue
        for event, groups in (obj.get("hooks") or {}).items() if isinstance(obj.get("hooks"), dict) else []:
            for g in _groups(groups):
                for h in _handlers(g):
                    out.append({"engine": engine, "file": "~/" + rel, "event": event,
                                "command": h.get("command"), "orkest": bool(hook_name(h.get("command")))})
    return out


def cmd_check(args):
    target = os.path.abspath(args.target)
    template = os.path.abspath(args.template or REPO_ROOT)
    disables = load_disables(target)
    results = [check_engine(target, template, e, disables) for e in ENGINES]
    worst = max(STATUS_RANK[r["status"]] for r in results)
    payload = {"target": target, "engines": {r["engine"]: r for r in results}}
    if args.globals:
        payload["globals"] = global_handlers()
    if args.json:
        print(json.dumps(payload, indent=2))
        return 1 if worst >= 2 else 0
    for r in results:
        print("hooks[%s]: %s %s%s" % (r["engine"], r["status"], r["file"],
                                     ("  -- " + r["detail"]) if r.get("detail") else ""))
        for i in r["items"]:
            if r["status"] == "missing":
                break
            if i["state"] != "ok":
                print("  %s %s %s" % (i["state"], i["event"], i["hook"]))
            if i.get("matcher"):
                print("  matcher %s %s %r (canonical %r)" % (i["event"], i["hook"], i["matcher"]["live"], i["matcher"]["canonical"]))
        for m in r["missing_scripts"]:
            print("  script-missing %s" % m)
    for g in payload.get("globals", []):
        print("global[%s]: %s %s%s" % (g["engine"], g["event"], g["command"],
                                       "" if g["orkest"] else "  (not Orkest; informational)"))
    return 1 if worst >= 2 else 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="orkest-hooks", description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="adapt an engine payload and run bin/<hook>")
    r.add_argument("--engine", choices=["codex", "claude"], default="claude")
    r.add_argument("hook")
    r.set_defaults(func=cmd_run)
    c = sub.add_parser("reconcile", help="seed/refresh live project wiring (dry-run by default)")
    c.add_argument("--target", default=REPO_ROOT)
    c.add_argument("--template", help="template root holding the examples (default: this script's root)")
    c.add_argument("--engine", choices=["claude", "codex", "all"], default="all")
    c.add_argument("--execute", action="store_true")
    c.add_argument("--json", action="store_true")
    c.set_defaults(func=cmd_reconcile)
    k = sub.add_parser("check", help="diagnose live per-engine wiring (read-only; exit 1 on drift/missing)")
    k.add_argument("--target", default=REPO_ROOT)
    k.add_argument("--template", help="template root holding the examples (default: this script's root)")
    k.add_argument("--json", action="store_true")
    k.add_argument("--globals", action="store_true", help="also list user-global hooks (informational)")
    k.set_defaults(func=cmd_check)
    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
