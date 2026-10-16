MapCrew pays independent field agents to visit local contractors who have already agreed to a visit, and to help each owner set up their own free Google Business Profile on their own phone. Visitors arrive skeptical, from Reddit, X and TikTok, on their phones. Every screen exists to make one feeling true: **"I'm sure I'll get paid, I know exactly what to do, and this is legit."**

"MapCrew" is a working name. Change it in one place, `MapCrew.brand.name` in `components/bundle.js`; every `[data-brand]` element and generated string picks it up. Legal name, address and support email live next to it as placeholders.

## Content fundamentals

**Voice:** plain, warm, specific. Second person ("you"), present tense, short sentences, real numbers. Write like a person explaining a job to a friend, not like an ad.

- Say exactly how much, when and how: "$40 when we validate your visit." "Paid every Friday via Stripe." "About 45 minutes of online training."
- Use sentence case for headings and buttons. Buttons start with a verb: "Apply in 5 minutes", "Accept mission", "Submit visit".
- Use "you choose", "no quotas" and "daytime" where they're true. Don't use "easy money", "passive income", "hustle", "cash", "unlimited", "act now".
- No emoji, no exclamation marks in UI copy, no dollar-bill imagery.
- Write numbers as digits, money with `$` and no trailing `.00` in marketing copy ($40, +$25, +$50). In the app, show cents on balances and history ($105.00).
- When something is uncertain, say so: "+$50 if the business becomes our customer — the owner decides."

Real copy to reuse: "Get paid to put local businesses on the map." · "Paid every Friday." · "You choose when and where." · "No quotas." · "You never handle anyone's password."

### Non-negotiable content rules

1. Never suggest MapCrew is Google or affiliated with Google. Every marketing page carries: **"MapCrew is an independent company, not affiliated with Google."** (`MapCrew.brand.independence`). "Google Business Profile" is used descriptively only. No Google logos, no Google four-color palette, no Google Maps styling.
2. Never mention reviews, ratings or stars anywhere. Agents are never paid for reviews and never write or ask for them. No star icons in the icon set.
3. No fake social proof. No invented testimonials, payout totals, agent counts or press logos. Use visible placeholders: `[Testimonial placeholder — real agent quote, with permission]`.
4. Earnings examples are labelled as examples (`mc-badge--pending` "Example, not a guarantee") and explain their assumptions.
5. State "18+ only" and "independent contractor" wherever someone signs up, signs or reads about pay.
6. No fake urgency: no countdown timers, no "only 2 left", no expiring offers. The `Bonus` tag is the only urgency signal.

## Visual foundations

**Mood:** calm, honest, grounded in real places: neighborhoods, trucks, workshops, maps. Editorial headlines, lots of whitespace, soft depth.

**Color.** Ground is `paper` (warm off-white). Text is `ink`; secondary text is `ink-muted`. The brand base is `forest`, used for the trust section, the footer, balance cards and done pins, with `on-forest` text. The single accent is `signal`, a safety-vest orange: primary buttons, available pins, progress fills, the current step. Rules:

- Text on `signal` is always `on-signal` (ink), never white. Orange as text uses `signal-text`.
- Status always pairs a color with an icon and a word: `success` + check + "Done/Paid/Earned", `pending` + clock + "Pending", `danger` + alert. Success and danger also differ in lightness.
- Levels use their own pairs: `level-bronze`, `level-silver`, `level-gold` on their `-soft` backgrounds.
- `line` is decorative only. Control borders use `line-strong` (≥3:1).
- Light mode for marketing; light and dark for the app. Every token is defined for both themes, and every text pair named in a token's note holds 4.5:1 in both.

**Type.** Headlines in **Bricolage Grotesque** (`display` family: `display-xl` → `h3`), tight leading, slight negative tracking. Everything else in **Public Sans** (`sans` family: `body-l`, `body`, `body-s`, `label`, `overline`). Money always uses `money-xl`, `money-l` or `money` with tabular figures (`.mc-num` for inline numbers) so amounts line up in lists and don't jitter on the estimator. Inputs are 16px. Both families load from Google Fonts.

**Spacing and layout.** A 4px base: `space-1`…`space-9`. Phone gutter is `space-4` (16px); section padding is `space-7` on mobile, `space-9` on desktop. Mobile-first; the landing page switches to desktop through a container query at 900px on `.lp`. Content max width is 1200px.

**Shape and depth.** Rounded and soft: `radius-md` for buttons and inputs, `radius-lg` for cards, `radius-xl` for sheets and hero panels, `radius-pill` for badges, chips and toggles. Depth comes from `shadow-card` (resting) and `shadow-raised` (hover, sheets, floating cards); pins use `shadow-pin`. No hard borders around cards, no coloured left-border cards, no gradients.

**Motion.** Subtle and functional, using one easing curve, `cubic-bezier(.2,.7,.2,1)`: cards lift 2px on hover, pins lift 4px and scale 1.12 when pressed, step panels rise 6px over 300ms, progress widths animate over 400ms, "you" dot pulses slowly. Everything turns off under `prefers-reduced-motion`.

**Accessibility.** WCAG AA throughout. Touch targets are at least 44×44 (buttons 48, large buttons 56). Focus is a solid 3px `ink` outline with a 2–3px offset, visible on paper, surface, forest and signal. Every control has a visible label; progress has a text count; icons beside text are `aria-hidden`.

## The map motif

The recurring brand idea is a neighborhood seen from above: rounded city blocks on a 14px-ish street grid, a park, a river, one diagonal avenue, teardrop pins and a dashed route. Draw it with `MapCrew.map()` (see MapPin). Use it in the hero, mission screens, empty states and the cover. It is illustration, not a map product. Never imitate Google Maps.

## Imagery

Real photography of real people on site: agents (diverse, early 20s to 30s, casual clothes) with a business owner, in daylight, at workshops, yards and trucks — concrete, fencing, roofing, tree service. The owner holds their own phone. No stock "laptop on the beach", no cash, no posed thumbs-up, no Google screens.

Until real photos exist, use `MapCrew.photo(title, brief)`: a hatched placeholder labelled `[Photo]` whose caption is the shot brief. Never ship AI-generated or stock people as if they were agents.

## Iconography

An original line icon set drawn for MapCrew, built into `components/bundle.js`: 24px grid, 1.75px stroke, round caps and joins, `currentColor`. Render with `MapCrew.icon(name)` or `<span data-icon="name"></span>` plus `MapCrew.hydrate()`. Trade icons map through `MapCrew.tradeIcon` (concrete → brick, fencing → fence, roofing → roof, tree → tree). There is deliberately no star, dollar sign or money-bag icon. No emoji.

**Logo.** No final logo yet. The working mark is the brand pin (signal body, ink outline and eye) beside the name in Bricolage Grotesque 800 (`MapCrew.logo()`). Replace it when an identity is designed.

## Pay rules in the UI

Read amounts from `MapCrew.pay` (`visit` 40, `live` 25, `customer` 50; levels Bronze 0%, Silver ≥5 visits +10%, Gold ≥15 visits +20%) and use `MapCrew.estimate(missions, level)` for example ranges (low = visit pay only, high = all three steps). Always show the split next to any "up to" figure. Payouts: every Friday, via Stripe.

## Using the system

Load `tokens.css`, `components/bundle.css`, then `components/bundle.js` (no dependencies; it defines `window.MapCrew`). Wrap app or page content in `.mc` (set `data-theme="light"` or `"dark"`). Build screens from the classes documented on each component card: `mc-btn`, `mc-input`, `mc-seg`, `mc-chips`, `mc-otp`, `mc-progress`, `mc-stepper`, `mc-mission`, `mc-map`/`mc-pin`, `mc-payout`/`mc-track`/`mc-pline`, `mc-level`, `mc-badge`, `mc-sync`, `mc-toast`, `mc-empty`, plus the phone chrome `mc-phone`, `mc-appbar`, `mc-bottom`, `mc-tabbar`. The Landing page and App screens cards are complete reference compositions.
