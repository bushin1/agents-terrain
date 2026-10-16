Design a modern (2026) website and mobile web app for **MapCrew** (working name, keep it easy to swap): a US platform that pays independent "field agents" to visit local contractors near them and help them set up and verify their own free Google Business Profile.

## What the product is

- Our team calls local contractors (concrete, fencing, roofing, tree service…) and books a visit with the ones who agree.
- A field agent picks one of these missions near them, goes to the business (about 45–60 min), and helps the owner create or claim their profile **on the owner's own phone and Google account**. The agent also takes 10–15 photos (logo, truck, team, equipment, past jobs) and guides the owner through Google's video verification when it's offered.
- The agent is paid in 3 steps per business:
  - **$40** when we validate the visit;
  - **+$25** when the profile goes live;
  - **+$50** if the business becomes our customer.
- Levels add a bonus: Silver (5+ validated visits) +10 %, Gold (15+) +20 %.
- Payouts go out every Friday via Stripe. Agents are independent contractors and must be 18+.

## Who we're designing for

Visitors mostly arrive on their phone from Reddit, X and TikTok, and they arrive **skeptical**: "get paid" sites are usually scams. The design has to win their trust in the first scroll.

1. **Maya, 20, college sophomore.** Wants flexible money between classes, sometimes has a car. Lives on her phone and uses Venmo and Cash App. Has been burned by "survey apps that never pay". Wants to know exactly how much, when, and how.
2. **Dana, 34, stay-at-home parent.** Free during school hours. Wants short, local, safe tasks with no quotas. Cares about safety: daytime visits, businesses that agreed in advance, a real company behind it.
3. **Marcus, 27, gig worker (DoorDash, Instacart).** Compares dollars per hour. Wants clear pay per mission, a map of what's near him, and fast, reliable payouts.

The common emotional need: **"I'm sure I'll get paid, I know exactly what to do, and this is legit."**

## Design direction

- **Mood:** calm, honest, human, grounded in the real world (neighborhoods, trucks, workshops, maps). The opposite of "make money fast": no neon green money, no dollar-bill emojis, no countdown timers, no fake urgency, no stock "laptop on the beach" imagery.
- **Visual language:**
  - editorial and confident, with large expressive headline type and generous whitespace;
  - soft depth, rounded cards, subtle motion (micro-interactions on pins and cards, smooth step transitions);
  - a map motif (pins, routes, neighborhood grids) as the brand's recurring graphic idea;
  - real-looking photography of contractors and of agents (diverse, early-20s to 30s, casual) talking with a business owner on site.
- **Color:** deep ink or forest base, warm off-white background, and one high-visibility accent inspired by work wear and safety vests (signal orange or amber). **Do not use Google's brand colors** (the blue/red/yellow/green combination) or anything that looks like Google's branding.
- **Type:** a modern grotesk for headlines and a highly readable sans for body text. Use tabular figures for money.
- **Tone of copy:** plain, warm, second person, specific numbers and no hype. Examples: "Paid every Friday." "You choose when and where." "No quotas."
- **Mobile-first,** then adapt to desktop. Accessible: WCAG AA contrast, 44px touch targets, visible focus states. Provide light mode, and dark mode for the app.

## Non-negotiable content rules

- Never suggest we are Google or affiliated with Google. Include a clear line: "MapCrew is an independent company, not affiliated with Google." Mentioning "Google Business Profile" descriptively is fine; no Google logos.
- Never mention reviews, ratings or "5 stars" anywhere: agents are never paid for reviews.
- No fake social proof: no invented testimonials, payout totals or user counts. Use clearly marked placeholders (e.g. "[Testimonial placeholder]").
- Earnings examples are labeled as examples, not guarantees.
- State "18+ only" and "independent contractor" where relevant.

## Pages and screens to design

### 1. Landing page (mobile + desktop)

1. **Hero.** Headline: "Get paid to put local businesses on the map." Subhead: "Visit contractors near you, help them set up their free Google Business Profile, and earn up to $115 per business — paid every Friday." Primary CTA: "Apply in 5 minutes". Secondary CTA: "See how pay works". Visual: a phone showing a mission card over a stylized neighborhood map with pins.
2. **How it works,** in 3 steps:
   - Apply and get certified (about 45 min of online training);
   - Pick missions near you (you choose when and where);
   - Visit, help, get paid.
3. **Pay, fully transparent.**
   - The 3-step payout as a simple visual: $40 → +$25 → +$50.
   - The levels: Bronze, Silver +10 %, Gold +20 %.
   - "Paid every Friday via Stripe".
   - A small interactive estimator: a slider for missions per month that shows an example range, labeled as an example.
4. **What a visit looks like:** a 45–60 min timeline (check in → owner signs consent → profile set up on their phone → photos → verification → done).
5. **Who it's for:** students, parents, gig workers. Flexible, no quotas, no experience needed.
6. **Trust and safety:**
   - every business agreed to the visit in advance;
   - daytime appointments;
   - identity-verified agents;
   - you never handle anyone's password;
   - independent contractor agreement;
   - real support;
   - the "not affiliated with Google" line.
7. **FAQ:**
   - When do I get paid?
   - Do I need a car?
   - Is this legit?
   - How do taxes work (1099)?
   - What if the owner isn't there?
   - Why 18+?
8. **Final CTA and footer,** with company legal name and address placeholders, terms, privacy and contact.

### 2. Mobile web app (installable PWA), key screens

1. **Apply:** multi-step form with a progress bar (name, email, phone, date of birth, ZIP, travel radius, car yes/no, availability), plus an SMS code verification screen.
2. **Training ("Academy"):** 5 short video modules with progress, then a quiz screen, then a "You're certified" moment that is celebratory but understated.
3. **Get paid setup:** contractor agreement and a hand-off to Stripe, explained simply.
4. **Missions:**
   - a map/list toggle;
   - mission cards showing trade, city, distance, time slot and earnings breakdown;
   - a "Bonus" tag for urgent missions.
5. **Mission detail:** what to expect, a payout breakdown, an "Accept mission" button, and the cancellation rule (up to 24 h before).
6. **Visit checklist:**
   - a 7-step guided flow with large touch targets: check-in, consent signature, profile setup, manager invite, photos grid (10 minimum, with categories), verification, check-out;
   - a visible offline/sync indicator;
   - "Submit" appears only when every step is complete.
7. **Mission tracker:** the 3 payout steps as a progress line (Visit validated ✓ → Profile live ⏳ → Became customer ⏳).
8. **Earnings:** payable balance, a "Next payout: Friday" card, payout history, and level progress ("2 more visits to Silver").

### 3. Mini design system

Color tokens (light and dark), type scale, spacing, and the components: buttons, inputs, stepper, mission card, map pin, payout-step indicator, badge/level chip, toast, empty states.

## Output

Start with the landing page (mobile, then desktop), then the 8 app screens, then the design system. Prioritize clarity and trust over decoration: someone should understand what they'd do, how much they'd earn, and when they'd be paid within 10 seconds.
