"""Usage guard for safe Codex workflow boundaries; no model or account mutation."""
import json
import math
import os
from pathlib import Path
import queue
import shutil
import subprocess
import threading
import time

DEFAULTS = dict(schema=1, enabled=True, warn_used_percent=80, stop_used_percent=90,
    context_guidance_warn_percent=70, context_guidance_stop_percent=85, snapshot_ttl_seconds=300, provider_timeout_seconds=12)


def number(value):
    try:
        return type(value) in (int, float) and math.isfinite(value)
    except OverflowError:
        return False


def validate(policy):
    if policy is not None and (not isinstance(policy, dict) or set(policy) - set(DEFAULTS)):
        raise ValueError('Unknown usage policy field or invalid policy object')
    result = dict(DEFAULTS, **(policy or {}))
    if type(result['schema']) is not int or result['schema'] != 1 or type(result['enabled']) is not bool:
        raise ValueError('Invalid usage policy schema')
    for key in ('warn_used_percent', 'stop_used_percent', 'context_guidance_warn_percent', 'context_guidance_stop_percent'):
        if not number(result[key]) or not 0 <= result[key] <= 100:
            raise ValueError('Invalid usage policy threshold: ' + key)
    if (result['warn_used_percent'] >= result['stop_used_percent'] or
            result['context_guidance_warn_percent'] >= result['context_guidance_stop_percent']):
        raise ValueError('Usage warning must precede its stop threshold')
    for key, limit in [('snapshot_ttl_seconds', 600), ('provider_timeout_seconds', 30)]:
        if not number(result[key]) or not 1 <= result[key] <= limit:
            raise ValueError('Invalid usage policy bound: ' + key)
    return result


def codex_bucket(payload):
    if not isinstance(payload, dict):
        return None
    grouped = payload.get('rateLimitsByLimitId')
    if isinstance(grouped, dict):
        return grouped.get('codex')
    single = payload.get('rateLimits')
    return single if isinstance(single, dict) and single.get('limitId', 'codex') == 'codex' else None


def sanitize(payload):
    """Retain only applicable quota facts, never account/auth/credit identifiers."""
    bucket = codex_bucket(payload)
    if not isinstance(bucket, dict):
        return {}
    cleaned = dict(limitId='codex')
    for slot in ('primary', 'secondary'):
        raw = bucket.get(slot)
        cleaned[slot] = ({key: raw.get(key) for key in ('usedPercent', 'windowDurationMins', 'resetsAt')}
                         if isinstance(raw, dict) else None)
    reached = bucket.get('rateLimitReachedType')
    cleaned['rateLimitReachedType'] = reached if isinstance(reached, str) else None
    return dict(rateLimitsByLimitId=dict(codex=cleaned))


def evaluate(snapshot, policy=None, now=None, context_used_percent=None):
    policy = validate(policy)
    now = time.time() if now is None else now
    result = dict(action='continue', account_status='unknown', context_status='unknown', windows=[],
                  reason='Applicable usage metrics are unavailable; no percentage inferred')
    if not policy['enabled']:
        return dict(result, account_status='disabled', reason='Usage policy explicitly disabled')
    snapshot = snapshot if isinstance(snapshot, dict) else {}
    observed = snapshot.get('observed_at')
    fresh = number(observed) and -5 <= now - observed <= policy['snapshot_ttl_seconds']
    bucket = codex_bucket(snapshot.get('payload')) if fresh else None
    if isinstance(bucket, dict):
        for slot in ('primary', 'secondary'):
            raw = bucket.get(slot)
            if not isinstance(raw, dict):
                continue
            used, duration, reset = [raw.get(key) for key in ('usedPercent', 'windowDurationMins', 'resetsAt')]
            if (number(used) and 0 <= used <= 100 and number(duration) and duration > 0
                    and number(reset) and reset > now):
                result['windows'].append(dict(slot=slot, used_percent=used, window_minutes=duration, resets_at=reset))
        if result['windows']:
            used = max(window['used_percent'] for window in result['windows'])
            result.update(account_status='available', reason='Actual applicable quota is below the configured warning')
            if used >= policy['stop_used_percent']:
                result.update(action='stop', reason='Configured account usage reserve reached')
            elif used >= policy['warn_used_percent']:
                result.update(action='warn', reason='Configured account usage warning reached')
        if bucket.get('rateLimitReachedType'):
            result.update(action='stop', account_status='limited', reason='Codex reports an applicable account rate limit')
    if number(context_used_percent) and 0 <= context_used_percent <= 100:
        result.update(context_status='available', context_used_percent=context_used_percent)
        if context_used_percent >= policy['context_guidance_stop_percent']:
            result.update(action='stop', reason='Context checkpoint/compaction required before another slice')
        elif context_used_percent >= policy['context_guidance_warn_percent'] and result['action'] == 'continue':
            result.update(action='warn', reason='Prepare a compact durable handoff before context grows further')
    return result


def read_account_limits(timeout=12, executable=None):
    """Only initialize/initialized/read; no thread, turn, login, reset or message RPC."""
    observed = time.time()
    unknown = dict(observed_at=observed, payload={}, source='codex-app-server', status='unavailable')
    executable = executable or shutil.which('codex')
    if not executable:
        return unknown
    process = None
    try:
        process = subprocess.Popen([executable, 'app-server', '--listen', 'stdio://'], stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding='utf-8', errors='replace')
        messages = queue.Queue(maxsize=32)
        def reader():
            while True:
                line = process.stdout.readline(1024 * 1024)
                if not line:
                    return
                try:
                    value = json.loads(line)
                    messages.put_nowait(value)
                except (ValueError, queue.Full):
                    continue
        threading.Thread(target=reader, daemon=True).start()
        deadline = time.monotonic() + timeout
        def send(value):
            process.stdin.write(json.dumps(value) + '\n')
            process.stdin.flush()
        def response(identity):
            while time.monotonic() < deadline:
                value = messages.get(timeout=max(0.01, deadline - time.monotonic()))
                if isinstance(value, dict) and value.get('id') == identity:
                    if 'error' in value or not isinstance(value.get('result'), dict):
                        raise ValueError('Native rate-limit RPC unavailable')
                    return value['result']
            raise ValueError('Native rate-limit RPC timed out')
        send(dict(id=1, method='initialize', params=dict(clientInfo=dict(name='orkest-budget', title='Orkest usage guard', version='1'))))
        response(1)
        send(dict(method='initialized'))
        send(dict(id=2, method='account/rateLimits/read'))
        payload = response(2)
        return dict(observed_at=time.time(), payload=sanitize(payload), source='codex-app-server', status='observed')
    except (OSError, ValueError, queue.Empty, BrokenPipeError):
        return unknown
    finally:
        if process is not None:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=3)
            for stream in (process.stdin, process.stdout):
                if stream:
                    stream.close()


def check(repo, options, runtime, state=None, provider=None):
    repo = Path(repo).resolve()
    path = runtime.migration.checked_path(repo, 'orkest-budget.json')
    if not path.is_file():
        return dict(action='continue', account_status='not-installed', context_status='unknown')
    policy = validate(json.loads(path.read_text(encoding='utf-8-sig')))
    harness = options.get('harness') or ('codex' if os.environ.get('CODEX_SESSION_ID') else None)
    if not policy['enabled'] or harness != 'codex':
        return dict(action='continue', account_status='not-applicable', context_status='unknown')
    if options.get('dry') or options.get('command') == 'doctor':
        return dict(action='continue', account_status='preview', context_status='unknown')
    now = time.time()
    cached = (state or {}).get('budget_snapshot', {})
    cached = cached if isinstance(cached, dict) else {}
    observed = cached.get('observed_at')
    if (not number(observed) or not -5 <= now - observed <= policy['snapshot_ttl_seconds'] or
            evaluate(cached, policy, now=now)['account_status'] == 'unknown'):
        cached = (provider or read_account_limits)(timeout=policy['provider_timeout_seconds'])
        cached = cached if isinstance(cached, dict) else {}
    # Even injected transports cannot persist account/auth/credit fields.
    cached = dict(observed_at=cached.get('observed_at'), payload=sanitize(cached.get('payload')),
                  source='codex-app-server/account/rateLimits/read')
    result = evaluate(cached, policy, now=now)
    if state is not None:
        state['budget_snapshot'] = cached
    return dict(result, snapshot=cached)
