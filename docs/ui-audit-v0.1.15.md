# v0.1.15 — Battle screen usability audit

This release is restricted to battle presentation and interaction grouping. It does not modify the engine, navigation, damage, action scheduling, engagement or AI decision logic. The ordinary and laboratory simulators retain their previous behavior.

## Problems observed in v0.1.14

1. **Actions below a large timeline.** On a narrow display, the player scrolled past the entire timeline to reach the first useful decision button.
2. **Every action competing for attention.** Fifteen equally prominent buttons obscured the six commonly used choices. Unavailable melee and condition-specific actions dominated the screen even without appropriate context.
3. **Repeated character information.** The ally strip was followed by a complete second roster and an always-expanded, lengthy inspector.
4. **Secondary controls always visible.** Team tactics, automation configuration, full inspector, log, replay and restart appeared in a long vertical sequence.
5. **Verbose phase labels.** “move · execution”, “strike · preparation”, and “strike · recovery” occupied more width than the information warranted.
6. **Forecast work in collapsed UI.** A detailed set of attack forecasts could be computed even when the player did not need it.

## Changes

- The fixed ally and enemy strips and battlefield remain at the top. **Actions now appear directly under the battlefield**, ahead of timeline and inspectable details.
- The default six action buttons are **Move, Strike, Quick strike, Heavy strike, Guard, Recover**. Other actions live under **More actions**, separated into control and utility groups. All fifteen original buttons are preserved and continue to call the same engine action handler.
- The movement mode picker and projected cost/time plus Confirm remain immediately underneath the default action row.
- Clock speed, Pause/Play and Auto are consolidated beside the action heading.
- The timeline is collapsed by default into a one-line allied status preview. Expanding it displays compact phase bars and a short P/E/R explanation. Enemies' timing remains hidden.
- `Strike[P]`, an instantaneous `Strike[E]` marker, then `Strike[R]` model the *presentation* of a discrete attack. The existing attack work duration is represented as wind-up, with its actual impact at `impactAt`; this does not change the event scheduler. Movement is `Move[E]`, with no preparation or recovery.
- The duplicate lower roster has been removed. The inspector, team tactics, battle log, replay and battle actions are collapsible sections. Detailed action forecasts are only calculated when opened.
- Open sections remain expanded during control changes that rerender the screen. Other controls retain their prior event handlers and save behavior.

## Static mobile layout measurement

Rendering v0.1.14 and v0.1.15 battle markup using the same 390-pixel-wide static Chromium fixture, with the same map seed and balanced 5v5 teams:

| Metric | v0.1.14 | v0.1.15 |
| --- | ---: | ---: |
| Default page height | 2,927 px | 1,267 px |
| Top of action controls | 816 px | 562 px |
| Horizontal document overflow | None | None |

The page is 1,660 pixels shorter in this test (approximately 57%). These are **layout measurements for a static battle fixture**, not measurements from an actual iPhone. Rendering, touch interaction, and Safari behavior on the user's device should still be reviewed.

## Verification

- The full Node test suite contains 112 tests, including four new pure timeline tests and extended actual battle-markup interaction checks.
- The prior battle algorithms are unchanged. Old scenarios, save files and headless tests use identical game logic.
- Standalone and AppLauncher-compatible production packaging builds successfully.
- The targeted browser layout was rendered at 390 × 844 CSS pixels; no horizontal overflow was observed. This is a static-markup browser rendering check, not a complete live-browser integration test.

## Remaining UI decisions

There are opportunities to improve the narrow-screen readability of the battlefield tokens, explain disabled actions inline, and further optimize the mode/route confirmation experience. Those have intentionally been deferred rather than changing them along with this restructuring.
