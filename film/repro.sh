#!/usr/bin/env bash
# Hearthlight one-command reproduction (premiere cut).
#
# Runs the binding audit, the smoke suite, the premiere gates, and a
# byte-exact captions rebuild check. Exit non-zero on any failure.
# Usage: bash film/repro.sh (from the repo root)
set -euo pipefail
cd "$(dirname "$0")/.."
node film/tools/audit.mjs
node film/tests/smoke.mjs
node film/tests/premiere.mjs
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { buildTimeline } from './film/engine/timeline.js';
import { buildVtt } from './film/tools/render-captions.mjs';
const sp = JSON.parse(readFileSync('film/story/screenplay.json', 'utf8'));
const { vtt, cues } = buildVtt(buildTimeline(sp));
const committed = readFileSync('film/captions.vtt', 'utf8');
if (vtt !== committed) { console.error('captions.vtt differs from rebuild'); process.exit(1); }
console.log('captions rebuild matches (' + cues.length + ' cues)');
"
echo "REPRO GREEN"
