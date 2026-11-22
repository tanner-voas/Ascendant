# Ascendant v0.1.10 — balance and consolidation audit

## Method

Run `node scripts/balance-audit.mjs 30` from the repository root. Each archived full pass contains 1,590 actual engine battles (1,320 close-range duels, 80 same-tier 5v5 matches, 60 asymmetric matches, 60 AI comparisons, 30 fatigue trials and 40 alternate-objective battles). Each marginal stat is raised 30% relative to the tier mean, compensated by the remaining nine stats, with integer bounded allocation and 30 seeds at each tier. Both builds use Standard AI in the marginal series. Seeds are reused across cells; these are paired exploratory comparisons, not independent random samples across all cells. Team and policy sample counts are small and maps are varied. Raw aggregates and actions are archived in the four JSON files in this directory. Tests of mechanics are separate from balance outcome measurements. The first proposed calibration was rejected; the revised calibration is retained and rerun after objective/telemetry fixes.

## Marginal effect: A wins, pooled over four tiers (120 trials per row)

| Build | v0.1.9 | Rejected calibration | Final |
|---|---:|---:|---:|
| balanced | 60/120 (50.0%) | 60/120 (50.0%) | 60/120 (50.0%) |
| STR | 83/120 (69.2%) | 76/120 (63.3%) | 73/120 (60.8%) |
| REA | 71/120 (59.2%) | 82/120 (68.3%) | 77/120 (64.2%) |
| AGI | 92/120 (76.7%) | 95/120 (79.2%) | 78/120 (65.0%) |
| END | 41/120 (34.2%) | 33/120 (27.5%) | 36/120 (30.0%) |
| STA | 50/120 (41.7%) | 34/120 (28.3%) | 36/120 (30.0%) |
| VIT | 72/120 (60.0%) | 48/120 (40.0%) | 65/120 (54.2%) |
| PER | 64/120 (53.3%) | 54/120 (45.0%) | 50/120 (41.7%) |
| INT | 52/120 (43.3%) | 37/120 (30.8%) | 61/120 (50.8%) |
| WIL | 41/120 (34.2%) | 30/120 (25.0%) | 28/120 (23.3%) |
| SPI | 37/120 (30.8%) | 21/120 (17.5%) | 26/120 (21.7%) |

## Observations

- Agility and Strength dominance was reduced, and Intelligence approached parity. Reaction remains strong. Endurance, Stamina, Perception, and especially Willpower remain under-rewarded by this close-range AI policy; balance is not solved. The four-tier pooled results are not estimates of universal character value. Spirit intentionally lacks usable magic in this phase. Do not compensate by inventing unrelated physical benefits.
- Five STR+REA specialists beat five END+VIT specialists 34/40 times. Balanced teams beat randomized teams 24/40. All 80 same-tier matches reached a winner. This offensive advantage needs later work, especially sustained attrition and defensive team strategies.
- One 400-point character beat five 200-point characters in 17/20 side-reversed matches; one 800- or 1600-point character won 20/20 at each tier. This is a result of current rules, not an approved cultivation power curve.
- Tactical beat Basic 16/20 and Standard 12/20; Standard beat Basic 12/20. No hidden bonuses are used, but the samples are too small for a definitive ranking.
- Starting at 15% physical, mental and resolve resources lost 30/30 duels against a fresh matched character. This demonstrates the severity of simultaneous depletion, not the individual value of Stamina.
- All 1,590 final runs reached a terminal state, including nine draws in area control. The other objectives were survival (10/10 A wins), escape (10/10), protection (9/10). Objective-specific AI remains rudimentary. No conclusion of perfect balance is appropriate.

## Implemented refinements

- Opposed accuracy uses weights AGI 1.2, PER 2.5, INT 3, WIL 1.3 on log2(stat/20); passive evasion uses REA 2.5, AGI 1.7, PER 2.4, WIL 0.4. Physical execution AGI exponent is 0.30 (was 0.40) with INT 0.10 for planning/control; the total uniform-tier scaling and baseline remain unchanged.
- Natural DR exponent 0.95, natural RES exponent 0.85 (formerly 0.8 and 0.75); baseline remains 2 DR and 12% RES, cap remains 60%. Guard, block and brace scale their flat defenses with physical capability. Dodge, parry and counter readiness now use relative attacker/defender attributes. Equal-capability reaction bonuses no longer inflate just because both fighters are higher tier.
- AI health and resource thresholds use fractions, control actions use relative specialization, and heavy-attack preference compares defense to the attacker’s damage scale.
- Exact forecasts group 400 opposed d20 outcomes into 39 differences and 36 2d6 combinations into 11 sums. The distributions and outcome boundaries are unchanged; Tactical AI skips unused recovery forecasts. Worker aggregate/UI updates are throttled from 250ms to 750ms. No wall-clock speedup is claimed, since the audit runs used different combat rules and CPU loads.
- Laboratory damage telemetry reports actual Health lost, excluding overkill. The full attack damage breakdown remains available. Escape and control now respect the explicit objective when a team is eliminated. JSON records engine revision; CSV and table include Wilson 95% intervals for A victories, with draws treated as non-wins. These intervals measure binomial sampling uncertainty only, not model or scenario uncertainty.

## Remaining priorities

1. Model physical expenditure and recovery consistently at high tiers: current capacities grow faster than ordinary action costs, weakening the role of sustained exertion. Test equal-budget specialists in long fights rather than only close-range duels.
2. Refine control and observation policies to better express Willpower and Perception. Compare multiple tactics with more side-reversed trials and varied terrain.
3. Re-audit action utility and mana interaction when class/progression content exists. Avoid assuming these provisional mundane-combat results establish the final power scale.
4. Real iOS layout, gesture and long-running worker tests remain necessary. Saved rosters and battle data retain their format, but v0.1.9 battles continue under new formulas; old result replays require the old engine version for exact reproduction.
