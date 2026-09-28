# IP declaration (binding through every gate)

Mythduel is an original work. Thor and Zeus are interpreted solely from
public-domain Norse and Greek myth sources. This project contains:

- No Marvel Thor likeness, costume, dialogue, or story element.
- No God of War / Sony Santa Monica Thor or Zeus likeness, design, audio, or
  script element.
- No game, film, comic, or recorded-music assets of any kind.
- Only in-repo authored sources: JSON story data, hand-written SVG designs,
  procedural canvas paint code, and synthesized WebAudio score/SFX.

Enforcement: `tools/audit.mjs` runs a forbidden-token scan over every committed
source file plus an asset-provenance check (no image/audio binaries without a
committed generator). Any PR introducing third-party likeness or assets fails
review by rule.
