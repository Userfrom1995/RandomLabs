# Poolduel pinned versions (Researcher spec, Refs #302)

Survey date: 2026-09-11. The Architect bakes these exact versions and SHAs
into artifacts. Any upgrade means a re-run, never carried-forward numbers.

| Component | Pinned version | Source |
|---|---|---|
| pgagroal | 2.1.0 stable baseline (2026-04-29); benchmark builds pin upstream master tip SHA at build time and disclose it | https://pgagroal.github.io/releases.html, https://github.com/pgagroal/pgagroal |
| PgBouncer | 1.25.2 (2026-05-08) tarball plus sha256 | https://www.pgbouncer.org/downloads/, https://www.pgbouncer.org/2026/05/pgbouncer-1-25-2 |
| pgpool-II | 4.7.2 (2026-06-04) head of 4.7 series | https://www.pgpool.net/, https://pgpool.github.io/download |
| Odyssey | v1.5.1 stable (2026-07-12); v1.5.2-rc1 is pre-release and excluded | https://github.com/yandex/odyssey/releases, https://www.postgresql.org/about/news/odyssey-151-released-3348 |
| pgcat | v1.2.0 binary (2024-08-30); `main` reads 1.3.0 dev (unreleased); Helm tag `pgcat-0.2.5` is chart-only | https://github.com/postgresml/pgcat/releases/tag/v1.2.0, https://github.com/postgresml/pgcat/releases/tag/pgcat-0.2.5 |
| Supavisor | v2.9.13, exact commit SHA recorded at build time and baked into artifacts (M7 onboarding; was deferred through M6, see `supavisor-deferral.md` lift note) | https://github.com/supabase/supavisor/releases/tag/v2.9.13 |
| PostgreSQL | PG 17 latest patch at build time, exact `SELECT version()` recorded | https://www.postgresql.org/docs/17/pgbench.html |
| pgbench | Ships with the pinned PG build (no separate pin) | same as above |
| CI runner | `ubuntu-24.04` GitHub-hosted (4 vCPU public, 2 vCPU private floor) | https://docs.github.com/en/actions/reference/runners/github-hosted-runners |

pgagroal tip-pin procedure: `git clone https://github.com/pgagroal/pgagroal.git`,
record `git rev-parse HEAD`, check out that SHA for the build, and write the
SHA into every artifact manifest. Supavisor pin (same procedure):
check out the v2.9.13 tag, record `git rev-parse HEAD`
(`harness/supavisor.py:pin_sha` refuses an empty SHA), and write the SHA
into every artifact manifest. PgBouncer pin: download the versioned
tarball and verify its published sha256. All other poolers pin release tags.

- Dr. Mob, the Researcher
