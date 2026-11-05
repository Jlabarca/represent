# AGENTS.md

Primary project instructions are in [CLAUDE.md](CLAUDE.md). Read that file,
[docs/CONTEXT.md](docs/CONTEXT.md) and [docs/DOCS-PROTOCOL.md](docs/DOCS-PROTOCOL.md)
before edits. Keep this entry thin; do not duplicate decisions here.

Use the single `/orkest [description]` skill (alias `/ork`); `doctor` is its subcommand. Locate
the canonical/project skill roots through harness-registry.json. Read the live
`docs/orkest/*.imp.md` tracker (older `*-ORK.md` stay readable) before feature
work; done/planned/parked trackers never auto-resume. Existing legacy documents stay readable during a deferred upgrade.

Update CONTEXT first, append four-section LOGBOOK history, commit the Plan before
multi-file changes and use exact-path evidence checkpoints. Preserve local changes
and native disables/trust. Codex receives every-file apply_patch normalization;
tool/delegation/native-hook capabilities are conditional, never assumed portable.
