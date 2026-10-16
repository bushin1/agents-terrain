# PayoutSteps

The three-part payout per business — $40 when the visit is validated, +$25 when the profile goes live, +$50 if the business becomes a customer — shown as cards (`.mc-payout`), a vertical tracker (`.mc-track`) or a compact line (`.mc-pline`).

- **Provide:** each step's amount, its trigger in plain words, and a state: `done` (success, check icon, "Paid"), `pending` (pending color, clock icon, "Pending"), `waiting` (neutral, "Waiting").
- Amounts use tabular figures (`money`, `money-l`). Read amounts from `MapCrew.pay` so a price change happens in one place.
- Step 3 is never presented as certain: label it "if it happens" or "if they become a customer", and use the outlined card style on marketing pages.
- Every state has an icon and a word; color is never the only signal.
