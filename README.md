# Ascendant — Tactical Battleground (v0.1.1)

Initial, classless 5v5 prototype for a future LitRPG cultivation role-playing game, loosely inspired by Pathfinder. No classes, magic, feats, gear, levels, or unique abilities yet. This is a standalone app and a lazy-loaded AppLauncher module; no external dependencies or backend.

## Run

```sh
python3 package.py
npm test
python3 -m http.server 8765 --directory dist/standalone
```

Open `http://localhost:8765`. Standalone PWA assets are in `dist/standalone`; AppLauncher consumes `dist/ascendant`. Both are generated, not committed. Cloudflare Workers assets config is included. `main` is the initial branch; `origin` is the intended `https://github.com/tanner-voas/Ascendant.git` (create the empty remote and push before deploying the launcher).

## Play

- Design and name five characters per side. Each must have 200 integer points, 10–40 per attribute. Roll 10d4 independently for each attribute and normalize by proportional allocation with bounded integer correction. Draft and complete teams are saved locally. Lock individual attributes to preserve them when rolling a character, balancing, or rolling a team. Impossible locked allocations leave the character/team unchanged. The derived-stat panel updates as you edit. Save named characters and teams to the local library, copy them between slots/sides, rename/duplicate/delete saved entries, or import/export validated JSON rosters.
- Select one of 20 fixed seeded procedural arenas, optionally enter a battle seed. Positions are randomized in disjoint team zones. Both dice and initiative use the battle seed.
- Turn order is continuous simulated time, not a fixed round. Control the currently active Team A member. Click/tap enemies or their roster cards to target; click/tap empty ground to add a straight segment, or drag to its endpoint. Undo, clear, and commit the path. Pan with a drag in Pan mode, pinch to zoom, or use zoom/fit/center-active controls. Distinct gold, white and dashed orange rings mark the active, inspected and targeted units. A path is rejected if it crosses a solid obstacle, another living character, the map edge, or its movement budget. Movement once per turn, then one action; no movement is required.
- Fixed actions: strike, heavy strike, quick strike, shove (off-balance/displacement), guard, recover, observe, wait. Strikes use opposed d20 rolls and 2d6 variation, with range and line-of-sight. Zero HP incapacitates. No low-health or low-mana performance penalties.
- AI uses the same movement/action API; prioritizes weak/nearby targets and allies' engagements, navigates around obstacles with a visibility graph, and selects strikes, guard or recovery. Auto-play both sides, pause/resume, step, choose AI speed, inspect timeline/resources/stats and export JSON log. Action previews display exact opposed-d20 hit probabilities, expected pre-overkill damage including misses, damage range on successful hits, resource expenditures and next-action delay from the same calculation functions as resolution. Expand log entries for dice, mitigation, costs and timing. A 1,000-turn ceiling produces a draw. Battles autosave after actions, including movement, PRNG state and UI state; Save & setup returns to the roster editor. Resume restores the saved battle with AI paused. Restart same seed uses the original rosters and map, not any subsequently edited setup. New random seed reuses those rosters/map. Starting a different battle replaces the single saved battle slot after confirmation.

## Mechanics / provisional calibration

`src/engine.js` contains the independent deterministic engine. `src/maps.js` creates 20 arenas; `src/app.js` renders the UI. Standard stats are 20; HP and the four other capacities follow the previously proposed power-law formulas. Physical, mental and resolve efficiency falls quadratically, with nonzero floors; resolve can offset exhaustion at a cost. Mana is present but unused by intentionally mundane actions. Health recovery is not available mid-fight in this prototype; recover replenishes energy/resolve. Innate DR is flat and RES proportional, with penetration function support. Heavy strikes have provisional flat penetration. Turn cost uses the approved cosine penalty with Agility scaling, resets next turn, and merges closely spaced bends for cost accounting (not a full curvature/physics model). Movement adds a modest time and energy cost. Off-balance is the initial applied graded status; fear is represented in engine calculations but no current action inflicts it. The complete proposed damage-type/condition catalogue, injuries, death rules, spells, progression and future WorldGen/Chronicle integration are not implemented. These numerical combat values are sandbox defaults, not final balance rules.

## Tests

`npm test` checks 10,000 stat rolls, deterministic deployment across all maps, path collision/turning, damage penetration, zero-resource action availability, and full AI matches on all 20 maps. New tests cover 10,000 locked allocations, roster JSON validation, exact restoration of the PRNG and replayed future events on 20 arenas, and exhaustive dice combinations for four attack actions. No overlap or out-of-bounds positions allowed for living units.

## v0.1.1 scope

Usability release only: unchanged stat budget, resource curves, action set, terrain and AI rules. The engine shares action math between forecasts and execution, with structured log details. Mana remains unused. Saved setups from v0.1.0 migrate automatically. No backend or cross-device sync; roster files provide manual portability. Browser navigation is restricted in the release test environment, so real iOS gesture and layout testing remains necessary.
