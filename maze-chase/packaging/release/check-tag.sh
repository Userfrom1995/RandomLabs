#!/usr/bin/env bash
# Fail-closed tag/version parity for the release pipeline.
#
# Usage: check-tag.sh <tag-or-ref-name> [--allow-branch]
#
# A maze-chase release tag is `maze-chase-v<workspace version>`. Release
# candidates may append `-rc.<n>` (for example maze-chase-v0.1.0-rc.1)
# without changing the workspace version; the stable release tag must
# match the workspace version exactly. A non-tag ref (a dispatch from a
# branch) is accepted only with --allow-branch, and then it prints the
# workspace version so the pipeline still labels artifacts identically.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

ALLOW_BRANCH=0
ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --allow-branch) ALLOW_BRANCH=1; shift ;;
    -*) echo "unknown argument: $1" >&2; exit 2 ;;
    *)
      if [ -n "$ARG" ]; then
        echo "only one tag or ref may be checked" >&2
        exit 2
      fi
      ARG="$1"
      shift
      ;;
  esac
done

if [ -z "$ARG" ]; then
  echo "usage: check-tag.sh <tag-or-ref-name> [--allow-branch]" >&2
  exit 2
fi

case "$ARG" in
  maze-chase-v*)
    WANT="${ARG#maze-chase-v}"
    if [ "$WANT" = "$VERSION" ]; then
      echo "tag parity OK: $ARG matches workspace version $VERSION"
      exit 0
    fi
    case "$WANT" in
      "$VERSION"-rc.*)
        RC="${WANT#"$VERSION"-rc.}"
        case "$RC" in
          "" | *[!0-9]*)
            echo "tag/version parity failed: tag '$ARG' has a non-numeric rc suffix" >&2
            exit 1
            ;;
        esac
        echo "tag parity OK: $ARG is a release candidate for workspace version $VERSION"
        exit 0
        ;;
    esac
    echo "tag/version parity failed: tag '$ARG' wants '$WANT', workspace is '$VERSION'" >&2
    exit 1
    ;;
  *)
    if [ "$ALLOW_BRANCH" -eq 1 ]; then
      echo "no maze-chase release tag (ref '$ARG'); workspace version $VERSION"
      exit 0
    fi
    echo "ref '$ARG' is not a maze-chase release tag" >&2
    exit 1
    ;;
esac
