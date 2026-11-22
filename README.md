# Ascendant — Tactical Battleground (v0.1.3)

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

`src/engine.js` contains the independent deterministic engine. `src/maps.js` creates 20 arenas; `src/app.js` renders the UI. Standard stats are 20; HP and the four other capacities follow the previously proposed power-law formulas. Physical, mental and resolve efficiency falls quadratically, with nonzero floors; resolve can offset exhaustion at a cost. Mana is present but unused by intentionally mundane actions. Health recovery is not available mid-fight in this prototype; recover replenishes energy/resolve. Innate DR is flat and RES proportional, with penetration function support. Heavy strikes have provisional flat penetration. Turn cost uses the approved cosine penalty with Agility scaling, resets next turn, and clusters closely spaced bends by travelled distance (not a full curvature/physics model). Movement adds a modest time and energy cost. Off-balance is the initial applied graded status; fear is represented in engine calculations but no current action inflicts it. The complete proposed damage-type/condition catalogue, injuries, death rules, spells, progression and future WorldGen/Chronicle integration are not implemented. These numerical combat values are sandbox defaults, not final balance rules.

## Tests

`npm test` checks 10,000 stat rolls, deterministic deployment across all maps, path collision/turning, damage penetration, zero-resource action availability, and full AI matches on all 20 maps. New tests cover 10,000 locked allocations, roster JSON validation, exact restoration of the PRNG and replayed future events on 20 arenas, and exhaustive dice combinations for four attack actions. No overlap or out-of-bounds positions allowed for living units.

## v0.1.1 scope (historical)

Usability release only: unchanged stat budget, resource curves, action set, terrain and AI rules. The engine shares action math between forecasts and execution, with structured log details. Mana remains unused. Saved setups from v0.1.0 migrate automatically. No backend or cross-device sync; roster files provide manual portability. Browser navigation is restricted in the release test environment, so real iOS gesture and layout testing remains necessary.


## v0.1.2 — Movement and positioning

- **Path editor:** tap or drag on ground to append a segment; tap a numbered waypoint to select it, drag it to relocate it, tap a midpoint `+` to insert a point, or delete the selected waypoint. Undo removes the last point; Clear discards the path. Tap Auto path and then a destination to generate a route; Route to target plans to a legal melee position. Routes stop at the current turn's budget. Trim path clips the existing plan to its longest legal prefix. Neither preview nor route generation consumes dice. The final path is always validated before movement commits.
- **Map overlays:** blue sampled direct-reach envelope (from the current path endpoint if planning a path); red enemy engagement circles, faded after interception has been spent; orange interception points along the planned path; white facing indicators. The reach envelope is an approximation for one additional straight segment, not the complete set of destinations reachable by detours; individual segments are validated exactly. The threat circle shows nominal range, while actual interception requires line of sight. Pan/pinch/zoom remain available. Face mode changes facing on the current character's turn, without consuming movement; the final movement segment updates facing, and a melee attack faces its target.
- **Terrain:** four passable difficult-terrain rectangles per original seeded arena, with brush ×1.25, loose stone ×1.40 and soft ground ×1.18. Obstacles and deployment geometry are preserved. Exact covered segment lengths determine terrain cost; overlapping terrain, if present in a custom map, uses the highest applicable multiplier. Separate UI fields report actual distance, turn cost and terrain cost, including after commitment.

Provisional movement mode multipliers (relative to Run; the budget is further adjusted by fatigue, conditions, Agility and Resolve use):

| Mode | Budget | Energy per budget metre | Momentum coefficient | Movement delay contribution | Interception attack modifier |
|---|---:|---:|---:|---:|---:|
| Walk | .72 | .50 | .72 | .85 | -1 |
| Run | 1 | 1 | 1 | 1 | 0 |
| Sprint | 1.35 | 1.65 | 1.28 | 1.12 | +2 |
| Cautious | .58 | .72 | .60 | 1.12 | -4 |

Momentum cost coefficient is `0.15 * normalMovement * (20/AGI)^0.25 * mode.turn`. An isolated bend costs `k*(1-cos(angle))`; for a short approach the coefficient is multiplied by `0.75 + 0.25*min(1,approachMetres/2)`. Consecutive bends separated by at most one metre belong to a cluster. The cluster charges the greater of the individual cosine sum or the cosine cost of its total absolute angle (two units of cost for each full 180° plus the remainder). This prevents tightly subdivided turns from avoiding cost while allowing large, sweeping arcs. There is no initial or terminal turn penalty and no carry-over between turns. Collinear segmentation does not affect costs.

Engagement is a 1.9 m visible reach. Leaving a living opponent's engagement may trigger a single opposed-d20 interception until that defender's next turn; entering alone does not. Interception consumes defender energy, can deal reduced strike damage, and immediately stops the move if the mover reaches zero Health. Movement mode affects exposure. Side attacks receive +1, rear attacks +2, with another +1 for an ally engaging from the opposite direction (>120°). These are provisional positional modifiers, not new skills. All fixed actions remain available; no spells/classes or equipment have been introduced. AI uses the same path validation, movement mode costs and combat rules; routing includes difficult terrain and approximate incoming heading costs, and does not promise a globally optimal route.

Old v0.1.1 saves resume with default facing and available interceptions. The saved positions, resources and PRNG state are preserved, but future battle results may differ because the rules changed. Same-version resume and rematch remain deterministic. The standalone cache includes navigation.js automatically; no launcher source change is required. Update the launcher submodule pointer after pushing this release.

Validation: `npm test` includes previous allocation, dice-distribution and determinism checks plus momentum-subdivision, terrain, mode, facing, interception, fatal interruption, pathfinding, old-save migration and randomized arena tests. The randomized audit completes 100 full 5v5 matches (five per arena) with no draws or invalid positions. Browser navigation is restricted in the release environment; visual/touch testing on actual iOS remains outstanding.

## v0.1.3 — Time and action economy

Combat now uses an event-driven, continuous simulated clock; there is no real-time pressure on the player. A decision starts a serializable job, and the scheduler resolves preparation, execution/impact, and recovery events in chronological order. Other units can choose and complete actions while the job is pending. At equal timestamps pending events precede new decisions, then stable unit IDs break ties. A strong hit can interrupt an unfinished ordinary action; a heavy strike is committed once execution starts, though forced displacement still interrupts it. Costs are paid on commitment, including on cancellation or target loss. The actual target range, line of sight, facing, target defense and available reaction are checked at impact. Forecasts are conditional on the current battlefield, not a guarantee. Attacker exertion efficiency is locked on commitment.

Timing coefficients live in `src/timeline.js`. At 20 in every attribute and full energy, a strike takes 0.528s preparation, 1.152s execution, and 0.720s recovery (2.4s total). Reaction scales preparation and recovery separately from execution, which depends on Agility/Strength for physical actions and Intelligence for analysis/holding. Physical, mental and resolve efficiency still matter. Movement has its own phases and keeps the same v0.1.2 movement allowance and path costs. It progresses through waypoints and intermediate checkpoints (at most 1.25m apart); collision and interception are checked again at each checkpoint. The unit gets a follow-up action after movement recovery, even if the route was interrupted; no second move or additional reaction refresh is granted. Movement is not continuous collision physics, and full planned energy is charged up front.

The default defensive policy is Dodge; choose Dodge, Brace, Counter, or None at the decision prompt. Dodge modifies the opposed attack, Brace improves mitigation, and Counter permits a reduced damage retaliation on a miss. A shared reaction allowance also governs existing disengagement interceptions. None disables the new strike responses, not the existing disengagement interception. Rear attacks and committed attacks can deny reactions. Enemy AI chooses a reaction based on its stats and current energy. Wait delays the next decision; Hold for enemy wakes once an opponent enters engagement range (or times out), without automatically attacking.

The timeline panel shows all pending phases and anticipated completion times, with dashed paths/telegraphs on the board. Toggle event-by-event resolution, pause AI, and step pending events manually. The latest 180 event/decision frames are retained for read-only playback; this is not an undo system or a full battle recording. Pending jobs, reaction states, PRNG, follow-up state, and recent frames persist in saved battles. Old v0.1.1/v0.1.2 saves migrate to the new scheduler; continuing them can produce different results from their old rules. Existing roster format and app ID are unchanged.

No classes, spells, feats, equipment, advancement, or new player attributes have been added. Timing/reaction balance is provisional.
