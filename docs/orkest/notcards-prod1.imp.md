---
id: REP-13
---
# REP-13: NOTCARDS-PROD1

> Updated: 2026-11-19
> Prior-art sweep: prod1 runbook (`D:/ware/docs/reference/prod1.md`, the causa and botanic moves and their lessons), `deploy/notcards/compose.yml`, `src/notcards/store.mjs` (node:sqlite, WAL), prod1 `backup.sh`.

## AI Continuation Prompt

Notcards (`https://not.maremoto.dev`) ran on lab1's Docker Desktop as compose project `notcards-dev`. When lab1's engine died on 2026-11-19, Botanic Home failed with HTTP 530 / Cloudflare 1033. This tracker moves the service to prod1 without changing its hostname, tunnel, Botanic config or the Chrome extension.

## Open Questions

_(none: the defaults below follow the earlier prod1 moves)_

## Architecture

- **Stack on prod1:** `/srv/prod1/notcards/` holds this repo's `deploy/notcards/compose.yml` and `cloudflared.yml`, copied unchanged, plus the override `compose.prod1.yml`, kept in the ware repo at `docs/reference/prod1/notcards/`. The override resets `build:` and `ports:` (prod1 publishes no ports), sets `restart: always` on all three services, pins the image by its lab1 image-id prefix and adds backup labels. Hardening (read-only root filesystem, `cap_drop`, no-new-privileges, pids/memory limits) and the network isolation stay unchanged: the `edge` network is internal, the tunnel's egress is fenced, and the volume is still `notcards-dev-data`.
- **Image:** lab1's running `notcards-dev-app:workspace-capture-final` (`f3f8b02544f4`), sent with `docker save | ssh docker load` and retagged `notcards-app:f3f8b02544f4`. Nothing is built on prod1. The cloudflared and alpine digests are already on the box.
- **Secrets:** the app container's own env on lab1 is written straight into `/srv/prod1/notcards/runtime.env` (600), minus the variables compose sets. Values are never printed; afterwards each value is hashed inside both containers and the hashes are compared. The tunnel credential `1e391707-….json` goes to `/srv/prod1/notcards/tunnel.json` (owner `65532`, the cloudflared user, mode 400). It is the same tunnel, so Cloudflare DNS and the tunnel config stay as they are.
- **AI path (hybrid, the botanic precedent):** `NOTCARDS_GHOST_URL` was `host.docker.internal:4000` (lab1's gateway). On prod1 it points to `http://100.65.65.56:4001/v1` (lab1-bridge over the tailnet), keeping the same key, caps and spend history. When lab1 is down, summaries fail, but the board and Botanic Home keep working.
- **Data:** SQLite `notcards.sqlite` (WAL) plus `accounts/<id>/notes/*.json`. Staging copies a `VACUUM INTO` snapshot plus the account tree. Cutover stops the app first, then copies the raw volume files.
- **Backup:** `backup.sh` gains `prod1.backup=sqlite`, which runs `VACUUM INTO` inside the container through node:sqlite, checks `PRAGMA integrity_check` and streams `<container>.sqlite`. The note JSON is covered by the existing `prod1.backup.files=/data/accounts`.
- **Rollback:** lab1's volume `notcards-dev-data` and its image are kept. Stop prod1's tunnel, copy prod1's data back, then `docker compose up -d` the lab1 project.

## Current State

**Cut over 2026-11-19 09:05Z.** prod1 serves `not.maremoto.dev`; lab1's `notcards-dev` app and tunnel are stopped, and its volume and image are kept until 2026-12-03 for rollback. Details, rollback and deploy steps: `D:/ware/docs/reference/prod1.md` § notcards (ware `e54328e`).

- Staging and cutover counts were equal: integrity `ok`, every table, and 12 note files with an identical hash. The env-value hash was equal too. The image layers are identical.
- Public `/api/session` 200; `botanic-librechat` → `BOTANIC_NOTCARDS_ORIGIN/api/session` 200.
- Backup: one real `prod1-backup.service` run wrote snapshot `33297ae3`. An R2 restore into a network-less container matched live.
- Change from the plan: the app rejects any plain-http gateway except the literal `http://host.docker.internal:4000/v1` (`src/clay-notes/core.mjs:98`). So instead of overriding the URL, an nginx `gateway-relay` sidecar answers under that alias and forwards to lab1-bridge.

## Known Bugs

- Summaries depend on lab1 (hybrid gateway path). This is intended, not a regression: Home and the board do not depend on it.

## What Needs Testing

- prod1 volume: `integrity_check` returns `ok`, and every table's row count plus the note-file count equal lab1's.
- `https://not.maremoto.dev/api/session` returns 200/401 while lab1's connector is stopped.
- Signed-in Botanic Home lists the existing notes and shows no alert.
- One `prod1-backup` run produces `notcards-dev-app-1.sqlite` and the accounts tarball in a restic snapshot, and a restore of that snapshot passes the integrity check.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| REP-13.1 | [~] live except signed-in UI check | Opus | high | Stage, cut over, back up and verify Notcards on prod1 |

## Checklist

### Phase 1 — Move to prod1

> verify: live
> requires:
>   skip_budget: 0

- [x] REP-13.1.1 — Staged on prod1 (image, env, credential, data snapshot), app healthy, tunnel not started, counts equal. Evidence: counts/notesSha `116e35ee…`/envSha `c760ab84…` equal, layers equal.
- [x] REP-13.1.2 — Cutover: lab1 app+tunnel stopped (volume and image kept), final copy, prod1 tunnel up, `/api/session` 200/401. Evidence: 09:05:27Z–09:05:58Z, 4 connections, public 200.
- [x] REP-13.1.3 — SQLite backup in `backup.sh`, one run proven by a restore with an integrity check. Evidence: snapshot `33297ae3`, restore drill equal.
- [ ] REP-13.1.4 — Botanic Home lists notes; runbook stack list and rollback updated. Runbook done (ware `e54328e`), and the server-to-server path from botanic-librechat returns 200. The signed-in UI check is pending the operator's sign-in.

## Key Files Reference

| File | Role |
|---|---|
| `deploy/notcards/compose.yml` | Base stack, copied to prod1 unchanged |
| `deploy/notcards/cloudflared.yml` | Tunnel ingress, copied unchanged |
| `D:/ware/docs/reference/prod1/notcards/compose.prod1.yml` | prod1 override (new) |
| `D:/ware/docs/reference/prod1/backup.sh` | Nightly backup; gains the sqlite label |
| `D:/ware/docs/reference/prod1.md` | Runbook: stack section and rollback |
