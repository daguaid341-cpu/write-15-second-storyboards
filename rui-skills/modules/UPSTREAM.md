# Vendored shuohao-skills modules

Source: https://github.com/eternityspring/shuohao-skills

Pinned revision: `ef4ac0c313c7eeb1f918db5f0f0eb319745900bc`.

Imported on 2026-10-05 for Rui-Skills. The five `novel-*` directories contain
the upstream workflow instructions, references, runtime scripts, examples,
and deterministic self-tests. `report.mjs` and `report-selftest.mjs` come from
the upstream `scripts/` directory. The sibling `LICENSE` and `NOTICE` retain
the original Apache-2.0 license and attribution without modification.

Local changes:

- Rename the five upstream `SKILL.md` files to `WORKFLOW.md` so Rui-Skills is
  the discoverable entry point; add host-routing and duration guidance.
- Omit standalone module README files and screenshot assets. Keep fixture
  README files because they document independently packaged test data.
- Resolve report module paths from this directory and hide child process
  windows on Windows. Retain upstream `fileURLToPath`, platform path helpers,
  and slash-normalized HTML asset paths.
- Correct the storyboard workflow's obsolete `maxShotSeconds` reference
  to `maxSegmentSeconds`, and test a configured 30-second segment cap.
- Route shared workflow instructions through separate host live-action and
  comic modes; neither the source anime preset nor photographic defaults
  override the chosen mode. The mode adapter is in the host scripts.

Rui-Skills uses a 30-second delivery group. A delivery group may contain
multiple generation segments when the chosen video model has a shorter
per-generation limit. The upstream fixtures intentionally keep their
15-second generation segments and original story duration; they are
regression fixtures, not the host's delivery defaults. For a video model
that supports a 30-second generation, set
`storyboard.json.params.maxSegmentSeconds` to `30`. This parameter alone does
not establish a provider's capabilities.

From the Rui-Skills directory, run `node modules/<module>/scripts/selftest.mjs`
for each of `novel-outline`, `novel-characters`, `novel-art`, `novel-script`,
and `novel-storyboard`, then `node modules/report-selftest.mjs`.
These tests use only Node.js standard libraries and local fixtures; no model,
API credentials, package installation, or network access is required.

Only the source modules and tests are vendored. Generated HTML reports and
gate logs belong in the current project's output directory.

## Character asset integration (2026-10-06)

The `character-refs` module is also vendored at the same pinned revision.
Local changes: renamed workflow entrypoint; optional light-gray gate support
and provenance/visualReview fields in core.mjs; native-assets.mjs and
native-selftest.mjs register real host-tool PNG outputs with prepared-reference
snapshots, versioning, stale detection, and explicit visual reviews.
models.mjs searches PATH without requiring a Unix shell on Windows.
Custom model adapters accept an argv array without shell interpolation; the
mock adapter tests use this portable form and file URLs on Windows. Codex
generation uses the workspace-write sandbox rather than bypassing it.
The independent character skill contains the same runtime files so it can be
installed alone. No real image provider was exercised for this integration.
