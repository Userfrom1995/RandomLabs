# Desktop Pet deb smoke SIGPIPE repair

What it is: a one-check fix to the Linux release smoke script plus
regression tests, unblocking the `pet-release` maiden run on Ubuntu.

Why: the maiden re-run 37078577617 built the `.deb` fine on Ubuntu
but the smoke step reported `deb payload misses usr/bin/desktop-pet`
with `tar: stdout: write error`. The check piped a streaming 27MB
tarball listing into `grep -q` under `set -o pipefail`: `grep -q`
exits on the first match, tar then dies with SIGPIPE writing the
rest of the listing, and pipefail converts that into a pipeline
failure. A false negative on a payload that was present, proven by
the tar write error in the log (grep had already matched and left).

How it works:
- `pet/packaging/smoke-linux.sh` now captures the listing first
  (`DEB_LIST="$(dpkg-deb --fsys-tarfile "$DEB" | tar -t)"`) and
  matches with pure bash (`[[ "$DEB_LIST" == *"usr/bin/desktop-pet"* ]]`).
  No pipe into grep means no early close, so tar always runs to
  completion. The substring also covers tar's `./` prefix either way.
- `pet/tests/test_tester_release_track.py` (`TestSmokeScripts`) gains
  `test_deb_payload_check_is_sigpipe_safe` (bans `tar -t | grep`,
  pins the captured `DEB_LIST` plus `[[ ]]` match) and
  `test_captured_listing_match_passes_live` (builds a 3000-file tar,
  proves the fixed check shape passes live and still misses honestly).

Key files: `pet/packaging/smoke-linux.sh`,
`pet/tests/test_tester_release_track.py`,
`progress/515-desktop-pet-deb-smoke.md`.

Notes: the remaining `producer | grep -q` lines in the smoke scripts
operate on tiny single-write outputs (control info, service status)
or end-of-stream matches (SELFTEST PASS), so they cannot hit this
hazard; only the multi-megabyte streaming listing could. Verified
with a synthetic repro: old shape fails 5/5 under pipefail on a
present match, new shape passes 3/3. Refs #515.
