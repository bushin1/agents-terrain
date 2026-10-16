# Input

Form controls for the Apply flow and in-app settings: text input, chips (single choice), segmented control, OTP code, checkbox and range.

- **Provide:** a visible `.mc-label` tied to the control (`for`/`id` or `aria-labelledby`), and `.mc-help` under it when a field needs a reason ("Used to find missions near you").
- Inputs are 52px tall, 16px text (stops iOS zoom), `line-strong` border, `surface` fill. Focus: `ink` border plus a `signal-soft` halo.
- Errors: add `mc-input--error` and `aria-invalid="true"`, then a `.mc-error` line with the `alert` icon and a fix-it sentence. Never color alone.
- Use `.mc-chips` (role radiogroup) for 3–5 short options, `.mc-seg` for 2–3 mutually exclusive views or answers, `.mc-otp` for the 6-digit SMS code (inputs `inputmode="numeric"`).
- Ask only what the step needs; one topic per Apply step.
