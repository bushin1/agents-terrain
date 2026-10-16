# MissionCard

The unit of work: one business visit, with everything needed to decide — trade, city, distance, time slot and the full payout split — before tapping in.

- **Provide (JS):** `MapCrew.missionCard({ trade, title, city, dist, slot, bonus })`. `trade` is one of `concrete`, `fencing`, `roofing`, `tree`, `general` and picks the icon. `bonus` is an optional dollar amount; it adds the `Bonus` tag and a line in the split.
- Always show the split (`$40 visit + $25 live + $50 if customer`) next to the "up to" total, so the maximum is never presented alone.
- Never show the business name or exact address before the mission is accepted; city and distance only.
- Bonus is the only urgency signal allowed: a `mc-badge--bonus` tag. No countdowns, no "only 2 left".
- Hover/press lifts the card 2px to `shadow-raised`. Min width 300px.
