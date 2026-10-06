Source: https://github.com/eternityspring/shuohao-skills
Pinned revision: ef4ac0c313c7eeb1f918db5f0f0eb319745900bc


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
