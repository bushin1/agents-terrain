# Stepper

Shows where someone is in a sequence: a linear `.mc-progress` bar (Apply, modules), `.mc-dots` (quiz questions), and the vertical `.mc-stepper` used by the 7-step visit checklist.

- **Provide:** for `.mc-step`, a `data-state` of `done`, `current` or `todo`, a title, a one-line meta, and a status word ("Done", "Now"). Done steps show a check icon in a `success` dot; the current step is a `signal` dot with a `signal-soft` ring.
- Each step row is a full-width button (min 56px tall) so it can be tapped to open its panel (`.mc-step__panel`).
- Progress bars always sit next to a text count ("4 of 6"), with `role="progressbar"` and `aria-valuenow`.
- Motion: panels rise in (`mc-rise`, 300ms); widths animate over 400ms. Both stop under `prefers-reduced-motion`.
