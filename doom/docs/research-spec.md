# Doom: Client-Side Web Doom Engine at `/doom/`

## Algorithmic and Systems Research Specification

- **Issue:** #362 (Doom, client-side Web Doom engine at `/doom/`)
- **Author role:** Researcher (Dr. Mob)
- **Target platform:** Static GitHub Pages at `/doom/index.html`, zero server runtime, zero external API dependencies at runtime, same-origin assets only, offline-capable after first load
- **Core stack:** C engine compiled to single-threaded WebAssembly via Emscripten, software 8-bit renderer, WebGL texture upload, WebAudio (DMX SFX plus Wasm OPL3 FM music), OPFS persistence with IndexedDB and localStorage fallbacks
- **Handoff target:** Architect (module blueprint, build system, milestone epic roadmap in `progress/362-doom.md`), then Builder (implementation)

This document is the scientific and systems blueprint. It defines the engine choice, the WAD container and map data structures, the rendering path with verified frame budget, the audio pipeline, the persistence layer, the control model, the performance budget with statistical acceptance gates, and the baseline catalog. It contains no production code; the Architect turns this into packages and the Builder implements it.

Scope priority from #362: engine core and WAD parser first, then renderer and input, then audio and persistence, then WAD ecosystem and polish, then review, test, and evaluation hardening.

---

## 1. Binding decisions (read this section first)

These are the Pareto-optimal choices surviving the full brainstorm and verification swarm. The Architect must respect them unless new measured evidence overturns a specific line.

1. **Engine lineage: doomgeneric for the minimum viable product, Chocolate Doom for version 1.1, Woof as stretch.** Rationale: doomgeneric is a stripped linuxdoom plus a five-function shim with a proven Emscripten target and the smallest binary (300 to 600 KB); Chocolate Doom 3.1.1 adds upstream Emscripten support, SDL2 audio with OPL emulation, and demo and save compatibility at 3 to 7 days of porting effort; Woof adds modern limit-removing PWAD and MBF21 compatibility with a software-only renderer. Rejected for version 1: GZDoom (requires SharedArrayBuffer plus pthreads, impossible on plain Pages, see decision 2), Eternity (no mature Emscripten target), DOSBox and js-dos emulation (10 to 50x overhead, fragile drag-and-drop story), and pure-JS rewrites (no demo parity, dead maintenance).
2. **Single-threaded WebAssembly, no pthreads, no SharedArrayBuffer.** Verified: GitHub Pages cannot set COOP/COEP response headers, so `crossOriginIsolated` is false and Wasm threads are unavailable. The Architect must forbid `-pthread` and `-sUSE_PTHREADS`. The `coi-serviceworker` header-injection workaround is rejected as baseline (fragile scope semantics, Safari and Firefox edge cases); it may return as an optional enhancement only.
3. **Software 8-bit framebuffer in Wasm linear memory, uploaded as a paletted texture to WebGL, with a Canvas2D and pure-JS fallback ladder.** WebGL upload strictly dominates `putImageData` where available (GPU upscale free, lower composite cost). The paletted variant (64 KB per frame at 320x200 plus a 256-entry palette lookup in-shader) cuts upload bandwidth by 4x over RGBA. Fallback ladder, feature-detected in order: WebGL2 paletted plus Wasm SIMD, WebGL1 RGBA plus Wasm scalar, Canvas2D plus Wasm framebuffer, Canvas2D plus pure-JS core capped at 30 FPS, emergency 256x160 with no post effects.
4. **Music via MUS to MIDI conversion plus a Wasm OPL3 FM emulator; SFX via decoded DMX lumps in a WebAudio voice pool.** Rejected for version 1: soundfont MIDI (2 to 150 MB assets, heaviest CPU, licensing murk) and pre-rendered per-track audio (15 to 30 MB, no live MIDI control). The OPL path is tiny (100 to 300 KB Wasm plus banks already in the WAD via GENMIDI) and the most authentic to remembered AdLib playback.
5. **Persistence via a `StorageProvider` interface implemented three times: OPFS primary, IndexedDB secondary, localStorage last resort.** Savegames stay opaque bytes end to end. Export and import use a single JSON plus base64 bundle with format tag and version. WebKit headless is asserted on graceful fallback, never on OPFS success (known Playwright WebKit `getDirectory` failures).
6. **Input sampled into a 35 Hz `ticcmd_t` stream decoupled from the 60 Hz render loop**, with desktop WASD plus arrows plus Pointer Lock, a DOM-based touch overlay (joystick, fire, use, weapon strip), JSON key bindings with version field, `alwaysRun: true` default, and full keyboard-only and screen-reader paths.

---

## 2. Literature and lineage survey (what the Architect and Builder inherit)

### 2.1 doomgeneric (ozkl/doomgeneric)

A stripped linuxdoom exposing `DG_Init`, `DG_DrawFrame(DG_ScreenBuffer)`, `DG_SleepMs`, `DG_GetTicksMs`, `DG_GetKey`. The main loop is `doomgeneric_Create()` followed by `doomgeneric_Tick()` in an Emscripten main loop. Language C, GPL-2.0. Rendering is a 320x200 8-bit paletted software framebuffer; the browser mapping is one texture upload or `putImageData` per frame. Audio is absent by default with an optional SDL-backed sound path. Input is a key queue trivially bound to DOM keyboard, Pointer Lock mouse, gamepad, and touch buttons. No network play. The canonical starter: a `doomgeneric_web.c` shim plus WAD preload via fetch into MEMFS or OPFS plus drag-and-drop through the Emscripten FS API. Reference shells with minimal JS import lists exist (`jacobenget/doom.wasm`, `franckferman/doom-wasm`, `lazarv/wasm-doom`). Effort: days.

### 2.2 Chocolate Doom, Crispy Doom, Woof (vanilla lineage, all C plus SDL2, GPL)

Chocolate Doom 3.1.1 targets bug-for-bug DOS vanilla reproduction (demo, save, and network compatible, plus Heretic, Hexen, Strife) and explicitly supports Emscripten builds; Emscripten provides SDL2, SDL_mixer, and SDL_net ports at compile time. Audio uses SDL_mixer plus in-tree OPL emulation with multiple music backends. The only proven browser multiplayer pattern is Cloudflare's `cloudflare/doom-wasm` (Chocolate Doom plus a WebSocket socket shim); raw UDP netplay is impossible in browsers, so any future netplay must copy that shim. Crispy Doom adds limit-removing maps, 640x400 output, widescreen, and uncapped FPS at slightly larger binary size. Woof (active, GPL-2+) continues the MBF line with MBF21 support, uncapped widescreen hi-res software rendering, and the best modern PWAD compatibility of the three, with no public mature Emscripten fork but no blockers. Effort: Chocolate 3 to 7 days of build-system work, Woof 1 to 2 weeks.

### 2.3 PrBoom+ and DSDA-Doom

C plus SDL2, GPL, frozen ancestor plus active successor. Software renderer plus palette-based OpenGL renderer; only the software path ports cheaply (the GL path needs WebGL2 translation plus pthreads care, which decision 2 forbids). Strengths are demo and speedrun tooling (complevels, rewind, strict mode, UMAPINFO, MBF21, UDMF) far beyond shareware needs. Proof of browser feasibility: `Dwasm` (unofficial PrBoom-family port with IWAD selector, PWAD and DEH and BEX upload, touchscreen, gamepad, saves). Effort 2 to 4 weeks. Choose only if demo compatibility or MBF21 becomes an explicit requirement; overkill for version 1.

### 2.4 GZDoom and UZDoom-wasm (rejected for version 1)

C++ over one million lines with ZScript compiler, hardware OpenGL and Vulkan renderer, OpenAL plus ZMusic audio. The only browser proof (`abootnet/uzdoom-wasm`: WebGL2 plus OpenAL-to-WebAudio plus pthreads via Workers plus SharedArrayBuffer plus IndexedDB saves) requires COOP/COEP headers unavailable on Pages, ships a 10 to 20 MB Wasm payload, and is early and vanilla-only. Effort 1 to 3 months plus ongoing maintenance. Revisit only for a heavy-mod phase with its own hosting story.

### 2.5 Eternity (rejected)

C++ with EDF, ACS, partial UDMF and portals; no mature Emscripten target; would be a first port with no advantage over Woof or DSDA for the shareware goal.

### 2.6 Emulation versus native (emulation rejected)

js-dos and DOSBox-X in the browser run unmodified `DOOM.EXE` at 10 to 50x overhead with input and latency jitter and a fragile disk-image-based PWAD story. Bochs-class full-PC emulation is a non-starter for 60 FPS. Pure-JS rewrites (`doomjs` family) are incomplete with no demo parity. Emulation is the fastest demo hack and the worst engineering choice for the stated native 60 FPS goal.

### 2.7 GPL compliance on static hosting

All recommended engines are GPL (v2 family). Static Pages hosting complies by shipping `LICENSE`/`COPYING`, linking the engine source fork tag, stating modifications, keeping the shareware `DOOM1.WAD` license notice intact, and loading user IWADs and PWADs client-side only (the project distributes code, never commercial game data).

**Survey conclusion.** No novel algorithm is required; the risk is integration drift across dozens of small decisions (node formats, texture composition order, MUS controller mapping, tick timing, fallback ladders). This specification pins each decision so the Builder has exactly one correct behavior per case.

---

## 3. WAD container and map data structures

All integers are little-endian. All on-disk structures are packed and unaligned. The WAD parser must be a single checked `DataView` reader over an `ArrayBuffer` with explicit little-endian reads that throw a truncation error instead of returning undefined, with allocation caps derived from header counts before allocating, and with all names treated as bytes (ASCII decode for display only).

### 3.1 Header (12 bytes)

| Offset | Size | Type | Field |
|---|---|---|---|
| 0 | 4 | char[4] | Magic: `IWAD` (complete game) or `PWAD` (patch) |
| 4 | 4 | i32 | `numlumps` |
| 8 | 4 | i32 | `infotableofs` (directory offset) |

Parser rules: magic must be exactly those four ASCII bytes; `numlumps >= 0`; `infotableofs >= 12`; `infotableofs + numlumps * 16 <= filesize`. `IWAD` versus `PWAD` is a load-order flag, not a format difference: the engine loads the IWAD first, then applies PWADs by lump-name override (last wins, except map lumps which are replaced as a group).

### 3.2 Directory (`numlumps` records of 16 bytes)

| Offset | Size | Type | Field |
|---|---|---|---|
| 0 | 4 | i32 | `filepos` (lump data offset) |
| 4 | 4 | i32 | `size` (bytes) |
| 8 | 8 | char[8] | `name`, uppercase, null-padded, no extension |

Notes: names use `A-Z 0-9 _ - [ ]`; shorter names are zero-padded and are not guaranteed NUL-terminated at exactly 8 characters, so compare as fixed 8-byte case-insensitive values. `size == 0` is legal (marker lumps such as `F_START`, `S_START`, map markers, and empty `REJECT` in some ports); marker `filepos` values must never be dereferenced. Duplicate names are normal (sprite frames, flats); assume uniqueness only for `PLAYPAL`, `COLORMAP`, `PNAMES`, `TEXTURE1/2`, `ENDOOM`, `GENMIDI`.

### 3.3 Map discovery and naming

A Doom-format map is a sequence of lumps, not a single lump:

```text
MAPxx or ExMy (marker, size 0)
THINGS, LINEDEFS, SIDEDEFS, VERTEXES,
SEGS, SSECTORS, NODES, SECTORS, REJECT, BLOCKMAP
[BEHAVIOR] (Hexen and ZDoom ACS maps only, after BLOCKMAP)
```

Doom 1 uses `E1M1`..`E1M9` (plus `E2`, `E3` registered and `E4` in Ultimate Doom); Doom 2, Final Doom, Plutonia, and TNT use `MAP01`..`MAP32` (`MAP31`, `MAP32` secret); Heretic uses `E1M1`..`E5M9`; Hexen uses `MAP01`..`MAP40` plus `BEHAVIOR`; Strife uses `MAP01`..`MAP34`. Detection scans the directory for `^E[1-5]M[1-9]$` or `^MAP\d\d$` and validates the following 10 (or 11) lumps in fixed order; adjacency alone in malformed files must not be trusted. PWADs may ship partial maps (marker plus changed lumps only). Minimum viable map data for the renderer: `THINGS, LINEDEFS, SIDEDEFS, VERTEXES, SECTORS`; `SEGS`, `SSECTORS`, and `NODES` can be rebuilt with an internal node builder, and `REJECT` and `BLOCKMAP` can be synthesized (zero REJECT, empty BLOCKMAP) at the cost of monster line-of-sight speed and collision broadphase speed.

### 3.4 Authored geometry lumps (node builder inputs)

VERTEXES records are 4 bytes: i16 `x`, i16 `y`, range -32768..32767 map units (player height about 56, typical wall 128).

THINGS in Doom and Heretic format are 10 bytes: i16 `x`, `y`; i16 `angle` in degrees (0 east, 90 north); u16 DoomEd `type` (1 is player 1 start); u16 `flags` (`0x0001` skill 1-2, `0x0002` skill 3, `0x0004` skill 4-5, `0x0008` ambush or deaf, plus Boom `0x0020` not-deathmatch, `0x0040` not-coop, MBF `0x0080` friendly). Unknown flag bits must be ignored, never rejected. Hexen THINGS are 20 bytes (TID, x, y, z-height, angle, type, flags, special byte, five argument bytes); if `BEHAVIOR` exists, expect the Hexen variant (Section 3.8).

LINEDEFS in Doom format are 14 bytes: u16 start and end vertex; u16 `flags` (`0x0001` impassable, `0x0002` block monsters, `0x0004` two-sided, `0x0008` upper-unpegged, `0x0010` lower-unpegged, `0x0020` secret, `0x0040` block sound, `0x0080` no-automap, `0x0100` always-automap); u16 `special` (0 none); u16 `tag`; u16 front sidedef (`0xFFFF` none, invalid on front); u16 back sidedef (`0xFFFF` none). Front is the right side of the start-to-end direction.

SIDEDEFS are 30 bytes: i16 x and y offset; three 8-byte texture names (upper, lower, middle; a lone `-` means blank; middle required on one-sided lines); u16 sector index. Offsets add to renderer UVs before pegging logic.

SECTORS are 26 bytes: i16 floor and ceiling height; 8-byte floor and ceiling flat names; i16 light level 0..255; u16 `special` (0 none, 9 secret, plus damage and animation codes); u16 `tag` for linedef actions. A 24-unit floor step is climbable and 25 is not (engine constant, useful for validation warnings, not parse errors).

### 3.5 Built BSP lumps (node builder outputs; the parser must read them and the engine may rebuild them)

SEGS are 12 bytes: start and end vertex (vanilla signed short, limit-removing ports unsigned; read u16 and range-check against actual lump counts), i16 angle in binary angle measurement (0 east, 16384 north), u16 linedef index, u16 direction (0 front, 1 back), u16 offset along linedef.

SSECTORS (subsectors) are 4 bytes: u16 seg count, u16 first seg index. Subsectors are convex polygon fans referenced by the BSP tree with segs ordered by subsector.

Vanilla NODES are 28 bytes: i16 partition x, y, dx, dy; two 4xi16 bounding boxes (right then left, each top, bottom, left, right); u16 right child then u16 left child. Child encoding: bit 15 set means subsector (`index & 0x7FFF`), clear means node index. The root is the last entry. Bounding boxes serve frustum culling and are recomputable.

Extended node formats, read support in implementation order: (1) vanilla; (2) ZDBSP family, which covers essentially all large modern maps: uncompressed magic `XNOD` (normal) and `XGLN`, `XGL2`, `XGL3` (GL-friendly convex closed subsectors), compressed variants `ZNOD`, `ZGLN`, `ZGL2`, `ZGL3` as zlib streams of the `X` payload (inflate with a size cap via Wasm zlib, `pako`, or `CompressionStream('deflate')`); 32-bit fixed vertices (i32 x, y), u32 children with bit 31 as subsector flag; `XNOD`/`ZNOD` live entirely in `NODES`, `XGLN+` variants live in `SSECTORS` for UDMF-era maps; detection is first-four-bytes magic, else parse as vanilla; (3) DeePBSP extended V4 (rare, low priority); (4) glBSP `GL_*` lumps (`GL_VERT, GL_SEGS, GL_SSECT, GL_NODES`, optional `GL_PVS`, versions V1..V5) found in old PWADs with classic lumps left intact: prefer `GL_*` for hardware-style rendering when present, keep the classic tree for demo-compatible logic.

### 3.6 REJECT and BLOCKMAP semantics

REJECT must be `(numsectors * numsectors + 7) / 8` bytes (a 0-length lump in ZDoom-family files means no reject, treat as all-zero). Bit `i * numsectors + j` (LSB-first per byte): 1 means sector i cannot see sector j. It is a sight-culling hint for monster AI (`P_CheckSight`), never a visibility guarantee: all-zero is correct but slow; all-`0xFF` is a classic corrupt-WAD symptom (blind monsters) and must warn.

BLOCKMAP layout: i16 `xorg, yorg, ncols, nrows` (8-byte header); `ncols * nrows` offsets; then packed blocklists each shaped `u16 0, i16 linedef..., i16 -1`. Cells are 128x128 map units from the origin. Vanilla offsets are 16-bit word indices (the famous above-64K overflow bug); extended builders emit 32-bit offsets. Parser heuristic: if `8 + 2 * nblocks > size`, retry as 4-byte offsets; validate every offset lands inside the lump and every list terminates with `-1` before end of lump. Offset 0 conventionally means empty block (some builders omit the leading zero word; accept both). The engine may ignore or rebuild BLOCKMAP for collision broadphase, but vanilla demo playback needs the original for full fidelity.

### 3.7 Graphics and texture composition

PLAYPAL is exactly 10752 bytes: 14 palettes of 256 RGB triples (index 0 normal play; 1-8 red pain and bonus ramps; 10-12 gold item pickup; 13 green radiation suit). COLORMAP is exactly 8704 bytes: 34 tables of 256 bytes (0-31 diminishing brightness ramps with 0 brightest, 32 full-dark, 33 invulnerability grayscale); each byte maps a PLAYPAL index to a dimmer PLAYPAL index for a light level and distance. No RGB data lives in COLORMAP.

PNAMES: u32 patch count, then that many 8-byte patch lump names. TEXTURE1 and optional TEXTURE2: u32 texture count, that many i32 offsets, then per texture: 8-byte name, u16 masked flag (obsolete), u16 width, u16 height, u32 column directory (obsolete, ignore), u16 patch count, then that many 10-byte patch records (i16 originx and originy, u16 patch index into PNAMES, u16 stepdir always 1 ignored, u16 colormap always 0 ignored). Composition algorithm (software `R_GenerateTexture`): allocate a blank `width x height` transparent buffer; decode each patch picture in order and blit at `(originx, originy)` with transparency skip; later patches overwrite earlier ones. `TEXTURE2` entries override same-named `TEXTURE1` entries. The renderer builds a per-column directory on load. Validation: every patch index below patch count; referenced patch lump exists and decodes as a picture; width and height positive; offsets array strictly inside the lump.

Flats are raw 4096-byte 64x64 8-bit images between `F_START`/`F_END` (PWAD alternates `FF_START`/`FF_END`); the name comes from sector floor and ceiling fields; size must be exactly 4096.

Sprites and pictures: u16 width and height, i16 left and top offset, then `width` u32 column offsets, then per column a run of posts (`u8 topdelta, length, pad, <length bytes>, pad`) terminated by `0xFF`. Sprite lumps sit between `S_START`/`S_END` (`SS_START`/`SS_END` alternates) with names of shape name plus frame letter plus rotation digit (for example `TROOA1`, mirror pairs such as `TROOA2A8`). Sounds (`DS*`) are DMX 8-bit raw with an 8-byte header (Section 5.1); music (`D_*`) is MUS (Section 5.2); `ENDOOM` is a 4000-byte CP437 text screen; `GENMIDI` and `DMXGUS` are instrument maps. The parser may skip data payloads but must bounds-check them.

### 3.8 Hexen extensions: BEHAVIOR

Presence of `BEHAVIOR` after `BLOCKMAP` means a Hexen-format map (also used by ZDoom for Doom maps with ACS scripts): compiled ACS bytecode (header `ACS` plus object directory, strings, code). For the Doom-only web port the binding behavior is: detect and report "Hexen dialect: 20-byte THINGS, 16-byte LINEDEFS (special byte plus five arguments), no tag-based specials"; either refuse gracefully with that message or route to a Hexen-aware path. Hexen LINEDEFS are 16 bytes: u16 v0, v1; u16 flags; u8 special; five u8 arguments; u16 front, back.

### 3.9 Demos and DeHackEd

`DEMO1/2/3` start with a version byte that must match the game version (109 is 1.9), then skill, episode, map, deathmatch, respawn, player-class fields, then a per-tic `ticcmd_t` stream to end of lump. The parser exposes version, header, and tic count but does not simulate; version mismatch means do not play. DeHackEd arrives as external `.deh` text patches or an embedded `DEHACKED` lump: applied after WAD load before texture and sprite initialization; the parser surfaces the lump bytes plus a flag without interpreting them, and must never mistake `DEHACKED` for a map lump.

### 3.10 Shareware DOOM1.WAD specifics

Contains Episode 1 only (`E1M1`..`E1M9`, Knee-Deep in the Dead); typical v1.9 shareware size about 4.2 MB versus about 11.2 MB registered and 12.4 MB Ultimate. Missing versus registered: episodes 2-3 maps and their flats, textures, patches, sprites, sounds, and music, plus `TEXTURE2` (shareware ships `TEXTURE1` only; absent `TEXTURE2` in shareware must not be treated as corruption). Identification checklist: magic `IWAD`; much lower lump count (about 1200-1400 versus 2194 registered and 2306 Ultimate); has `E1M1`, lacks `E2M1`; `TEXTURE2` absent; differing `ENDOOM`, `CREDIT`, `HELP` screens. The episode picker UI must clamp to Episode 1 when only Episode 1 markers exist.

### 3.11 Validation rules and error taxonomy for corrupt-WAD detection

Layered, recoverable checks. Fail the file only on layers 1-2; everything else degrades to warning plus fallback asset. Suggested error object: `{ code, lump, map, offset, expected, actual, severity, fallback }` with `severity` in `fatal`, `error`, `warning`, plus a per-map report so one bad PWAD map never kills the whole WAD load.

1. Container, fatal, `E_CONTAINER`: bad magic; `numlumps` or `infotableofs` out of range; truncated directory; overlapping lump ranges (`filepos + size > filesize`, negative values); `filepos < 12` inside the header.
2. Map structure, fatal per map, `E_MAP`: unknown marker; expected lump missing out of order; record size mismatch (`lumplen % recordsize != 0` for THINGS 10/20, LINEDEFS 14/16, SIDEDEFS 30, VERTEXES 4, SEGS 12, SSECTORS 4, NODES 28, SECTORS 26); zero vertices, sectors, linedefs, or sidedefs.
3. Cross-reference, error, `E_REF` (droppable map with message): vertex, sidedef, sector, linedef, seg, subsector, or node index out of range; front sidedef `0xFFFF`; two-sided line missing its back; sidedef pointing at no sector (error) versus unreferenced sector (warning); child node pointing forward past the root or into itself; seg count not covering subsectors.
4. Semantic, warning, `W_GEOM`: zero-length linedef; degenerate subsector; non-convex classic subsector (fine for software, rebuild for any GL path); unclosed sector; floor above ceiling; missing texture on one-sided middle; `REJECT` wrong size; `BLOCKMAP` offsets out of range or unterminated lists (rebuild); unknown linedef special or tag with no matching sector (keep; tags resolve at runtime).
5. Media, warning, `W_MEDIA`: `PLAYPAL` not 10752 bytes; `COLORMAP` not 8704; `PNAMES` count mismatch; texture patch index out of bounds or patch lump missing or undecodable; flat not 4096 bytes; picture column offsets out of bounds or missing `0xFF` terminator (guard with a bounded reader, cap posts per column).

Reader hardening for JS and Wasm: never trust `columndirectory` or marker `filepos`; zlib-inflate `Z*` nodes with a size cap.

---

## 4. Rendering path

### 4.1 Architecture

Primary path (Tier 0): C engine core compiled with Emscripten to single-threaded Wasm; software 8-bit column and visplane rasterizer in Wasm linear memory; framebuffer exposed once via exported pointer plus width and height; JS creates a `Uint8Array` view over `memory.buffer` (rebound on `memory.grow`) and uploads with `texSubImage2D` directly from the view with zero copies; a fullscreen quad with `NEAREST` filtering performs palette lookup, colormap and light, and post (damage flash, gamma, aspect correction) in a single shader pass. The paletted upload is 64 KB per frame at 320x200 with the palette texture updated only on change; the RGBA variant (256 KB per frame) is retained for the WebGL1 tier.

Rejected alternative: a full 3D-geometry renderer in the GZDoom style (5 to 10x engineering cost, loss of the software look unless carefully matched, mobile tiled-GPU variance, level-geometry extraction plus texture-atlas management) for no gain toward the 60 FPS classic goal.

### 4.2 Frame-time budget at 60 FPS (16.667 ms), verified

Mid-tier mobile reference (Snapdragon 7 class, Cortex-A78 cores, Mali-G57/G68 or Adreno 610+), 320x200, Wasm plus WebGL:

| Stage | Budget | Verification note |
|---|---|---|
| Game tick, amortized per render frame (35/60 ticks) | 0.3 ms | Implies about 0.5 ms per tick; real frames cost 0 ticks (about 42 percent) or 1 tick (about 58 percent); hitches cost N ticks under the cap of Section 4.4 |
| Rasterizer in Wasm | 3.0 ms | Conservative: about 1.3M typical ops per frame (10-30 integer ops plus table lookup per output pixel, 64k pixels), 2-4M worst scene with overdraw; empty corridors measure near 1 ms, dense outdoor scenes spike to 4-5 ms at p95, so the budget must be validated per scene at p95/p99, not mean only |
| Texture upload | 2.5 ms | Conservative upper bound for 256 KB RGBA (15.36 MB/s at 60 FPS); typical measured 0.5-1.5 ms provided `UNPACK_ALIGNMENT=1`, NPOT clamp with no mipmaps, 2-3 ping-pong textures plus fence to avoid use-after-upload stalls, and no per-frame readback; paletted path (64 KB, 3.84 MB/s) measures about 0.3-0.8 ms |
| Shader quad plus composite | 1.0 ms | Single fullscreen pass plus about 0.3-0.8 ms shader cost |
| Input, audio, overlay | 0.8 ms | DOM overlay costs about 0.2-0.5 ms plus composite only on touch events |
| Total | about 7.6 ms | Headroom about 9.1 ms |
| Pure-JS plus Canvas2D mobile (fallback only) | 14+ ms | About 9 ms raster plus 5 ms `putImageData`; no headroom, jitter expected; capped at 30 FPS |

Interpolation: Doom logic is discrete at 35 Hz. For 60 Hz rendering, interpolate the player camera (position and angle) and sprite positions between ticks with alpha from the accumulator; never interpolate simulation state. The 35 Hz simulation on a 60 Hz display judders slightly without interpolation; either choice costs nothing extra.

### 4.3 Resolution strategy

Native render at 320x200 (or 320x240 for aspect-correct variants), upscaled by the GPU with `NEAREST` and `image-rendering: pixelated` semantics, aspect-corrected to 16:9 with pillarbox (stretch optional). Dynamic-resolution ladder with hysteresis, switching at most every 500 ms or on scene change to avoid oscillation: 640x400, 480x300, 320x200, 256x160 (mobile emergency). Never rescale the Canvas2D backing store per frame; scale the WebGL viewport and framebuffer target instead. Battery saver option: 30 FPS render, 320x200 locked, no post effects, mutable touch haptics off. Mobile GL context flags: `antialias: false`, `alpha: false`, `powerPreference: 'low-power'`, `desynchronized: true` for the 2D fallback where supported.

### 4.4 Main-loop timing

`requestAnimationFrame` driver plus a fixed-timestep accumulator for 35 Hz ticks (`step = 1/35 = 28.571 ms`): `acc += dt` clamped to 100 ms; while `acc >= step` and steps taken below the cap, tick and subtract; render every frame with `alpha = acc / step`. Cap choice: maximum 3 (covers hitches to 85.7 ms before slow motion) or 4 (114.3 ms); 2 is minimum viable; uncapped is forbidden (spiral of death). Pause on `visibilitychange` and reset the timestamp on resume. Clock source is `performance.now()`, never `Date`. The audio clock stays separate; ticks are never tied to audio callbacks.

### 4.5 Zero-copy memory contract

Allocate the framebuffer once in Wasm linear memory (`W * H` bytes paletted or `W * H * 4` RGBA). Expose pointer, width, and height to JS; JS views the buffer without slicing or copying. Rebind the view on `memory.grow`. Bypass any Emscripten SDL surface copy: render directly into the exported buffer. Paletted mode uploads the index texture (`R8`/`LUMINANCE`) plus a 256-entry palette uniform or texture updated only on palette change.

### 4.6 Fallback ladder (feature-detected in order, choice cached with manual override)

1. WebGL2 paletted plus Wasm with SIMD128 (desktop default).
2. WebGL1 RGBA plus Wasm scalar (older mobile, no SIMD128).
3. Canvas2D `putImageData` plus Wasm framebuffer (no WebGL or blocked GPU).
4. Canvas2D plus pure-JS core at 320x200 capped at 30 FPS (Wasm compile fails or content policy blocks `WebAssembly`).
5. Emergency: 256x160 plus 30 FPS plus no post plus static touch layout.

SIMD128 probe: Wasm SIMD is finalized with about 95.7 percent global availability (Chrome 91+, Firefox 89+, Safari and iOS 16.4+), but there is no in-Wasm standardized fallback; probe from JS (`WebAssembly.validate` on a SIMD test module) and load the SIMD or scalar binary accordingly. Never ship SIMD-only without a fallback or an explicit error message.

---

## 5. Audio pipeline

Module boundaries (build order: `wadAudio` plus `mus2mid` first as pure headless-testable logic, then `mixer` plus `audioUnlock`, then `sfxEngine`, last `musicEngine` for the Wasm integration):

```text
doom/audio/
  wadAudio.js    : DMX lump parser (header validate format == 3, strip pad bytes, u8 to f32); pure, no WebAudio import
  mus2mid.js     : MUS to SMF Type 0 converter (port of the Crispy single-track mus2mid.c); pure, golden-tested
  sfxCache.js    : lump name to AudioBuffer map, lazy decode, per-map prefetch, LRU cap
  sfxEngine.js   : 8-voice pool, distance and stereo and pitch model, steal policy, per-frame listener update
  musicEngine.js : OPL3 Wasm wrapper (worklet init, GENMIDI and WOPL bank load, MID playback, loop, volume), song switch on map change
  mixer.js       : master, SFX, and music gain nodes plus compressor plus mute and persistence
  audioUnlock.js : first-gesture AudioContext create and resume, autoplay-policy probe, overlay hook
```

### 5.1 SFX: DMX lump format and mixing

`DS*` lumps are DMX digital sound: u16 `format` (must equal 3), u16 sample rate in Hz, u32 `length` (bytes after the header including both 16-byte pads), 16 bytes leading pad, PCM samples, 16 bytes trailing pad. The playable span is offset 24 with count `length - 32` (vanilla skips 16 bytes and subtracts 32). Dominant rate 11025 Hz with four Doom 2 lumps at 22050 Hz; vanilla caps at 65535 samples. WebAudio conversion strips pads and maps unsigned bytes 0..255 to float -1..1 via `(b - 128) / 128`; context resampling to the device rate is automatic. PC-speaker lumps (`format` 0, square-wave period codes) are out of scope for version 1; no IWAD `DS*` needs that path.

Vanilla mixing model (`s_sound.c`): 8 polyphonic channels with overflow stealing by priority (keep 8 for authenticity). Per-play parameters: volume 0..127, stereo separation 0..255 (128 center), pitch 0..255 (128 normal). Distance attenuation: full volume inside close distance (200 map units vanilla, 160 in the Linux release), linear falloff to zero at clipping distance (1200 units), culled beyond; stereo separation follows `128 - swing * sin(relativeAngle)` with swing 96; MAP08 uses a special never-silent curve with floor 15. Pitch jitter: saw sounds `+8 - (rand & 15)`, all others except item pickup and tink `+16 - (rand & 31)`, clamped 0..255; replicate with the deterministic engine PRNG for testability.

WebAudio graph: per voice `AudioBufferSourceNode` (one-shot, cached buffer) into per-voice `GainNode` (volume is SFX volume times distance attenuation times master SFX) into `StereoPannerNode` (pan `(sep - 128) / 128`; modern `StereoPannerNode`, not deprecated `PannerNode`) into an SFX bus gain into the master gain into a `DynamicsCompressor` into destination. Cache is about 100 lumps averaging 10-30 KB (1-3 MB decoded; float32 expansion still trivial). Pitch maps to `source.playbackRate = pitch / 128`, preserving the authentic resample-ratio character. Steal policy ports `S_GetChannel`: kill same-origin sounds first, else steal lowest-priority or oldest. Per-frame update recomputes live gains and pans with `setTargetAtTime` and stops culled voices.

### 5.2 Music: MUS conversion plus OPL3 FM synthesis

MUS is a compact single-track MIDI variant for DMX: header `MUS\x1A`, score length, score start, channel counts, instrument count and list, then an event stream. Event descriptor byte: bit 7 marks last-in-timeslice; bits 4-6 give the type (0 release, 1 play, 2 bend, 3 system, 4 controller, 6 score-end); bits 0-3 give channels 0-15. Only 9 usable channels (0-14 melodic plus 15 drums mapped to MIDI channel 9); 64 KB file cap; delta timing at 140 Hz base; velocity byte optional per note with per-channel last-velocity memory. Known converter pitfall: MUS volume range exceeds MIDI 127, and naive clamping glitches tracks; the reference converter is the Crispy single-track `mus2mid.c` (port verbatim to dependency-free JS, golden-test against Chocolate Doom outputs; the heavier multi-track `mmus2mid.c` is not needed).

Synthesis decision: Wasm OPL3 FM (recommended libraries: `libadlmidi-js` with Nuked OPL3, Nuked-Fast, or DOSBox cores, or `@malvineous/opl`) fed by the IWAD `GENMIDI` patches (optionally an improved `DMXOPL` bank), rendered in an `AudioWorkletNode` into the music bus. Historical note the Builder must respect: chips ran at nonstandard 49716 Hz with mono OPL2 default and explicit OPL3 stereo mode; Chocolate Doom standardizes on Nuked OPL3. Doom tracks loop indefinitely; set the loop flag and replay on song end. Fallback if Wasm is blocked by content policy: pure-JS OPL core (TypeScript DBOPL port family) at higher per-sample CPU cost. Soundfont MIDI is rejected for version 1 on asset size (2-150 MB), CPU weight, and licensing murk.

### 5.3 Autoplay gating and mixer

Chrome 66+ (elements) and 71+ (WebAudio), Firefox `media.autoplay.block-webaudio`, and Safari sticky activation all start pre-gesture `AudioContext` objects as `suspended`; the context must be created lazily on first gesture (preferred) or resumed inside a gesture with a `statechange` listener. No SFX or MIDI path may schedule before state `running`; use `navigator.getAutoplayPolicy('audiocontext')` where available to select the "click to enable audio" overlay. Headless tests use `--autoplay-policy=no-user-gesture-required` and assert graph state plus scheduled events (suspended without gesture, running after synthetic gesture), never audible output.

Mixer topology: master gain (persisted 0..1) feeding SFX bus gain (menu 0..15 mapped linearly) and music bus gain (menu 0..15), with a compressor guarding 8-voice stacks against clipping. Mute is separate boolean flags that ramp stored gains to zero click-free via `setTargetAtTime` without destroying the graph; master mute additionally suspends worklet rendering to save CPU. Persist `doom.audio.{master,sfx,music,muted}` and apply before first resume to avoid bursts.

---

## 6. Persistence layer

### 6.1 StorageProvider interface and fallback ladder

One interface, three implementations, feature-detected in order (never UA-sniffed): `readFile(path)` to bytes, atomic `writeFile(path, data)`, `remove`, `list`, plus `readJSON` and `writeJSON`:

1. OPFS primary: `navigator.storage.getDirectory()` needs no permission prompt; main thread uses async `getFile` plus `createWritable` with mandatory `close()` to commit; dedicated workers may use sync access handles (`createSyncAccessHandle` with `read`, `write`, `truncate`, `flush`, `close`, `getSize`) with exclusive per-file locks that must be closed promptly or other tabs block. Baseline availability since about March 2023 (Chrome and Edge 86+, Firefox 111+, Safari 15.2+); sync handles require a worker.
2. IndexedDB secondary: one database `doom-store`, object store `files` keyed by path holding `{data, mtime}` plus a `kv` store for config, bindings, and progression; binary-safe natively; single-transaction `put` for atomicity; a tiny wrapper avoids raw IDB verbosity.
3. localStorage last resort: strings only, about 5 MB; persists config plus bindings plus progression only; saves omitted with a warning or single-slot base64.

Atomicity on OPFS emulates rename (write `path.tmp`, flush and close, copy to `path`, delete `tmp`) since cross-browser rename is unreliable. Debounce writes (about 500 ms) and flush on `visibilitychange` and `pagehide`, not only `beforeunload`. Guard single-writer access with an in-memory mutex plus `InvalidStateError` retry with a "save pending" notice when another tab holds the lock.

### 6.2 What is persisted

```text
doom/
  saves/slot0.dsg ... slot5.dsg   # opaque Doom save-format bytes, never parsed
  saves/slot0.json                # { name, episode, map, skill, timestamp }
  meta/progression.json           # { episode, map, skill, unlocked, kills, time }
  config.json                     # { sensitivity, volume, alwaysRun, invertY, ... }
  bindings.json                   # Section 7.4 schema, versioned
```

Savegames stay opaque `Uint8Array` end to end (Wasm heap to storage) to avoid format coupling. Config, bindings, and progression are small JSON synced on every change. WAD data lives in Cache Storage, never in OPFS save space. Quota is a non-issue for saves (tens to hundreds of KB times 6-8 slots) but the UI must still surface `QuotaExceededError` via `navigator.storage.estimate()`; request persistent storage with `navigator.storage.persist()` on first gesture; private and incognito contexts often present OPFS as unavailable or non-persistent and must fall through the ladder silently.

### 6.3 Export and import bundle

Single JSON plus base64 file, no dependencies, works offline:

```json
{
  "format": "doom-save-bundle",
  "version": 1,
  "exportedAt": "2026-09-17T00:00:00Z",
  "config": {},
  "bindings": {},
  "progression": {},
  "saves": [{ "slot": 0, "name": "E1M3", "dataBase64": "..." }]
}
```

Export builds the object from the provider into a `Blob` download; validate size before encoding (base64 adds 33 percent). Import uses a file input accepting JSON, checks `format` plus `version`, decodes each slot to bytes, writes atomically through the provider, and re-renders slots; oversized or corrupt bundles are rejected with an explicit error and never half-applied. ZIP packaging is deferred unless bundles exceed about 5 MB.

### 6.4 Persistence test matrix (binding for the Tester)

Capability probe first (`'storage' in navigator && 'getDirectory' in navigator.storage`); golden round-trip (write known bytes, read back, byte-compare, delete, list); persistence across `page.reload()` in a persistent context; fault injection (mock `getDirectory` throw asserts the IndexedDB path; quota error asserts toast without crash); export then import into a fresh context with byte comparison; unit-mocked `FileSystem*Handle` for logic without a browser. Gate OPFS-success assertions to Chromium plus Firefox only; on WebKit (Playwright fork) assert graceful fallback, never OPFS success, per known `getDirectory` `UnknownError`, nested-worker `InvalidStateError`, and service-worker `NotSupportedError` defects.

---

## 7. Controls and input

### 7.1 Desktop: keyboard plus Pointer Lock mouse

Support arrows (vanilla) and WASD (modern) simultaneously. Use `e.code` (layout-independent), ignore `e.repeat` for discrete actions, and `preventDefault` game keys (arrows, space) to avoid scrolling. Pointer Lock flow, always from a user gesture (canvas click or Click-to-Play): `canvas.requestPointerLock({ unadjustedMovement: true })` with promise catch falling back to bare `requestPointerLock()` for Safari and older Firefox (no options object, no promise; about 78 percent global support for raw input). Accumulate `movementX` per frame into `angleturn` scaled by sensitivity; offer sensitivity slider plus invert toggle. ESC exits the lock by browser design and cannot be suppressed: handle `pointerlockchange` with auto-pause plus a click-to-recapture overlay, `pointerlockerror` with a drag-to-turn fallback, and clean `document.exitPointerLock()` on menu open. Mouse mapping: left fire, right use (or strafe), middle strafe toggle, wheel weapon cycle; optional classic Novert ignores vertical movement.

### 7.2 Game-tick input model (35 Hz `ticcmd_t`)

Port of `d_ticcmd.h` and `G_BuildTiccmd`:

```c
typedef struct { char forwardmove; char sidemove; short angleturn;
                 short consistancy; byte chatchar; byte buttons; } ticcmd_t;
```

Speed tables: forward `{0x19, 0x32}` (25 walk, 50 run), side `{0x18, 0x28}` (24, 40); turn table `{640, 1280, 320}`; clamp forward and side to +/-50; buttons `BT_ATTACK = 1<<0`, `BT_USE = 1<<1` plus weapon-change encoding (the web port may use a separate `weaponSelect` field instead of vanilla bit-packing). Per-tic JS mapping: forward and side from key states times speed plus joystick vector clamped to range; `angleturn` from held turn keys times turn speed plus accumulated mouse delta times sensitivity; buttons from fire and use states; pending weapon select. Speed selects run (50/40) versus walk (25/24) from the run key XOR the `alwaysRun` config; default `alwaysRun: true` (modern expectation; vanilla default is walk with Shift for run). Accumulate mouse deltas, joystick vectors, and held-key state between tics and consume once per tic for determinism and demo compatibility. Sample on the fixed-step accumulator of Section 4.4, decoupled from `requestAnimationFrame`.

### 7.3 Mobile touch overlay

Pointer Events with `touch-action: none`, per-`pointerId` multi-touch tracking, `preventDefault` against scroll and double-tap zoom, minimum 44x44 px targets, rendered as DOM (absolute-positioned buttons plus CSS transforms, never per-frame canvas redraw; cost about 0.2-0.5 ms). Clusters: left virtual joystick with dynamic origin (100-120 px diameter; Y is forward and back, X is strafe; D-pad fallback acceptable but joystick preferred); right large FIRE (bottom-right) with USE above plus strafe modifier or dedicated strafe buttons; top or edge collapsible weapon strip 1-7 plus Menu, Pause, Automap, and Run toggle; look and turn via horizontal swipe on the right half of the canvas scaled by sensitivity (gyroscope off by default). Show the overlay only on coarse pointers (`matchMedia("(pointer: coarse)")` or first `touchstart`); never on desktop. Haptics via throttled `navigator.vibrate(10)` on fire; avoid `box-shadow` and `blur` on buttons during gameplay (forces mobile GPU layer repaint).

Responsive contract at 390 px width: portrait letterboxes the canvas on top (about 16:9) with controls in a bottom sheet (joystick left, FIRE and USE right, horizontally scrollable weapon strip above, Menu, Map, Run row) never covering canvas center; landscape runs full-bleed canvas with translucent (alpha about 0.5) overlaid clusters left and right and a top-center weapon strip auto-collapsing after 3 seconds. Honor `viewport-fit=cover` plus `env(safe-area-inset-*)`.

### 7.4 Remapping UI and persisted schema

Settings table of action, primary, secondary, and rebind control: clicking rebind captures the next `keydown` `e.code` (ESC cancels), detects conflicts with swap offer, and provides reset-to-defaults; the entire flow is keyboard-only operable without Pointer Lock. Stored as versioned `bindings.json` (JSON-capable on all three providers):

```json
{
  "format": "doom-bindings", "version": 1,
  "actions": {
    "forward":    { "keys": ["KeyW","ArrowUp"],    "mouse": null, "touch": "joyY-" },
    "back":       { "keys": ["KeyS","ArrowDown"],  "mouse": null, "touch": "joyY+" },
    "strafeLeft": { "keys": ["KeyA"],              "mouse": null, "touch": "joyX-" },
    "strafeRight":{ "keys": ["KeyD"],              "mouse": null, "touch": "joyX+" },
    "turnLeft":   { "keys": ["ArrowLeft"],         "mouse": "moveX-", "touch": "swipeX-" },
    "turnRight":  { "keys": ["ArrowRight"],        "mouse": "moveX+", "touch": "swipeX+" },
    "fire":       { "keys": ["ControlLeft"],       "mouse": 0, "touch": "btnFire" },
    "use":        { "keys": ["Space"],             "mouse": 2, "touch": "btnUse" },
    "strafe":     { "keys": ["AltLeft"],           "mouse": 1, "touch": "btnStrafe" },
    "run":        { "keys": ["ShiftLeft","ShiftRight"], "mouse": null, "touch": "tglRun" },
    "weapon1_7":  { "keys": ["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7"], "mouse": "wheel", "touch": "stripWeapons" },
    "menu":       { "keys": ["Escape"],            "mouse": null, "touch": "btnMenu" }
  }
}
```

### 7.5 Accessibility (binding)

Text contrast 4.5:1 and large-text and UI-icon contrast 3:1, with solid backdrops behind translucent overlay buttons; full keyboard-only path (menu navigation by Tab, arrows, Enter; visible focus ring; ESC closes dialogs; settings reachable without Pointer Lock); focus trap in modal and pause states with focus returned to the invoker on close; `aria-label` on every touch button and an `aria-live="polite"` status line ("Saved slot 2", "Pointer unlocked, paused"); `prefers-reduced-motion` disables view bob, screen shake, and hit-flash scaling with a larger-joystick-deadzone option; sensitivity sliders are native range inputs with keyboard support. On-screen hints document the current bindings with accessible contrast in both orientations.

---

## 8. Performance budget, baselines, and statistical gates

### 8.1 Frame and startup budgets

Frame budget is Section 4.2 (about 7.6 ms of 16.667 ms at 320x200 on mid-tier mobile, about 9.1 ms headroom, p95 and p99 per scene, never mean only). Time-to-first-frame bands for a 4.5-4.8 MB cold payload (300-600 KB Wasm plus about 4.18 MB shareware WAD): broadband 50-100 Mbps about 0.8-2.0 s; solid 4G 10-20 Mbps about 2.5-5 s; weak 4G 5 Mbps about 5-9 s; warm repeat visit with Cache Storage plus compiled-code cache about 0.5-1.0 s. Transfer math anchor: 4.8 MB moves in about 7.7 s at 5 Mbps, 3.8 s at 10 Mbps, 1.9 s at 20 Mbps, 0.77 s at 50 Mbps, 0.38 s at 100 Mbps ideal, plus 1-3x handshake overhead in practice and 50-150 ms Wasm streaming compile plus 100-300 ms WAD parse and first frame. Report TTFF always banded with explicit cold versus warm and WAD-variant conditions, never as a point value.

### 8.2 Baseline catalog (completeness is mandatory; no competitor unmeasured)

| Baseline | What it proves | Metric |
|---|---|---|
| doomgeneric Emscripten demo (`ozkl.github.io/doomgeneric`) | Native Wasm 60 FPS attainability at 320x200 | Frame time p95, binary size |
| Chocolate Doom Emscripten build | SDL2 audio plus OPL path cost on the web | Tick plus audio CPU, music fidelity (blind A/B vs OPL reference) |
| `franckferman/doom-wasm`, `jacobenget/doom.wasm`, `lazarv/wasm-doom` shells | Minimal-import shell size floor | JS glue KB, time-to-interactive |
| `Dwasm` (PrBoom family) | Upload, touchscreen, gamepad, and saves feature checklist | Feature parity matrix |
| Pure-JS fallback core | Worst-case fallback floor | FPS at 320x200 capped-30 viability |
| Canvas2D `putImageData` blit | Upload-path comparison | Frame time vs WebGL texture path |
| Pre-rendered-audio prototype (optional) | Rejected music alternative costed, not assumed | MB per track, CPU delta |

Fair-comparison constraints: matched device and browser, matched map and demo loop (fixed `-timedemo` or scripted tic stream), matched resolution, resource parity (same WAD bytes), identical warm versus cold cache state.

### 8.3 Pre-registered hypotheses and statistical gates

H1: the Tier 0 path sustains 60 FPS (p95 frame time below 16.667 ms) at 320x200 on the mid-tier mobile reference across Episode 1 maps. H2: the paletted upload path beats RGBA upload on mobile frame time with paired bootstrap significance. H3: Wasm rasterizer beats the pure-JS fallback by at least 2x median on identical scenes. H4: cold TTFF on broadband falls inside Section 8.1 bands. H5: audio unlock transitions suspended to running on first gesture with zero scheduled events before unlock.

Every quantitative claim requires N >= 30 independent runs (fresh page load or fixed demo loop), mean plus median plus p95/p99, paired bootstrap 95 percent confidence intervals (about 10k resamples) on comparisons, and coefficient of variation below 5 percent for any headline number (else increase N and investigate bimodality from GC, compile, or thermal effects). Frame-time and FPS intervals are computed on frame times then converted, never averaged as FPS. Mobile claims additionally require a thermal-soak run plus dropped-frame count.

### 8.4 Deterministic empirical states

Every experimental cell resolves to exactly one machine-checked state: `MEASURED` (full numeric data with bootstrap 95 percent intervals), `SATURATION_COLLAPSE` (crash or timeout under stress, with exit codes, dumps, or OOM traces; a finding, not missing data), `UNSUPPORTED_BY_DESIGN` (deliberately unimplemented upstream, with reject codes, documentation citations, and a signed declaration), or `INVALID_SPECIFICATION` (degenerate parameter combination with formal justification). Lazy nulls and unmeasured gaps are rejected. Bounded effort: at most 3 attempts per cell (standard, isolated debug, scientific triage with formal classification), matrix executions bounded, quality optimization capped with plateau termination.

---

## 9. WAD ecosystem and asset ingestion

Ship shareware DOOM1.WAD preloaded and cached client-side (same-origin, Cache Storage precache, legal shareware with license notice intact) for instant out-of-the-box play. Drag-and-drop plus file picker accepts user IWADs and PWADs (DOOM 2, Final Doom, community levels): validate the WAD header (IWAD or PWAD magic, lump directory bounds) and each touched map per Section 3.11, report corrupt WADs with the graceful layered errors (fatal container errors reject the file; per-map errors drop the map with a message; warnings attach fallback assets), and never let one bad PWAD map kill the loaded WAD. PWAD load order is last-wins by lump name with map-lump group replacement; embedded `DEHACKED` lumps surface as bytes plus flag. Onboarding ships a sample WAD flow plus empty, loading, and error states with accessible contrast and keyboard paths. Service worker at `/doom/sw.js` with scope `/doom/` (HTTPS on Pages is a secure context), versioned cache plus offline-first fetch handler; WAD bytes (about 4.2 MB shareware) sit far below quota.

---

## 10. Risks and open questions for the Architect

1. Emscripten SDL2 versus custom shim: Chocolate Doom wants the SDL2 port (compile-time, `--disable-pthreads` build per decision 2); doomgeneric wants a hand-written five-function shim with smaller glue. The Architect must pick per phase and keep all artifacts same-origin with correct relative paths.
2. Wasm binary split for SIMD versus scalar (Section 4.6) doubles the tested artifact count; the Architect must define the probe, the loader, and the cached choice with manual override.
3. Node-builder inclusion: rebuilding `NODES` for partial PWAD maps inside the client avoids hard failures on node-less uploads; cost is a compact builder or a ZDBSP subset, to be sized by the Architect.
4. Hexen-dialect maps (`BEHAVIOR` present) are detect-and-report in version 1; any playable Hexen path is a later milestone with its own research note.
5. Multiplayer is out of version 1 scope; if ever revived, the only sanctioned pattern is the Cloudflare WebSocket socket shim, never raw UDP.
6. `progress/362-doom.md` milestone epic roadmap (M1 engine core and WAD parser, M2 renderer and input, M3 audio and persistence, M4 WAD ecosystem and polish, M5 review, test, and evaluation hardening) is the Architect's deliverable, not this document's.

---

## 11. Handoff

This specification satisfies the research acceptance criterion of #362 (engine choice, WAD format, rendering path with Wasm versus JS fallback, audio pipeline with OPL3 versus soundfont analysis, persistence layer with OPFS and IndexedDB analysis, control mapping, performance budget with 60 FPS and time-to-first-frame analysis). The Architect now drafts the module blueprint and the `progress/362-doom.md` milestone epic, then the Builder implements M1 first (WAD parser, lump directory, map loading, basic Canvas and WebGL render loop at 60 FPS, shareware DOOM1.WAD preload and cache) under the headless visual-loop mandate with Playwright screenshots.

Reference shell starting points for the Architect: doomgeneric Emscripten target plus minimal-import JS shells for the MVP; Chocolate Doom 3.1.1 Emscripten plus SDL2 ports for version 1.1; `Dwasm` feature checklist for ecosystem parity; `libadlmidi-js` plus Crispy `mus2mid.c` for audio; `StorageProvider` ladder of Section 6 for persistence.

- Dr. Mob, the Researcher
