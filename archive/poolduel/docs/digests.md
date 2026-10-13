# Poolduel action / container digests (M12, plan section 11)

> Refs #302. Read-only record: Builder never edits workflows (Lab scope).
> Refresh procedure: `python3 -m poolduel.harness.manifest` re-records the
> workflow SHAs + `uses:` pins into `results/manifest.json` (`workflow_pins`).
> If this doc disagrees with `manifest.json`, `manifest.json` wins and this
> doc must be re-synced in the next milestone PR.

## Runner images (as of manifest build)

- `poolduel-m1.yml` sweep jobs: `ubuntu-24.04` (PG 17 via PGDG, pinned pooler builds).
- `poolduel-m9.yml` sweep jobs: `ubuntu-24.04` (plus Elixir/OTP via `erlef/setup-beam@v1` for Supavisor).
- `pages.yml` deploy jobs: `ubuntu-latest` (static deploy only, never measures).

## Action pins (as of manifest build)

- `actions/checkout@v4` + `actions/checkout@v6` (both present across workflows).
- `actions/setup-python@v5`.
- `actions/upload-artifact@v4`, `actions/download-artifact@v4`.
- `erlef/setup-beam@v1` (M9 Supavisor toolchain only, warn-only so a new-contender flake records honest per-arm errors instead of killing chunks).
- `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`.

## Policy (binding per plan section 11)

- No floating `latest` for measurement images: sweeps run on `ubuntu-24.04`.
- No moving-tip comparisons without a recorded SHA and re-run rule: every pooler version + SHA is recorded per chunk in `results/m1|m2|m9/pooler-versions-*.txt` and surfaced in `results/report.json` (`pooler_versions`).
- The `ubuntu-latest` deploy image never touches numbers (Pages deploy only).
- Workflow file SHAs are recorded in `results/manifest.json`; a workflow change without a re-run note is a provenance gap, not a silent update.
