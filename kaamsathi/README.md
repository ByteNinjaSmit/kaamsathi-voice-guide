# KaamSathi Voice Guide (hackathon prototype)

Factories keep proof of *notice*. KaamSathi produces proof of *understanding*: a worker hears a safety rule in their own language, explains it back (voice, typing or tap), and supervisors see where explanations fail.

No dependencies, no build step. Needs Node 18+.

## Start

Windows (PowerShell):

```powershell
cd D:\Lab\TCS_Ai_hackathon\kaamsathi
node server.js
```

Open http://localhost:3000. The badge shows **Demo mode** (no key needed, everything works offline with a keyword "AI").
The supervisor dashboard is at http://localhost:3000/#/dashboard (or the link on the language screen).

## Optional: live Gemini

The key stays on the server and is never sent to the browser.

```powershell
$env:GEMINI_API_KEY="your-key"
$env:GEMINI_MODEL="gemini-3.5-flash-lite"   # optional, this is the default; change it if your key uses another model
node server.js
```

The console prints `mode: live (model)`. The badge turns **Live AI**. If Gemini fails or times out (8 s) the app falls back to demo mode and the badge shows **AI offline**. Tap the badge on the language screen (or open `/?mock=1`) to force demo mode.

Gemini is used only to answer free questions, judge teach-back answers and summarise complaints. Safety text is fixed in `public/js/content.js`.

## Open it on a phone

The microphone (speech recognition) needs HTTPS or `localhost`. Typing and tap answers always work. Pick the first option that works:

1. USB: `adb reverse tcp:3000 tcp:3000`, then open `http://localhost:3000` in the phone's Chrome.
2. Tunnel: `npx localtunnel --port 3000` or `ssh -R 80:localhost:3000 nokey@localhost.run`, then open the HTTPS URL.
3. Static HTTPS, demo mode only: drag the `public/` folder onto https://app.netlify.com/drop.
4. On the phone open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://<laptop-ip>:3000`, relaunch Chrome.

Fallback: laptop Chrome DevTools device mode (mobile view); the mic works on localhost.

Voice notes: Hindi and English voice in and out is the target. Odia (and sometimes other languages) may have no voice on the phone; the app then shows a yellow "no voice" badge, stays silent for that language and keeps working as text and tap.

## Demo script (about 80 s)

1. "Factories keep proof a rule was announced. KaamSathi proves it was understood, in the worker's own language."
2. Phone: tap **हिन्दी**. The welcome is spoken.
3. Tap the mic and say "हेलमेट कब पहनना ज़रूरी है?" (or tap the chip). The PPE page opens and speaks in Hindi.
4. Tap **अब आप बताइए**. Say "मशीन के पास हमेशा हेलमेट पहनना है". Green tick, Hindi praise.
5. Home, change language, **ଓଡ଼ିଆ**, Machine guard, ଏବେ ଆପଣ କୁହନ୍ତୁ, tap **ଚାଲୁଥିବା ମେସିନ ସଫା କରନ୍ତୁ**: red warning and "listen again". Tap the wrong answer once more (Try again) so W-001 reaches retraining. If the "no voice" badge shows: "it still works as text and tap."
6. Open the dashboard: Sessions 200 -> 203 (+3 live), Latest activity lists the Hindi tick and two Odia warnings, Machine guard x Odia is the darkest cell, W-001 is in Needs retraining with LIVE, and the complaints list shows an urgent anonymous women's facilities issue. "Supervisors now see where their explanations fail, by rule and by language."

"Reset demo data" on the dashboard clears live data only (the seeded 200 sessions stay).

## Files

`server.js` (static server, `/api/health`, `/api/ai`, `/api/logs`), `public/index.html`, `public/styles.css`, `public/js/` (`content.js`, `speech.js`, `mock.js`, `ai.js`, `store.js`, `app.js`, `dashboard.js`). Full spec: `PLAN.md`.

## Fixes applied (after AUDIT.md)

- D1 `server.js`: null bytes in the URL return 400; the request handler is wrapped so any error returns 500; `unhandledRejection` and `uncaughtException` are logged instead of ending the process. `GET /%00` and `/%zz` no longer crash the server.
- D2 `server.js`: `/api/logs` accepts only whitelisted `ruleId`, `lang`, `status`, `method`, `source`, `category`, numeric `ts`, safe `id`, and length-capped strings. Only known fields are stored. `public/js/dashboard.js` uses `Object.hasOwn` for rule and language lookups, ignores invalid logs (also fixes D17), and catches render errors.
- Logs protection without a login: cross-origin POSTs are refused, POSTs are rate limited (120 per minute per client), `/api/ai` is limited to 60 per minute. `DELETE /api/logs` (dashboard Reset) works directly on `localhost`; through a tunnel, LAN address or any forwarded request it needs the admin token printed in the server console (or `ADMIN_TOKEN` env var), which the dashboard asks for. Remaining risk: anyone with the URL can still post well-formed fake rows inside the rate limit.
- D10 `server.js`: request bodies are read as Buffers (limit 20000 bytes) and oversized bodies get 413 instead of a dead socket.
- D3 `public/js/mock.js`: the demo judge matches English keywords as whole words ("offer" no longer matches "off"), treats negation ("never", "no", "nahi", "नहीं", "না", "ନାହିଁ", "வேண்டாம்" and others) as unsafe unless it is a legitimate prohibition about the lift, the guard or removing something, and adds unsafe phrases (no need, lift se, then exit, no gloves, while running and others). Order is still short, don't know, unsafe, core, confused. `content.js` is unchanged.
- D4 `public/js/app.js`: the Home answer card is shown and spoken once.
- D5 `public/js/dashboard.js`: new darker heat colour for cells at 70% or more.
- D8 `public/styles.css`: removed the 19 px rule at 360 px; worker-facing text raised to 20 px (supervisor badge and dashboard tables stay smaller).
- Not fixed: D6, D7, D9, D11 to D16, D18, and the live Gemini, real phone and HTTPS checks.

## Polish pass (layout)

- `public/styles.css`, `public/js/app.js`: Tamil Home no longer scrolls sideways (grid columns `minmax(0,1fr)`, tile text wraps, 17 px tile text under 400 px). The Ask mic is now a full-width button under the greeting instead of a floating button, so it never covers tiles. Disabled-mic emoji fits its circle. The mode badge scrolls with the page. The topic answer banner uses a 💬 icon instead of the "Ask:" label.
- `public/js/dashboard.js`, `public/styles.css`: at 640 px and below the retraining, complaints and latest-activity tables become stacked cards, and the heat table is fitted to the screen. A caption states that the 200 seeded sessions and 3 seeded complaints are simulated sample data.
