# Progress - Desktop Pet Platform (multi-character catalog, tray service, installers)

- **Issue:** #504
- **Branch:** opencode/issue504-20261001212124
- **Status:** in-progress
- **Blueprint:** `ideas/2026-10-01-desktop-pet-platform.md`
- **Extends:** shipped #498 core (`pet/pet_core`, `pet_app`, Pages hub at `pet/`); no rewrite, Pix-to-platform migration v1 to v2

## Phase Roadmap

- **Active Phase:** Phase 1: Catalog Core and Character Engine (Complete, ready for review)
- **Phase 1: Catalog Core and Character Engine:** [x] trait tables plus six-original catalog registry merged over third-party packs, [x] state schema v2 with character_id plus v1 migration, [x] brain parameterised by traits with seeded determinism intact, [x] per-character voice packs with shared fallback, [x] characters CLI list/show/switch with persisted selection, [x] headless suite for catalog/traits/voices/migration (PR 1 target, Refs #504)
- **Phase 2: Procedural Cast and Animation System:** [ ] body-plan-dispatched parametric sprite engine for all six characters, [ ] palettes plus accessory geometry per character, [ ] live hot-swap re-render with DPI-aware scaling, [ ] Pages canvas mirror extended value-for-value, [ ] sprite headless tests plus pose parity fixtures (PR 2 target, Refs #504)
- **Phase 3: Living Behaviors and Conversation Heart:** [ ] offline converse intent parser with per-character voices, [ ] time-based event bus (greetings, idle antics, milestones), [ ] per-character interaction modifiers over stroke/feed/ball/sleep, [ ] talk/converse CLI plus bubble wiring, [ ] headless intent plus event tests (PR 3 target, Refs #504)
- **Phase 4: Always-On Shell - Tray and Background Service:** [ ] tray abstraction with ordered backends plus stdlib mini-controller fallback, [ ] PID-locked background service with start/stop/status/logs, [ ] window hardening (multi-monitor clamp, show/hide/switch routing), [ ] service-aware autostart via shipped shells, [ ] headless service plus tray-fake tests (PR 4 target, Refs #504)
- **Phase 5: Creator Packs, Settings Picker, and Native Installers:** [ ] JSON schema plus stdlib loader/validator with pack CLI, [ ] first-party example pack proving third-party path, [ ] settings picker dialog with live preview, [ ] Inno Setup plus macOS pkg/dmg plus Linux deb/AppImage recipes with fail-closed install/uninstall scripts, [ ] checksums plus bundle selftest in every recipe (PR 5 target, Refs #504)
- **Final Phase: Hub Expansion, Native Matrix, and End-to-End Audit:** [ ] catalog gallery plus service plus installer plus creator-pack docs beside /pet/, [ ] download matrix with verification commands, [ ] full static plus headless gates green, [ ] per-OS native passes on Windows, macOS, Linux (window, tray, service, autostart, install/uninstall), [ ] unified docs and README refresh (Final PR, Closes #504 only after test on all three OS families plus eval gate pass)

- **Current step:** Phase 1 complete, ready for review (Refs #504)
- **Next steps:** Reviewer/Testers verify Phase 1; then Builder continues with Phase 2 (Procedural Cast and Animation System) on a new phase branch

## Agent Log

- **2026-10-01, Architect:** Platform blueprint plus Phase Epic written (catalog core, parametric cast, conversation heart, tray/service shell, creator packs plus native installers, hub expansion). Six capability-named phases; Refs #504 until the final verified phase lands. Extends shipped #498 with no rewrite. Handing to the Builder for Phase 1.
- **2026-10-01, Builder:** Phase 1 built on the open PR branch: traits.py plus catalog.py (six originals, hex palettes, distinct body plans), schema v2 with v1 migration notice, trait-parameterised needs/brain (Pip matches base constants exactly), per-character voices with Pip fallback and per-character no-repeat bags, characters list/show/switch CLI with atomic persistence, 26-test headless suite. Full suite 275 green. Refs #504.
