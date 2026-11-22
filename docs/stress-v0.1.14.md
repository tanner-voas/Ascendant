# v0.1.14 — Movement, engagement and battle UI stress audit

## Purpose

Confirm that the v0.1.13 movement and engagement rules run correctly under repeated and adversarial conditions, and provide an ongoing **headless** testing API that behaves like the production event-driven engine, without rendering or pacing.

## Reproducible commands

```sh
npm run test:headless
npm run stress:movement
npm run stress:movement:deep
node scripts/stress-movement-engagement.mjs --cases 100 --seed 73
node scripts/stress-movement-engagement.mjs --cases 50 --seed 1109 --mixed
node scripts/stress-movement-engagement.mjs --cases 200 --seed 20261122 --mixed
# Isolate one absolute (zero-based) case index, preserving all seeds/builds:
node scripts/stress-movement-engagement.mjs --cases 1 --start 147 --seed 20261122 --mixed
```

The stress command uses `src/headless.js`, which calls the existing `aiTurn`, `stepTimeline`, `move`, `engageTarget` and related engine functions. It does **not** duplicate movement, combat, defense, condition, resource, or AI calculations. Every authoritative scheduler transition is checked for finite positions/timestamps/resources, resources within their capacities, legal geometry for living characters, stationary overlaps, and valid engagement references. The failure message includes case number and map/battle seeds.

## Completed stress passes

| Configuration | Battles | Scheduler transitions | Draws | Invalid states |
| --- | ---: | ---: | ---: | ---: |
| Twenty arenas, baseline teams; `--seed 73` | 100 | 196,294 | 0 | 0 |
| Randomized asymmetric attribute builds; `--seed 1109 --mixed` | 50 | 107,437 | 0 | 0 |
| Asymmetric builds; `--seed 20261122 --mixed` | 200 | 456,364 | 1 | 0 |
| **Total** | **350** | **760,095** | **1** | **0** |

The single draw was **case 148** (`--start 147`, battle seed `20263915`, map 7, map seed `3675261349`), reaching the existing 1,500-decision cap. A diagnostic replay showed the final two surviving AI-controlled characters repeatedly choosing Guard despite neither side being eliminated. This is a **tactical-AI stalemate**, not an invariant violation or an infinite scheduler loop. Changing fallback AI priorities is deferred to a separate tuning release, rather than silently changing combat tactics in this stress-test patch.

Additional test coverage: direct one-way engagement and breakage; movement into reach and early stopping; auto-engagement on contact; dynamic target rerouting; loss of personal perception; paid engagement following; insufficient resources; snapshot/replay of an in-flight tracking movement; experimental 1v1, 3v3 and 8v8 battle sizes; and deterministic equivalence with the original simulation laboratory.

## Fixes made

- Remove stale engagement links promptly after a knockout, whether the defeated unit was the engaged target or the engagement owner; normalize such stale links in legacy saves.
- Use the same automatic contact-engagement rule for global Auto-play as for individual AI-controlled allies.
- Restore experimental-sized saved fights with their real attribute budgets and rule coefficients instead of rejecting anything but 5v5/200 points. Do not weaken validation for ordinary battles.
- Keep ally-row pagination based on all displayed slots, including defeated characters.
- Preserve larger-team scenario settings on restart, and make individual AI checkboxes accept A6 through A10.

## UI validation and limitations

The dedicated UI tests render the **actual** `src/app.js` HTML and execute its delegated click/change handlers in a synthetic DOM: two team rows, pagination, directional engagement controls, disabled/re-enabled melee buttons, character targeting, saved state, and experimental rematches. Earlier `ui-smoke` and `battle-presentation` tests also exercise battlefield pin taps, movement-mode changes, and privacy-preserving enemy presentation.

A real browser layout and touch-gesture pass was **not completed** in this execution environment: the installed Chromium is subject to a managed URL block policy, which also blocks local and data URLs. A Safari test on the target iPhone remains necessary, especially for long-press, panning/zooming, narrow-screen rows, and continuous playback visuals. The tests above validate the programmatic UI behavior, not iOS rendering correctness.
