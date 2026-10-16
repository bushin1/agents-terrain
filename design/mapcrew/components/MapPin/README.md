# MapPin

The brand's recurring graphic: a teardrop pin over a stylised neighborhood grid. `MapCrew.map()` draws the grid; `MapCrew.pin()` draws a pin.

- **Provide (JS):** `MapCrew.map({ seed, cols, rows, height, you: [x%, y%], radius, route, pins: [{ x, y, state, tag, bonus, selected, label }] })`. Coordinates are percentages of the map box, so pins stay put at any size. `route` is an SVG path in the same 0–100 space.
- States: default (`signal` body, `on-signal` outline), `done` (`forest`), `muted` (taken). Optional `tag` shows pay ("$115") or "Bonus".
- Pins are 44×52 buttons with an `aria-label`; pressed pins lift 4px and scale 1.12.
- Map colors are `map-land`, `map-block`, `map-street`, `map-park`, `map-water`, `map-route` — all retuned for dark mode.
- Never use Google Maps styling or Google's four colors. Use the motif as illustration; the real app map will be a third-party tile layer restyled with these tokens.
