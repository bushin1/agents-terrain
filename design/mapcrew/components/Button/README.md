# Button

Buttons carry one action each; `primary` (signal orange, ink text) is the single most important action on a screen.

- **Provide:** a `<button>` or `<a>` with `class="mc-btn mc-btn--{primary|dark|secondary|ghost|danger|on-forest}"`, optional `mc-btn--lg` / `mc-btn--sm` / `mc-btn--block`, and a verb-first label ("Accept mission", "Apply in 5 minutes"). Icons go after the label for forward motion (`arrow-right`, `external`).
- One `primary` per view. On mobile app screens it lives in `.mc-bottom`, full width, `mc-btn--lg`.
- Text on orange is always `on-signal` (ink). Never white on orange.
- Minimum height 48px (44px for `--sm`); `.mc-iconbtn` is 44×44.
- Disabled = `disabled` attribute; pair it with a line that says what's missing ("Finish 4 more steps to submit"), never a silent grey button.
- `danger` only for cancelling a mission or leaving a visit.
- Focus: 3px solid `ink` outline, 3px offset.
