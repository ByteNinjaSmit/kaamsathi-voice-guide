# KaamSathi Voice Guide: Audit of the finished build (2026-10-30)

Auditor: independent review of the build against `PLAN.md` §15. No app file was modified.

## Verdict: SHIP AFTER FIXES

In demo mode the core story works end to end at 360 px in headless Chrome: Hindi chip to PPE, typed teach-back marked green, Odia Machine wrong tap twice, then a dashboard showing 203 sessions (+3 live), W-001 LIVE in retraining, and the anonymous urgent complaint. Content matches §5/§6 exactly (diff of 114 lines: 0 differences). Output escaping is correct everywhere I tested.

Five issues must be fixed before the demo:
- **One-request server crash.** A single `GET /%00` kills `node server.js`. This is critical on a public tunnel URL.
- **Dashboard can be blanked remotely.** Anyone who can reach the unauthenticated `/api/logs` can make the dashboard render nothing.
- **Demo-mode judge passes unsafe answers.** It marks negated or unsafe answers as "understood".
- **Stale answer on Home.** An old "did not understand" card keeps reappearing and being spoken on Home.
- **Heat table hides the worst cell.** Every cell at 50% or more gets the same colour, so "Machine x Odia is the darkest cell" is not visible.

Not verified: a real Gemini key, real voice on an Android phone, and phone HTTPS access.

### How this was verified
- Read every source file: `server.js`, `public/index.html`, `public/styles.css`, all of `public/js/*.js`, `README.md`, `package.json`.
- Ran `PORT=3200 node server.js` with no key and probed it with curl: health, `/api/ai`, bad JSON, large body, path traversal, null byte, `/api/logs` with hostile items.
- Drove headless Chrome 360x740 (mobile emulation) over CDP through every route and the §12 script. Hooked `speechSynthesis.speak` to see what would be spoken.
- Ran unit checks of `mockJudge`, `mockAsk`, `mockComplaint` and `compute()` (dashboard maths) under Node 22.
- Checked the Gemini models page: `gemini-3.5-flash-lite` is listed as Stable.
- Stopped the server afterwards.
- Did not open `start.ps1`.

## Checklist (PLAN.md §15)

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | File tree per §3, no deps, PORT\|\|3000 | PASS | `package.json:1` has no deps; `server.js:6`. Extra file `start.ps1` (holds the key; not served, see D16). |
| 2 | `/api/health` returns `{live,model}`, `live:false` without key | PASS | curl: `{"live":false,"model":"gemini-3.5-flash-lite"}` |
| 3 | Key read only in server; no secret or direct Google call in `public/` | PASS | Grep for `AIza\|api_key\|generativelanguage\|GEMINI` hits only `server.js:7,46,48` and README placeholders. Health output contains no key. |
| 4 | `/api/ai`: task whitelist, 600-char cap, §7.3 templates, mime + schema, timeout ≤7 s, `{ok:false}` | PASS | `server.js:17-40,44,77-80`. Prompt text matches §7.3. curl: evil task gives 400, bad JSON gives 400, no key gives 503. Caveat in D7: the server trusts `ruleEn`, `keyIdea` and `langName` sent by the client. |
| 5 | 4 topics + Shift + Complaint + Ask, no HR tile, hash routes | PASS | `app.js:92-100,129-134`. Observed 4 tiles + 2 wide tiles + FAB. |
| 6 | Gemini never writes topic bullets | PASS | `app.js:214-222` reads `TOPICS` only |
| 7 | All 5 languages for every key; verbatim vs §5 | PASS | Scripted diff PLAN §5/§6 vs `content.js`: 0 differences |
| 8 | Options shuffled; correctness tracked by original index | PASS | `app.js:240,299`. Order differed between two visits. |
| 9 | Shift date = today+1, no literal date | PASS | `app.js:326`. Rendered "शनिवार, 31 अक्टू॰" on 30 Oct. |
| 10 | `mockJudge` order short→dontKnow→red→core→confused; `norm` on both sides | PASS | `mock.js:11,34-38`. §13 #5 cases all correct. Accuracy gaps listed in D3. |
| 11 | Voice + typed + tap; typed and tap always visible | PASS | `app.js:245-253` |
| 12 | Live path validated, falls back, red/dontKnow override, `source` logged | UNVERIFIED | Code is correct (`ai.js:46-101`, override at `ai.js:79`) but was never run against Gemini |
| 13 | Every attempt logs §4 schema to `ks_logs_v1` | PASS | Observed keys `id,workerId,ruleId,lang,status,method,answer,source,ts` |
| 14 | `isSecureContext`; STT errors show `noMic` and disable the mic for that language | PASS | `speech.js:57,89`. Headless run showed the noMic toast and a disabled mic. |
| 15 | TTS one utterance per sentence, voice by language, noVoice badge, cancel on route change and before listen | PASS | `speech.js:40-50`. Hook showed Hindi split per sentence with a hi-IN voice. Odia and Bengali (no voice) showed the badge and spoke nothing. `app.js:82`, `speech.js:68`. Edge case in D9. |
| 16 | Seed numbers: 200 sessions, 61 confused, MACHINE 44%, Odia 57.5% | PASS | Dashboard showed 200 / 70% / 30%, Machine 44% (22/50), Odia 57.5% (23/40) |
| 17 | Merge rule steps 1-5; retraining = confused ≥2 and latest confused | PASS | `dashboard.js:15-45`. Unit test: c,c → listed; c,c,u → removed; c,u,c → listed. Minor issue in D17. |
| 18 | Updates without reload; Reset clears only live data | PASS | 2 s poll seen after reset (back to 200; server logs 0). `storage` listener at `dashboard.js:116`. |
| 19 | Complaints: category, urgent marker, Anonymous, seeds | PASS | Hide ON gives Anonymous, OFF gives W-001. Hindi "ओवरटाइम का पैसा नहीं मिला" is tagged Pay. URGENT marker shown. 3 seeds present. |
| 20 | Base font ≥20 px, buttons ≥64 px, contrast, no h-scroll at 360, 🔊 on all spoken text | FAIL | No h-scroll (scrollWidth 360 on all routes), 🔊 present everywhere. But body is **19 px** at ≤360 px (`styles.css:109`), several texts are 18 px, and the mode badge is a 95x26 button (`styles.css:23`). |
| 21 | Mode badge shows demo / live / offline | UNVERIFIED | Demo mode was seen. Live and offline were not run; offline toast text is wrong (D6). |
| 22 | §12 script end to end; §13 ★ items | UNVERIFIED | Mock flow passes in headless 360 px. Real phone, real voice and the HTTPS route were not tested. "Darkest cell" claim fails visually (D5). |

**Totals: 18 PASS, 1 FAIL, 3 UNVERIFIED.**

## Defects, ranked

| ID | Sev | Where | Problem (verified unless stated) | Fix |
|---|---|---|---|---|
| D1 | **Critical** | `server.js:103-105` | `GET /index.html%00` makes `fs.readFile` throw synchronously inside the async handler. The rejection is unhandled and **the process exits** (seen: `ERR_INVALID_ARG_VALUE`, exit 1). One request from any scanner on a tunnel URL ends the demo. | Before `path.join`: `if (pathname.includes('\0')) { res.writeHead(400); return res.end(); }`. Also add `.catch(()=>{ if(!res.headersSent){res.writeHead(500);} res.end(); })` around the handler body, and `process.on('unhandledRejection', e => console.warn(e))` as a safety net. |
| D2 | High | `dashboard.js:8`, `server.js:85-91` | `/api/logs` takes any item with no validation and no auth. A teach-back item with `ruleId:"constructor"` (or `__proto__`) makes `TOPICS[id].en.title` throw. The dashboard renders **nothing**, Reset button included, until the server restarts or someone calls DELETE (seen). Anyone with the URL can also `DELETE /api/logs` or inject fake rows. | Server: accept only `ruleId∈TOPIC_ORDER`, `lang∈{hi,bn,or,ta,en}`, `status∈{understood,confused}`, `method∈{voice,typed,tap}`, numeric `ts`, strings ≤600. Client: `Object.hasOwn(TOPICS,id)` in `ruleEn`/`compute`, and wrap `html()` in try/catch. Optional: require a `?admin=` token for DELETE. |
| D3 | High | `content.js:51-82` (keyword lists), `mock.js:11` | Demo-mode judge marks unsafe or negated answers **understood**: "never switch it off", "मशीन बंद नहीं करनी", "no need for helmet near machine", "machine ke paas helmet pehnna zaroori nahi", "no gloves needed", "finish work then exit", "lift se exit", "लिफ्ट लेकर बाहर". Latin substrings also give false hits: "offer" and "I will not stop, I clean it while running" are judged understood. A judge who types a trick answer sees green. | Use word-boundary matching for ASCII keywords (`new RegExp('\\b'+kw+'\\b')`). Add red phrases: `never switch`, `not switch`, `no need`, `not needed`, `not necessary`, `zaroori nahi`, `ज़रूरी नहीं`, `बंद नहीं`, `no glove`, `without glove`, `then exit`, `lift se`, `लिफ्ट ले`, `লিফট নি`, `ଲିଫ୍ଟ ନେ`, `லிஃப்ட் எடு`. Re-run the §13 #5 cases afterwards. Live mode is unaffected because the override only forces "confused". |
| D4 | Medium | `app.js:123,144,181` | `homeAnswer` (OTHER intent) is never cleared. Every later return to Home shows the card again and speaks "Sorry, I did not understand…" again (seen after topic → home). | In `screenHome`: `const ans = homeAnswer; homeAnswer = null;` and use `ans` for the card and speech. |
| D5 | Medium (demo) | `dashboard.js:11` | Every cell at 50% or more gets the same `#FFCDD2`. Odia Fire 60%, Odia Chemical 50%, Odia Machine 83% (after demo) and Tamil Machine 50% look identical, so §12's "Machine x Odia is the darkest cell" is not visible. | Add a step: `p>=70 ? '#EF9A9A'`, and bold or outline the maximum cell. |
| D6 | Medium | `ai.js:56-57`, `app.js:46` | One transient Gemini error (cold start over 7 s, a 429) turns live mode off for the whole session, with no recovery except a reload. The badge-toggle toast says "Live AI" while the badge says "AI offline". (Code review, not run.) | Clear `state.offline` after 60 s or when the badge is tapped. Toast should use the same text as the badge. |
| D7 | Medium | `server.js:20,28` | The server builds prompts from client-supplied `ruleEn`, `questionEn`, `keyIdea` and `langName`. That breaks the plan's "templates server-side, not an open relay" rule (A5): prompt injection is possible, and the complaint task becomes a free translation relay. No rate limit on a public tunnel. | Keep a server-side `RULES[ruleId]` table with `ruleEn`/`questionEn`/`keyIdea`, and map `lang` code to name. Reject unknown values. Add a simple per-IP limit (for example 30 per minute). |
| D8 | Low | `styles.css:109,23,37,56,16,26,76,80` | Body is 19 px at ≤360 px. `.sec`, `.chip`, `.link`, `.novoice`, `.pill` and the toast are 18 px. The badge button is 26 px tall. All are below the plan's 20 px / 64 px rules. | Remove the `@media (max-width:360px)` font rule. Raise those texts to ≥20 px. Badge is a supervisor control: either accept it or give it `min-height:44px`. |
| D9 | Low (unverified on phone) | `app.js:34`, `speech.js:39-46` | `say()` stays silent only when the voice list is **non-empty** and has no match. On Android the first `getVoices()` is often `[]`, so Odia text is queued with no voice and the default engine (Hindi or English) may read it badly. This breaks "never speak Odia with a Hindi voice". | If voices are empty, wait for `voiceschanged` (up to 1 s) before deciding. Or, for `or`, speak only when `hasVoice('or')` is true. |
| D10 | Low | `server.js:62-68` | A body over 20 000 characters gets a destroyed socket (curl: empty reply, exit 52), not a 400/413. Buffers are joined as strings, so a multi-byte Indic character split across chunks can be corrupted. | Collect `Buffer`s, `Buffer.concat(...).toString('utf8')`. On overflow send 413 and then `req.destroy()`. |
| D11 | Low (a11y) | `app.js:196,316,377` | Any STT error, including `no-speech` and `network`, shows "Mic not available" for 3.5 s as text only. That is misleading, and a low-literacy user may not read it. | For `no-speech`, show and speak a "Did not hear you, try again" message (a new UI key, or reuse `UI.tryAgain`). Keep the message visible near the mic instead of a short-lived toast. |
| D12 | Low | `app.js:220` | The answer banner is labelled with `UI.ask` ("पूछें:" / "Ask:") before the answer. | Use an icon label (💬) or add an `answer` UI key. |
| D13 | Low | `mock.js:45` | Complaint keywords miss inflections: "my friend got injured" is tagged Other and **not urgent**. | Add `injur`, `accident`, `burn`, `fire`, `घायल`, `दुर्घटना`. |
| D14 | Low (a11y) | `app.js:108,132` | The language-screen prompt is English only. "Change language / भाषा बदलें" is in English and Hindi only, so Bengali, Odia and Tamil users get no cue in their language. | Show all five `UI.chooseLang` strings (or an icon such as 🌐), and add a 🌐 icon to the Change-language link. |
| D15 | Low (unverified) | `content.js:43` | 🪖 (Unicode 13) is likely to show as a tofu box on Android 10 or older budget phones. That is the main cue for low-literacy users. | Use ⛑️ (U+26D1), which is widely supported. |
| D16 | Low (ops) | `start.ps1` | The key file sits in the app folder. Verified it is **not served**: the static root is `public/`, and `/..%5cstart.ps1` / `%2e%2e%2fstart.ps1` return 403. It would leak if the folder is zipped, shared or committed. | Move it out of the folder (or add a `.gitignore`), and rotate the key after the event. |
| D17 | Low | `dashboard.js:19,44` | A log with an unknown `lang` or `ruleId` is counted in "+N live" but not in Sessions, so the numbers can disagree. | Count only logs that were added to a cell (fixed together with D2). |
| D18 | Low | `app.js:371,391` | Speaking a complaint overwrites text already typed. If the user navigates away during submit, the complaint is silently lost. | Append the transcript to the existing text. Log the complaint before the `my !== token` check. |

### Checked and OK (no defect)
- **XSS:** typed answers, complaint text and hostile `/api/logs` items (`<img onerror>`, `<script>`, `"><svg onload>`) all render as text. No dialogs fired and no injected elements appeared (`esc()` at `app.js:21`, `dashboard.js:5`; transcripts use `textContent`).
- **Path traversal:** `%2e%2e`, `%2f` and `%5c` variants return 403 or 404. A malformed `%E0%A4%A` returns 400.
- **Bad input:** bad JSON, `null` and arrays return 400; GET `/api/ai` returns 404.
- **Gemini request:** endpoint, `x-goog-api-key` header, `systemInstruction`, `responseMimeType` + `responseSchema` (OBJECT/STRING/BOOLEAN with enums), no `maxOutputTokens`, 7 s server and 8 s client timeouts, 502 on any parse or HTTP error.
- **Model default:** `gemini-3.5-flash-lite` is listed as Stable on ai.google.dev/gemini-api/docs/models (checked today). No live call was made.
- **Demo-mode ask routing:** all 10 chips (5 languages) route correctly. "fire alarm" goes to FIRE; gibberish shows the not-understood card.
- **Dashboard maths:** 139/200 shows 70%; Confused is shown as 100 − 70 = 30%, by design. Rule and language bars use one decimal.

## Fix these 5 first (before the demo)
1. **D1:** null-byte guard plus an unhandled-rejection safety net in `server.js`. This is a one-line crash fix.
2. **D2:** validate `/api/logs` items on the server and use `Object.hasOwn(TOPICS, id)` on the dashboard. Or don't expose `/api/logs` on a public tunnel.
3. **D3:** add negation and lift red flags and word-boundary matching for English keywords in the demo judge, so a judge's trick answer turns red.
4. **D4:** clear `homeAnswer` after it is shown once.
5. **D5 + rehearsal:** add a darker heat step so Machine x Odia stands out. Then run §12 once on the real phone over the chosen HTTPS route, checking hi-IN voice in and out, the Odia no-voice badge, and the live-key fallback (items 12, 21 and 22 are still UNVERIFIED).
