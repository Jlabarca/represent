# Grafe extractor trials

Research date: 2026-10-21. Commands ran from `D:/ware/represent` in PowerShell 7. No plane-sync files were intentionally changed; the one temporary file created by SCIP inference was moved here after the run. Final `git -C D:/ware/plane-sync status --short` was empty.

## Pinned source and tool revisions

- dependency-cruiser checkout: MIT, commit `60f8a7ef72cbd69a01f62c61c8efcedd8a67d83c`, moved to ignored `D:/ware/represent/references/grafe-dependency-cruiser`.
- SCIP TypeScript checkout: Apache-2.0, commit `e8c40f0dda526a6d008b1ef20ad13b1f38a20798`, moved to ignored `D:/ware/represent/references/grafe-scip-typescript`.
- Executed npm package versions were pinned separately: `dependency-cruiser@18.7.0` and `@sourcegraph/scip-typescript@0.4.0`. The SCIP checkout HEAD package version was newer (0.5.0); no source checkout code was run.
- plane-sync input: local `D:/ware/plane-sync`, commit `a1a91c4fa80888c2be0a7898dfb91bf7e42c5cd3`; origin remote is `https://github.com/waremoto/plane-sync.git`, but remote file fetch was unavailable during this session. No plane-sync license declaration/file was found.

## Fixture

`fixture/src/index.ts` imports `loadUser` from `fixture/src/user.ts`; both files and `fixture/tsconfig.json` are synthetic research inputs. The sibling `.js` files provide a JS version for dependency-cruiser without TypeScript parser dependencies.

The fixture commands were: `npm exec --yes --package dependency-cruiser -- depcruise --no-config --output-type json --output-to D:/ware/represent/experiments/grafe-research/dependency-cruiser-trial.json D:/ware/represent/experiments/grafe-research/fixture/src` (the JSON output was from the JS fixture files and contained 2 modules + 1 resolved import), and `npm exec --yes --package @sourcegraph/scip-typescript -- scip-typescript index --cwd D:/ware/represent/experiments/grafe-research/fixture --output ../scip-typescript-trial.scip --no-progress-bar` (completed in 22 ms).

## Plane-sync commands and outputs

Dependency command: `npm exec --yes --package dependency-cruiser@18.7.0 -- depcruise --no-config --output-type json --output-to D:/ware/represent/experiments/grafe-research/plane-sync-dependency-cruiser.json D:/ware/plane-sync/src`. It exited 0, reporting one source plus four builtin modules and four resolved imports.

SCIP command: `npm exec --yes --package @sourcegraph/scip-typescript@0.4.0 -- scip-typescript index --cwd D:/ware/plane-sync --infer-tsconfig --output D:/ware/represent/experiments/grafe-research/plane-sync-scip-typescript.scip --no-progress-bar`. It completed in 599 ms and wrote a 353,427-byte binary index. Inference created `plane-sync-generated-tsconfig.json`; this file is preserved here to document the side effect and keep the target clean. The index was not decoded or audited, so no claim is made about which files/symbols it contains or the accuracy of its references.

Saved JSON / SCIP outputs are small enough to retain for later inspection. Neither repository's scripts, tests, nor install hooks were run.
