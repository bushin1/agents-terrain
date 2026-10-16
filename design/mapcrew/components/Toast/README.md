# Toast

A short confirmation that appears above the bottom bar for about 4 seconds, or stays while a condition holds (offline).

- **Provide (JS):** `MapCrew.toastHTML(message, { tone: "success" | "offline", icon, action })`. One sentence, past tense for confirmations ("Mission accepted."), plain cause and effect for problems.
- Ink background with paper text in both themes (inverted, so it reads over any screen). `role="status"`.
- At most one action, as an underlined text button ≥44px tall.
- Never use a toast for errors that block progress — show those inline next to the field or step.
