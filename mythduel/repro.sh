#!/usr/bin/env bash
# Mythduel one-command reproduction (Phase 1: story and design foundation).
#
# Runs the binding audit, the smoke suite, and a byte-exact captions rebuild
# check. Exit non-zero on any failure.
# Usage: bash mythduel/repro.sh (from the repo root)
set -euo pipefail
cd "$(dirname "$0")/.."
node mythduel/tools/audit.mjs
node mythduel/tests/smoke.mjs
node mythduel/tools/capture.mjs > /dev/null
node mythduel/tools/render.mjs > /dev/null
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { buildTimeline } from './mythduel/engine/timeline.js';
import { buildVtt } from './mythduel/tools/render-captions.mjs';
const duel = JSON.parse(readFileSync('mythduel/story/duel.json', 'utf8'));
const { vtt, cues } = buildVtt(buildTimeline(duel));
const committed = readFileSync('mythduel/captions.vtt', 'utf8');
if (vtt !== committed) { console.error('captions.vtt differs from rebuild'); process.exit(1); }
console.log('captions rebuild matches (' + cues.length + ' cues)');
"
echo "REPRO GREEN"
