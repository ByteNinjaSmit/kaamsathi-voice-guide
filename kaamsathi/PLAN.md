# KaamSathi Voice Guide: Implementation Plan (v1, 2026-10-30)

Audience: the implementing agent. Build exactly this. If something is unclear, choose the simpler option and note it in the "Deviations" line at the end of this file.
Source docs: `../KaamSathi_Voice_Guide_BuildPlan.md` (platform plan) and `../hackathon_notes.md`.
Core story: factories keep **proof of notice**; KaamSathi produces **proof of understanding** (teach-back) and shows supervisors where explanations fail.

---

## 0. Audit of the platform build plan

| # | Defect / risk in build plan | Evidence | Decision in this plan |
|---|---|---|---|
| A1 | Says "7 total" features; notes list 5 MVP items. Home lists an "HR Info / Policies" tile with no content, and "3-4 tiles" while listing 7. | BuildPlan §4 note, §5.2 | 4 safety tiles + Shift + Complaint. HR Info tile **out**. Leave balance shown on Shift screen. |
| A2 | Mic and SpeechRecognition need a **secure context** (HTTPS or `localhost`). Opening `http://192.168.x.x:3000` on the phone will block the mic. The plan never mentions this. | MDN / spec: secure context required ([spec](https://wicg.github.io/speech-api)) | §9 gives 4 HTTPS/localhost routes to the phone. Typed + tap fallbacks always present. |
| A3 | Assumes voice in/out in all 5 languages. Odia TTS is very likely **missing** in Google TTS on Android, and Odia STT is unverified. Chrome Android SpeechRecognition is only "partial" support and Chrome-only (`webkitSpeechRecognition`). | [MIT App Inventor thread: Odia not in Google/Android TTS](https://community.appinventor.mit.edu/t/how-to-speak-more-languages-from-text-to-speech/28763/5); [caniuse: Chrome Android partial](https://caniuse.com/web-speech) | Voice is progressive: speak if a voice exists, else show a "no voice" badge + text. STT tried per language; on error -> typed box + tap options. Success bar = voice in/out for **hi + en** (BuildPlan §7 already says this). |
| A4 | "Use Gemini for ... text-to-speech", `/api/tts`, `/api/stt`. Gemini TTS returns raw PCM that must be wrapped in WAV; audio upload STT needs MediaRecorder + base64. Not doable in 50 min alongside everything else. | [Gemini models page lists separate `*-tts` models](https://ai.google.dev/gemini-api/docs/models) | **Out.** Browser SpeechSynthesis + Web Speech recognition only. Gemini is used for text tasks only. |
| A5 | Frontend-only option would put the Gemini key in client JS. | BuildPlan §6.1 "whichever the tool defaults to" | Key lives only in server env var `GEMINI_API_KEY`. Zero-dependency `server.js` proxy. Prompts are built **server-side** from fixed templates so the proxy is not an open relay. |
| A6 | Topic page "calls Gemini to generate simple spoken explanation" every time. That adds latency, gives a different answer each time, and puts unreviewed safety text in front of workers. | BuildPlan §5.3 | Safety content is **curated and fixed** (§5). Gemini only answers free questions, judges teach-back and summarises complaints. |
| A7 | Teach-back: no mock strategy, no handling of STT errors, English ground truth only, no "unsafe answer" rule, and no way to guarantee a demo of both outcomes. | BuildPlan §5.4, §6.3.2 | Deterministic mock judge (keyword core + red flags + "don't know"), a key idea per topic for Gemini, and **tap-to-answer options** (1 right, 2 wrong) that always work. |
| A8 | Dashboard example rates contradict each other: by-rule mean 36% confused vs by-language mean 27% can't come from one dataset with equal weights. No rule for merging seed and live data. | BuildPlan §5.7 | One seed **matrix** (rule x language counts) with live logs added cell by cell (§6). |
| A9 | Live data in "in-memory arrays" won't reach a dashboard in another tab or on another device. | BuildPlan §6.2 | localStorage (same browser, `storage` event + 2 s poll). P1: server log store so a laptop dashboard sees phone activity. |
| A10 | Path routes (`/topic/:id`, `/dashboard`) need server rewrites on static hosts. | BuildPlan §6.1 | Hash routes (`#/topic/PPE`). |
| A11 | Shift date hardcoded `2026-10-31` while the text says "Kal" (tomorrow). That is wrong on any other day. | BuildPlan §5.5 | Date = today + 1, computed at runtime. |
| A12 | Examples are romanised ("Mera agla shift kab hai"). `hi-IN` STT returns Devanagari, so romanised keywords alone would never match. | BuildPlan §5.2, §5.5 | Keyword lists include native script + English + romanised. Text is normalised (§7.2). |
| A13 | 30-45 s spoken explanations. Long utterances can stop early in Chrome and lose the listener. | BuildPlan §5.3 | Max 2 short bullets per topic. One utterance per sentence. |
| A14 | Flags as language buttons don't work: Indian languages have no flags. Women and night-shift workers fear reprisal, and the plan has no anonymity. | BuildPlan §5.1; notes "Women workers" | Script-labelled buttons. "Hide my name" toggle on complaints (default ON). |
| A15 | Model IDs are not specified. Legacy 2.5 models are restricted for new projects. | [models page](https://ai.google.dev/gemini-api/docs/models): stable `gemini-3.5-flash-lite`, `gemini-3.8-flash`; 2.5 "limited to users who used them in the past" | Default `GEMINI_MODEL=gemini-3.5-flash-lite`, overridable by env. |

Verified API facts used below:
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent`, header `x-goog-api-key: <key>`; JSON output via `generationConfig.responseMimeType="application/json"` + `generationConfig.responseSchema` ([API ref](https://ai.google.dev/api/generate-content), [REST index](https://ai.google.dev/api/rest)). The newer Interactions API exists but is not needed.
- If the platform requires free Indian-language voice later: AI4Bharat Indic-TTS / Indic Parler-TTS (Odia included, self-host, Apache 2.0) ([Indic Parler](https://aiindigo.com/tool/indic-parler-tts), [AI4Bharat](https://wsai.iitm.ac.in/research/ai4bharat/)). This is **out of scope** for this build; mention it only in the pitch as "next step".

---

## 1. Scope

**IN (P0, must work in mock mode with no key):**
1. Language picker: hi, bn, or, ta, en (script buttons).
2. Home: 4 safety tiles (PPE, Fire Exit, Machine Guard, Chemicals) + Shift + Complaint + Ask mic button.
3. Topic screen: big icon, title, 2 bullets, auto-speak, per-bullet speaker, "Now you tell me".
4. Teach-back: 1 spoken question per topic. Answer by voice, typing or tapping 1 of 3 options. Result green/red with spoken feedback. Logged.
5. Ask: voice/typed question -> intent -> route (topic / shift / complaint / answer card). 2 sample-question chips per language.
6. Shift lookup (mock worker W-001) with leave balance.
7. Voice complaint: speak or type, "Hide my name", summary + category for HR.
8. Supervisor dashboard `#/dashboard` (English): KPIs, confusion by rule, by language, rule x language heat table, retraining list, complaints, latest live activity, reset button.
9. Mode badge: "Demo mode" vs "Live AI (Gemini)". Live is used only if the server has a key; any live failure falls back to mock silently, with a badge change.

**P1 (only if P0 done by minute 44):** server-side log store so a dashboard on the laptop updates from the phone (§6.4).

**OUT:** login, HR Info tile, Gemini TTS/STT, MediaRecorder upload, QR posters, real HR integration, PWA/offline cache, frameworks, npm dependencies, build step, charts library.

---

## 2. Architecture

- **Static SPA**: plain HTML/CSS + ES modules in `public/`, no build. Hash router.
- **`server.js`**: Node >= 18, **zero dependencies** (`http`, `fs`, `path`, global `fetch`). Serves `public/`, `GET /api/health`, `POST /api/ai`, (P1) `GET/POST/DELETE /api/logs`.
- **Mode switch** (`ai.js`): on load `GET /api/health` -> `{live:boolean, model:string}`. `mode = live && !forceMock ? 'live' : 'mock'`. `forceMock` = URL `?mock=1` or localStorage `ks_forceMock==='1'` (toggle by tapping the mode badge on the language screen). If `/api/health` fails (static hosting) -> mock.
- **Every AI call**: live -> `fetch('/api/ai', 8000 ms AbortController)` -> validate shape -> else mock result. Result carries `source:'gemini'|'mock'`. On a live failure set badge "AI offline - demo mode" for the session.
- **Speech**: browser only (§8).
- **State**: localStorage keys `ks_lang`, `ks_logs_v1` (teach-back array), `ks_complaints_v1`, `ks_forceMock`. Worker is fixed: `W-001` / "Ravi".

## 3. Files

```
kaamsathi/
  PLAN.md
  package.json          {"name":"kaamsathi","private":true,"scripts":{"start":"node server.js"}}  (no deps)
  server.js             static server + /api/health + /api/ai (+ /api/logs P1), PORT env default 3000
  public/
    index.html          <div id="app">, <div id="toast">, module script js/app.js, <html lang="en">, viewport meta
    styles.css
    js/content.js       ALL text: LANGS, UI, TOPICS, INTENT_KW, DONT_KNOW, SHIFT, SEED_*  (copy §5/§6 verbatim)
    js/speech.js        speak(), stopSpeak(), hasVoice(), listen(), sttSupported()
    js/mock.js          mockAsk(), mockJudge(), mockComplaint(), norm()
    js/ai.js            initMode(), getMode(), ask(), judge(), complaint()
    js/store.js         addTeachback(), addComplaint(), getLive(), resetLive(), (P1) server sync
    js/app.js           router + worker screens
    js/dashboard.js     renderDashboard(el)
```

## 4. Data schemas

```js
// teach-back log (store.js)
{ id:'tb_'+Date.now(), workerId:'W-001', ruleId:'PPE'|'FIRE'|'MACHINE'|'CHEMICAL',
  lang:'hi'|'bn'|'or'|'ta'|'en', status:'understood'|'confused',
  method:'voice'|'typed'|'tap', answer:string, source:'gemini'|'mock', ts:number }
// complaint
{ id:'c_'+Date.now(), workerId:'W-001'|'Anonymous', lang, originalText, translatedText,
  summaryEn, category:'Pay'|'Safety'|'Harassment'|'Facilities'|'Shift'|'Other', urgent:boolean,
  source, ts, seed?:true }
// POST /api/ai request bodies (all strings capped at 600 chars server-side)
{ task:'ask',       lang, langName, question }
{ task:'teachback', lang, langName, ruleEn, questionEn, keyIdea, answer }
{ task:'complaint', lang, langName, text }
// /api/ai response: 200 {ok:true, data:<schema object>} | 4xx/5xx {ok:false, error}
```

---

## 5. Content (copy into `public/js/content.js` verbatim, then `export` each const)

```js
export const LANGS = [
  { code:'hi', label:'हिन्दी', en:'Hindi',   bcp:'hi-IN' },
  { code:'bn', label:'বাংলা',  en:'Bengali', bcp:'bn-IN' },
  { code:'or', label:'ଓଡ଼ିଆ',  en:'Odia',    bcp:'or-IN' },
  { code:'ta', label:'தமிழ்',  en:'Tamil',   bcp:'ta-IN' },
  { code:'en', label:'English', en:'English', bcp:'en-IN' },
];

export const UI = {
 chooseLang:{en:'Choose your language',hi:'अपनी भाषा चुनें',bn:'আপনার ভাষা বেছে নিন',or:'ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ',ta:'உங்கள் மொழியைத் தேர்ந்தெடுங்கள்'},
 welcome:{en:'Hello. Tap a picture, or press the mic and ask.',hi:'नमस्ते। तस्वीर दबाएँ या माइक दबाकर पूछें।',bn:'নমস্কার। ছবিতে চাপুন বা মাইক চেপে প্রশ্ন করুন।',or:'ନମସ୍କାର। ଛବି ଦବାନ୍ତୁ କିମ୍ବା ମାଇକ ଦବାଇ ପଚାରନ୍ତୁ।',ta:'வணக்கம். படத்தைத் தொடுங்கள் அல்லது மைக்கை அழுத்தி கேளுங்கள்.'},
 safety:{en:'Safety rules',hi:'सुरक्षा नियम',bn:'সুরক্ষার নিয়ম',or:'ସୁରକ୍ଷା ନିୟମ',ta:'பாதுகாப்பு விதிகள்'},
 shift:{en:'My shift',hi:'मेरी शिफ्ट',bn:'আমার শিফট',or:'ମୋ ସିଫ୍ଟ',ta:'என் ஷிஃப்ட்'},
 complaint:{en:'Complaint',hi:'शिकायत',bn:'অভিযোগ',or:'ଅଭିଯୋଗ',ta:'புகார்'},
 ask:{en:'Ask',hi:'पूछें',bn:'জিজ্ঞেস করুন',or:'ପଚାରନ୍ତୁ',ta:'கேள்வி கேளுங்கள்'},
 speak:{en:'Speak',hi:'बोलिए',bn:'বলুন',or:'କୁହନ୍ତୁ',ta:'பேசுங்கள்'},
 listening:{en:'Listening…',hi:'सुन रहे हैं…',bn:'শুনছি…',or:'ଶୁଣୁଛି…',ta:'கேட்கிறேன்…'},
 typeHere:{en:'Or type here',hi:'या यहाँ लिखें',bn:'অথবা এখানে লিখুন',or:'କିମ୍ବା ଏଠାରେ ଲେଖନ୍ତୁ',ta:'அல்லது இங்கே எழுதுங்கள்'},
 send:{en:'Send',hi:'भेजें',bn:'পাঠান',or:'ପଠାନ୍ତୁ',ta:'அனுப்பு'},
 listen:{en:'Listen',hi:'सुनें',bn:'শুনুন',or:'ଶୁଣନ୍ତୁ',ta:'ஒலியைக் கேளுங்கள்'},
 nowYou:{en:'Now you tell me',hi:'अब आप बताइए',bn:'এবার আপনি বলুন',or:'ଏବେ ଆପଣ କୁହନ୍ତୁ',ta:'இப்போது நீங்கள் சொல்லுங்கள்'},
 ownWords:{en:'In your own words:',hi:'अपने शब्दों में बताइए:',bn:'নিজের ভাষায় বলুন:',or:'ନିଜ ଭାଷାରେ କୁହନ୍ତୁ:',ta:'உங்கள் வார்த்தைகளில் சொல்லுங்கள்:'},
 orTap:{en:'Or tap the right answer',hi:'या सही जवाब दबाएँ',bn:'অথবা সঠিক উত্তরে চাপুন',or:'କିମ୍ବା ଠିକ ଉତ୍ତର ଦବାନ୍ତୁ',ta:'அல்லது சரியான பதிலைத் தொடுங்கள்'},
 checking:{en:'Checking…',hi:'जाँच रहे हैं…',bn:'দেখছি…',or:'ଯାଞ୍ଚ କରୁଛି…',ta:'சரிபார்க்கிறேன்…'},
 understood:{en:'You understood. Well done!',hi:'आप समझ गए। बहुत अच्छा!',bn:'আপনি বুঝেছেন। খুব ভালো!',or:'ଆପଣ ବୁଝିଗଲେ। ବହୁତ ଭଲ!',ta:'நீங்கள் புரிந்துகொண்டீர்கள். மிக நன்று!'},
 confused:{en:'Not clear yet. Let us listen again.',hi:'अभी साफ़ नहीं हुआ। चलिए फिर से सुनते हैं।',bn:'এখনও পরিষ্কার হয়নি। চলুন আবার শুনি।',or:'ଏବେ ବି ସ୍ପଷ୍ଟ ହୋଇନି। ଚାଲନ୍ତୁ ପୁଣି ଶୁଣିବା।',ta:'இன்னும் தெளிவாகவில்லை. மீண்டும் கேட்போம்.'},
 replay:{en:'Listen again',hi:'फिर से सुनें',bn:'আবার শুনুন',or:'ପୁଣି ଶୁଣନ୍ତୁ',ta:'மீண்டும் கேளுங்கள்'},
 tryAgain:{en:'Try again',hi:'फिर से कोशिश करें',bn:'আবার চেষ্টা করুন',or:'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',ta:'மீண்டும் முயற்சி செய்யுங்கள்'},
 home:{en:'Home',hi:'होम',bn:'হোম',or:'ମୂଳ ପୃଷ୍ଠା',ta:'முகப்பு'},
 youSaid:{en:'You said:',hi:'आपने कहा:',bn:'আপনি বললেন:',or:'ଆପଣ କହିଲେ:',ta:'நீங்கள் சொன்னது:'},
 notUnderstood:{en:'Sorry, I did not understand. Tap a picture.',hi:'माफ़ कीजिए, समझ नहीं आया। कोई तस्वीर दबाएँ।',bn:'দুঃখিত, বুঝতে পারিনি। একটি ছবিতে চাপুন।',or:'କ୍ଷମା କରନ୍ତୁ, ବୁଝିପାରିଲି ନାହିଁ। ଗୋଟିଏ ଛବି ଦବାନ୍ତୁ।',ta:'மன்னிக்கவும், புரியவில்லை. ஒரு படத்தைத் தொடுங்கள்.'},
 complaintPrompt:{en:'Tell us your problem. Speak or type.',hi:'अपनी परेशानी या शिकायत बोलकर बताइए।',bn:'আপনার সমস্যা বা অভিযোগ বলে জানান।',or:'ଆପଣଙ୍କ ଅସୁବିଧା ବା ଅଭିଯୋଗ କହି ଜଣାନ୍ତୁ।',ta:'உங்கள் பிரச்சனை அல்லது புகாரைச் சொல்லுங்கள்.'},
 hideName:{en:'Hide my name',hi:'मेरा नाम छुपाएँ',bn:'আমার নাম গোপন রাখুন',or:'ମୋ ନାମ ଲୁଚାନ୍ତୁ',ta:'என் பெயரை மறைக்கவும்'},
 submit:{en:'Submit',hi:'जमा करें',bn:'জমা দিন',or:'ଦାଖଲ କରନ୍ତୁ',ta:'சமர்ப்பி'},
 thanks:{en:'Thank you. Your complaint is recorded.',hi:'शुक्रिया, आपकी शिकायत दर्ज हो गई है।',bn:'ধন্যবাদ, আপনার অভিযোগ নথিভুক্ত হয়েছে।',or:'ଧନ୍ୟବାଦ, ଆପଣଙ୍କ ଅଭିଯୋଗ ରେକର୍ଡ ହୋଇଛି।',ta:'நன்றி, உங்கள் புகார் பதிவு செய்யப்பட்டது.'},
 noVoice:{en:'No voice on this phone for this language. Please read the text.',hi:'इस फ़ोन में इस भाषा की आवाज़ नहीं है। कृपया लिखा हुआ पढ़ें।',bn:'এই ফোনে এই ভাষার আওয়াজ নেই। দয়া করে লেখাটি পড়ুন।',or:'ଏହି ଫୋନରେ ଏହି ଭାଷାର ସ୍ୱର ନାହିଁ। ଦୟାକରି ଲେଖା ପଢ଼ନ୍ତୁ।',ta:'இந்த மொழிக்கு இந்த போனில் குரல் இல்லை. எழுத்தைப் படியுங்கள்.'},
 noMic:{en:'Mic not available. Type or tap instead.',hi:'माइक नहीं चल रहा। लिखें या दबाएँ।',bn:'মাইক কাজ করছে না। লিখুন বা চাপুন।',or:'ମାଇକ କାମ କରୁନି। ଲେଖନ୍ତୁ କିମ୍ବା ଦବାନ୍ତୁ।',ta:'மைக் இயங்கவில்லை. எழுதுங்கள் அல்லது தொடுங்கள்.'},
 chips:{en:['When must I wear a helmet?','When is my next shift?'],hi:['हेलमेट कब पहनना ज़रूरी है?','मेरी अगली शिफ्ट कब है?'],bn:['হেলমেট কখন পরতে হবে?','আমার পরের শিফট কখন?'],or:['ହେଲମେଟ କେବେ ପିନ୍ଧିବି?','ମୋର ପରବର୍ତ୍ତୀ ସିଫ୍ଟ କେବେ?'],ta:['ஹெல்மெட் எப்போது அணிய வேண்டும்?','என் அடுத்த ஷிஃப்ட் எப்போது?']},
};

// Each topic: en = English ground truth for Gemini; per language: title, points[2], q, options[3] (index 0 is correct; SHUFFLE on render).
export const TOPICS = {
 PPE:{ icon:'🪖', color:'#B35C00', bg:'#FFF1D6',
  ruleEn:'Always wear a helmet near machines. Wear safety shoes on the shop floor.',
  questionEn:'When must you wear a helmet?', keyIdea:'Wear the helmet always / whenever near machines or on the shop floor.',
  en:{title:'Safety gear (PPE)',points:['Always wear a helmet near machines.','Wear safety shoes on the shop floor.'],q:'When must you wear a helmet?',options:['Always, near machines.','Only when the supervisor is watching.','Not needed if I am careful.']},
  hi:{title:'सुरक्षा सामान (PPE)',points:['मशीन के पास हमेशा हेलमेट पहनें।','काम की जगह पर सेफ्टी जूते पहनें।'],q:'हेलमेट कब पहनना ज़रूरी है?',options:['मशीन के पास, हमेशा।','सिर्फ़ जब सुपरवाइज़र देखे।','ध्यान रखूँ तो ज़रूरत नहीं।']},
  bn:{title:'সুরক্ষা সরঞ্জাম (PPE)',points:['মেশিনের কাছে সবসময় হেলমেট পরুন।','কাজের জায়গায় সেফটি জুতো পরুন।'],q:'হেলমেট কখন পরা জরুরি?',options:['মেশিনের কাছে, সবসময়।','শুধু সুপারভাইজার দেখলে।','সাবধান থাকলে দরকার নেই।']},
  or:{title:'ସୁରକ୍ଷା ସାମଗ୍ରୀ (PPE)',points:['ମେସିନ ପାଖରେ ସବୁବେଳେ ହେଲମେଟ ପିନ୍ଧନ୍ତୁ।','କାମ ଜାଗାରେ ସେଫ୍ଟି ଜୋତା ପିନ୍ଧନ୍ତୁ।'],q:'ହେଲମେଟ କେବେ ପିନ୍ଧିବା ଜରୁରୀ?',options:['ମେସିନ ପାଖରେ, ସବୁବେଳେ।','କେବଳ ସୁପରଭାଇଜର ଦେଖିଲେ।','ସାବଧାନ ରହିଲେ ଦରକାର ନାହିଁ।']},
  ta:{title:'பாதுகாப்பு உபகரணம் (PPE)',points:['இயந்திரம் அருகே எப்போதும் ஹெல்மெட் அணியுங்கள்.','வேலை இடத்தில் பாதுகாப்பு காலணி அணியுங்கள்.'],q:'ஹெல்மெட் எப்போது அணிய வேண்டும்?',options:['இயந்திரம் அருகே, எப்போதும்.','மேற்பார்வையாளர் பார்க்கும்போது மட்டும்.','கவனமாக இருந்தால் தேவையில்லை.']},
  core:['machine','always','floor','hamesha','मशीन','हमेशा','মেশিন','সবসময়','সব সময়','ମେସିନ','ସବୁବେଳେ','இயந்திர','எப்போதும்','மெஷின்'],
  red:['supervisor','not needed','सुपरवाइज़र','सुपरवाइजर','ज़रूरत नहीं','जरूरत नहीं','সুপারভাইজার','দরকার নেই','ସୁପରଭାଇଜର','ଦରକାର ନାହିଁ','மேற்பார்வையாளர்','தேவையில்லை'] },
 FIRE:{ icon:'🔥🚪', color:'#B3261E', bg:'#FDE4E1',
  ruleEn:'When the fire alarm rings, stop work and walk to the green EXIT sign. Do not use the lift. Never block the exit door.',
  questionEn:'What do you do when the fire alarm rings?', keyIdea:'Stop work and go out by the green EXIT sign / stairs (not the lift, not finishing work first).',
  en:{title:'Fire exit',points:['When the alarm rings, stop work and walk to the green EXIT sign.','Do not use the lift. Never block the exit door.'],q:'What do you do when the fire alarm rings?',options:['Stop work, walk to the green EXIT sign.','Finish my work first.','Take the lift down.']},
  hi:{title:'फायर एग्ज़िट',points:['अलार्म बजे तो काम रोकें, हरे EXIT निशान की ओर चलें।','लिफ्ट न लें। EXIT दरवाज़े के आगे सामान न रखें।'],q:'आग का अलार्म बजे तो क्या करेंगे?',options:['काम रोकें, हरे EXIT की ओर चलें।','पहले अपना काम पूरा करें।','लिफ्ट से नीचे जाएँ।']},
  bn:{title:'ফায়ার এক্সিট',points:['অ্যালার্ম বাজলে কাজ থামান, সবুজ EXIT চিহ্নের দিকে হাঁটুন।','লিফট নেবেন না। EXIT দরজার সামনে জিনিস রাখবেন না।'],q:'আগুনের অ্যালার্ম বাজলে কী করবেন?',options:['কাজ থামান, সবুজ EXIT-এর দিকে যান।','আগে নিজের কাজ শেষ করুন।','লিফটে করে নিচে যান।']},
  or:{title:'ଫାୟାର ଏକ୍ସିଟ',points:['ଆଲାର୍ମ ବାଜିଲେ କାମ ବନ୍ଦ କରନ୍ତୁ, ସବୁଜ EXIT ଚିହ୍ନ ଆଡ଼କୁ ଚାଲନ୍ତୁ।','ଲିଫ୍ଟ ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ। EXIT କବାଟ ସାମ୍ନାରେ ଜିନିଷ ରଖନ୍ତୁ ନାହିଁ।'],q:'ନିଆଁ ଆଲାର୍ମ ବାଜିଲେ କ\'ଣ କରିବେ?',options:['କାମ ବନ୍ଦ କରି ସବୁଜ EXIT ଆଡ଼କୁ ଯାଆନ୍ତୁ।','ପ୍ରଥମେ ନିଜ କାମ ଶେଷ କରନ୍ତୁ।','ଲିଫ୍ଟରେ ତଳକୁ ଯାଆନ୍ତୁ।']},
  ta:{title:'தீ வெளியேறும் வழி',points:['அலாரம் அடித்தால் வேலையை நிறுத்தி, பச்சை EXIT குறியை நோக்கி நடங்கள்.','லிஃப்ட் பயன்படுத்த வேண்டாம். EXIT கதவை மறைக்க வேண்டாம்.'],q:'தீ அலாரம் அடித்தால் என்ன செய்வீர்கள்?',options:['வேலையை நிறுத்தி, பச்சை EXIT நோக்கி நடங்கள்.','முதலில் வேலையை முடியுங்கள்.','லிஃப்டில் கீழே செல்லுங்கள்.']},
  core:['exit','green','stairs','bahar','एग्जिट','बाहर','हरे','हरा','सीढ़ी','এক্সিট','সবুজ','বাইরে','সিঁড়ি','ଏକ୍ସିଟ','ସବୁଜ','ବାହାର','ପାହାଚ','எக்ஸிட்','பச்சை','வெளியே','படிக்கட்டு'],
  red:['finish my work','work first','take the lift','पहले अपना काम','काम पूरा','लिफ्ट से','আগে নিজের কাজ','কাজ শেষ','লিফটে করে','ପ୍ରଥମେ ନିଜ କାମ','କାମ ଶେଷ','ଲିଫ୍ଟରେ','வேலையை முடி','லிஃப்டில்'] },
 MACHINE:{ icon:'⚙️', color:'#0B57D0', bg:'#E3ECFD',
  ruleEn:'Never remove the machine guard. Switch off the machine before cleaning or repairing it.',
  questionEn:'What must you do before cleaning a machine?', keyIdea:'Switch off / stop the machine first (guard stays on).',
  en:{title:'Machine guard',points:['Never remove the machine guard.','Switch off the machine before cleaning or fixing.'],q:'What must you do before cleaning a machine?',options:['Switch off the machine first.','Clean it while it runs.','Remove the guard to clean faster.']},
  hi:{title:'मशीन गार्ड',points:['मशीन का गार्ड कभी न हटाएँ।','साफ़ करने या ठीक करने से पहले मशीन बंद करें।'],q:'मशीन साफ़ करने से पहले क्या करना है?',options:['पहले मशीन बंद करें।','चलती मशीन साफ़ करें।','जल्दी के लिए गार्ड हटा दें।']},
  bn:{title:'মেশিন গার্ড',points:['মেশিনের গার্ড কখনও খুলবেন না।','পরিষ্কার বা মেরামতের আগে মেশিন বন্ধ করুন।'],q:'মেশিন পরিষ্কার করার আগে কী করতে হবে?',options:['আগে মেশিন বন্ধ করুন।','চালু মেশিন পরিষ্কার করুন।','তাড়াতাড়ি করতে গার্ড খুলে ফেলুন।']},
  or:{title:'ମେସିନ ଗାର୍ଡ',points:['ମେସିନର ଗାର୍ଡ କେବେ ବି କାଢ଼ନ୍ତୁ ନାହିଁ।','ସଫା କିମ୍ବା ମରାମତି ପୂର୍ବରୁ ମେସିନ ବନ୍ଦ କରନ୍ତୁ।'],q:'ମେସିନ ସଫା କରିବା ପୂର୍ବରୁ କ\'ଣ କରିବେ?',options:['ପ୍ରଥମେ ମେସିନ ବନ୍ଦ କରନ୍ତୁ।','ଚାଲୁଥିବା ମେସିନ ସଫା କରନ୍ତୁ।','ଶୀଘ୍ର ପାଇଁ ଗାର୍ଡ କାଢ଼ି ଦିଅନ୍ତୁ।']},
  ta:{title:'இயந்திர கார்டு',points:['இயந்திரத்தின் கார்டை ஒருபோதும் அகற்ற வேண்டாம்.','சுத்தம் அல்லது பழுது பார்க்கும் முன் இயந்திரத்தை நிறுத்துங்கள்.'],q:'இயந்திரத்தை சுத்தம் செய்யும் முன் என்ன செய்ய வேண்டும்?',options:['முதலில் இயந்திரத்தை நிறுத்துங்கள்.','ஓடும் இயந்திரத்தை சுத்தம் செய்யுங்கள்.','வேகமாக முடிக்க கார்டை அகற்றுங்கள்.']},
  core:['off','stop','band','बंद','ऑफ','বন্ধ','ବନ୍ଦ','ଅଫ','நிறுத்த','அணை','ஆஃப்'],
  red:['while it runs','remove the guard','चलती','गार्ड हटा','চালু মেশিন','গার্ড খুলে','ଚାଲୁଥିବା','ଗାର୍ଡ କାଢ଼ି','ஓடும்','கார்டை அகற்று'] },
 CHEMICAL:{ icon:'🧪', color:'#6A1B9A', bg:'#F1E4F7',
  ruleEn:'Wear gloves and goggles when using chemicals. If a chemical touches your skin, wash with water for 15 minutes.',
  questionEn:'What do you wear when using chemicals?', keyIdea:'Gloves and goggles (eye protection).',
  en:{title:'Chemicals',points:['Wear gloves and goggles when using chemicals.','If a chemical touches your skin, wash with water for 15 minutes.'],q:'What do you wear when using chemicals?',options:['Gloves and goggles.','Nothing, just be quick.','Only a cap.']},
  hi:{title:'केमिकल (रसायन)',points:['केमिकल के काम में दस्ताने और चश्मा पहनें।','केमिकल शरीर पर लगे तो 15 मिनट पानी से धोएँ।'],q:'केमिकल का काम करते समय क्या पहनना है?',options:['दस्ताने और चश्मा।','कुछ नहीं, बस जल्दी करें।','सिर्फ़ टोपी।']},
  bn:{title:'রাসায়নিক (কেমিক্যাল)',points:['কেমিক্যালের কাজে গ্লাভস আর চশমা পরুন।','গায়ে কেমিক্যাল লাগলে ১৫ মিনিট জল দিয়ে ধুয়ে ফেলুন।'],q:'কেমিক্যালের কাজে কী পরতে হবে?',options:['গ্লাভস আর চশমা।','কিছু না, শুধু তাড়াতাড়ি করুন।','শুধু টুপি।']},
  or:{title:'ରାସାୟନିକ (କେମିକାଲ)',points:['କେମିକାଲ କାମରେ ଗ୍ଲୋଭସ ଓ ଚଷମା ପିନ୍ଧନ୍ତୁ।','ଦେହରେ କେମିକାଲ ଲାଗିଲେ ୧୫ ମିନିଟ ପାଣିରେ ଧୁଅନ୍ତୁ।'],q:'କେମିକାଲ କାମରେ କ\'ଣ ପିନ୍ଧିବେ?',options:['ଗ୍ଲୋଭସ ଓ ଚଷମା।','କିଛି ନୁହେଁ, କେବଳ ଶୀଘ୍ର କରନ୍ତୁ।','କେବଳ ଟୋପି।']},
  ta:{title:'ரசாயனம் (கெமிக்கல்)',points:['ரசாயன வேலையில் கையுறை மற்றும் பாதுகாப்பு கண்ணாடி அணியுங்கள்.','ரசாயனம் உடலில் பட்டால் 15 நிமிடம் தண்ணீரில் கழுவுங்கள்.'],q:'ரசாயன வேலையில் என்ன அணிய வேண்டும்?',options:['கையுறை மற்றும் பாதுகாப்பு கண்ணாடி.','எதுவும் வேண்டாம், வேகமாக முடியுங்கள்.','தொப்பி மட்டும்.']},
  core:['glove','goggle','glasses','mask','दस्ताने','ग्लव्स','चश्मा','গ্লাভস','চশমা','দস্তানা','ଗ୍ଲୋଭସ','ଚଷମା','ଦସ୍ତାନା','கையுறை','கண்ணாடி','கிளவுஸ்'],
  red:['nothing','कुछ नहीं','কিছু না','କିଛି ନୁହେଁ','எதுவும் வேண்டாம்'] },
};
export const TOPIC_ORDER = ['PPE','FIRE','MACHINE','CHEMICAL'];

export const DONT_KNOW = ["don't know",'dont know','not sure','pata nahi','पता नहीं','नहीं पता','मालूम नहीं','জানি না','ଜାଣିନି','ଜାଣେ ନାହିଁ','தெரியாது'];

// Intent keywords for mockAsk. Score = number of matches; ties broken by this key order.
export const INTENT_KW = {
 SHIFT:['shift','duty','leave','शिफ्ट','ड्यूटी','छुट्टी','শিফট','ছুটি','ସିଫ୍ଟ','ଛୁଟି','ஷிஃப்ட்','ஷிப்ட்','விடுப்பு'],
 COMPLAINT:['complaint','complain','शिकायत','অভিযোগ','ଅଭିଯୋଗ','புகார்'],
 PPE:['helmet','ppe','shoes','हेलमेट','हेल्मेट','टोपी','जूते','হেলমেট','জুতো','ହେଲମେଟ','ଜୋତା','ஹெல்மெட்','காலணி'],
 FIRE:['fire','exit','alarm','आग','फायर','एग्जिट','अलार्म','আগুন','ফায়ার','এক্সিট','অ্যালার্ম','ନିଆଁ','ଫାୟାର','ଏକ୍ସିଟ','ଆଲାର୍ମ','தீ','அலாரம்','எக்ஸிட்'],
 CHEMICAL:['chemical','glove','केमिकल','रसायन','दस्ताने','কেমিক্যাল','রাসায়নিক','গ্লাভস','କେମିକାଲ','ରାସାୟନିକ','ଗ୍ଲୋଭସ','ரசாயன','கெமிக்கல்','கையுறை'],
 MACHINE:['guard','machine','गार्ड','मशीन','গার্ড','মেশিন','ଗାର୍ଡ','ମେସିନ','கார்டு','இயந்திர','மெஷின்'],
};

// Mock worker. nextShift date = today + dayOffset (compute at runtime; never hardcode a date).
export const SHIFT = { workerId:'W-001', name:'Ravi', dayOffset:1, start:'08:00', end:'16:00', type:'Morning', line:'Line 3', supervisor:'Suresh', leave:{casual:3, sick:2},
 text:{en:'Your next shift: tomorrow, 8 AM to 4 PM. Morning shift, Line 3.',hi:'आपकी अगली शिफ्ट: कल सुबह 8 बजे से शाम 4 बजे तक। मॉर्निंग शिफ्ट, लाइन 3।',bn:'আপনার পরের শিফট: কাল সকাল ৮টা থেকে বিকেল ৪টা পর্যন্ত। মর্নিং শিফট, লাইন ৩।',or:'ଆପଣଙ୍କ ପରବର୍ତ୍ତୀ ସିଫ୍ଟ: କାଲି ସକାଳ ୮ଟାରୁ ଅପରାହ୍ନ ୪ଟା ପର୍ଯ୍ୟନ୍ତ। ମର୍ଣ୍ଣିଂ ସିଫ୍ଟ, ଲାଇନ ୩।',ta:'உங்கள் அடுத்த ஷிஃப்ட்: நாளை காலை 8 மணி முதல் மாலை 4 மணி வரை. காலை ஷிஃப்ட், லைன் 3.'},
 leaveText:{en:'Leave left: casual 3 days, sick 2 days.',hi:'बची छुट्टी: कैज़ुअल 3 दिन, बीमारी 2 दिन।',bn:'বাকি ছুটি: ক্যাজুয়াল ৩ দিন, অসুস্থতা ২ দিন।',or:'ବାକି ଛୁଟି: କାଜୁଆଲ ୩ ଦିନ, ଅସୁସ୍ଥତା ୨ ଦିନ।',ta:'மீதமுள்ள விடுப்பு: சாதாரண விடுப்பு 3 நாள், மருத்துவ விடுப்பு 2 நாள்.'} };
```

## 6. Dashboard seed data and merge rule

```js
// SEED_MATRIX[rule][lang] = [understood, confused]; every cell = 10 sessions; 200 total, 61 confused (30.5%).
export const SEED_MATRIX = {
 PPE:     { hi:[9,1], bn:[8,2], or:[6,4], ta:[8,2], en:[9,1] },  // 20% confused
 FIRE:    { hi:[8,2], bn:[7,3], or:[4,6], ta:[6,4], en:[9,1] },  // 32%
 MACHINE: { hi:[7,3], bn:[6,4], or:[2,8], ta:[5,5], en:[8,2] },  // 44%  <- worst rule
 CHEMICAL:{ hi:[9,1], bn:[7,3], or:[5,5], ta:[7,3], en:[9,1] },  // 26%
};  // by language: hi 17.5%, bn 30%, or 57.5% (worst), ta 35%, en 12.5%
export const SEED_RETRAIN = [
 { workerId:'W-017', lang:'or', ruleId:'MACHINE', confused:3 },
 { workerId:'W-031', lang:'bn', ruleId:'MACHINE', confused:2 },
 { workerId:'W-022', lang:'ta', ruleId:'FIRE',    confused:2 },
 { workerId:'W-009', lang:'or', ruleId:'CHEMICAL',confused:2 },
];
export const SEED_COMPLAINTS = [ // ts = Date.now() - minutesAgo*60000 at load
 { id:'c_s1', workerId:'W-012', lang:'bn', originalText:'ওভারটাইমের টাকা দুই সপ্তাহ ধরে পাইনি।', translatedText:'I have not received overtime pay for two weeks.', summaryEn:'Overtime unpaid for 2 weeks.', category:'Pay', urgent:false, source:'mock', seed:true, minutesAgo:240 },
 { id:'c_s2', workerId:'Anonymous', lang:'hi', originalText:'रात की शिफ्ट में महिला शौचालय में बत्ती नहीं है।', translatedText:'There is no light in the women\'s toilet during the night shift.', summaryEn:'No lighting in women\'s toilet on night shift.', category:'Facilities', urgent:true, source:'mock', seed:true, minutesAgo:95 },
 { id:'c_s3', workerId:'W-027', lang:'ta', originalText:'இயந்திர கார்டு உடைந்துள்ளது, யாரும் சரி செய்யவில்லை.', translatedText:'The machine guard is broken and nobody has fixed it.', summaryEn:'Broken machine guard not repaired.', category:'Safety', urgent:true, source:'mock', seed:true, minutesAgo:30 },
];
```

**Merge rule (dashboard.js, recompute on every render):**
1. `cell[r][l] = SEED_MATRIX[r][l]` copied, then for each live log `cell[log.ruleId][log.lang][status==='understood'?0:1] += 1`.
2. Totals: `sessions = sum of all cells`; `understoodRate = round(100*sumU/sessions)`. Rule rate = confused/total across languages; language rate = confused/total across rules.
3. Retraining = `SEED_RETRAIN` + live groups: group live logs by `workerId+ruleId`; include if confused count >= 2 **and** the latest log in the group is confused. Live rows get a "LIVE" pill.
4. Complaints = live (newest first) then seeds. Urgent rows get a red left border.
5. KPI row shows "+N live" next to Sessions, where N = live log count.

### 6.4 (P1) Cross-device sync
`server.js` keeps `{teachback:[], complaints:[]}` in memory. `POST /api/logs {kind:'teachback'|'complaint', item}`, `GET /api/logs`, `DELETE /api/logs`. `store.js` always writes localStorage first, then fire-and-forget POSTs if mode health was OK. `getLive()` = localStorage items merged with server items, deduplicated by `id`. Dashboard polls every 2 s.

---

## 7. Logic

### 7.1 Router (`app.js`)
Routes: `#/` language, `#/home`, `#/topic/:id`, `#/check/:id`, `#/shift`, `#/complaint`, `#/dashboard`. On `hashchange`: `stopSpeak()`, abort any recognition, render. Any worker route without `ks_lang` redirects to `#/`. Unknown route goes to `#/`. Set `document.documentElement.lang` to the chosen code.

### 7.2 Mock functions (`mock.js`)
- `norm(s)` = `s.normalize('NFC').toLowerCase().replace(/[़়଼]/g,'').replace(/[.,!?;:"'।॥()]/g,' ').replace(/\s+/g,' ').trim()`. Apply the **same** `norm` to keywords before matching. Match = `normText.includes(normKw)`.
- `mockAsk(q)` -> score each `INTENT_KW` key, pick the highest (ties by key order above). If score 0 -> `{intent:'OTHER', answer:UI.notUnderstood[lang]}`. For a safety intent, `answer = TOPICS[id][lang].points[0]`. SHIFT -> `SHIFT.text[lang]`. COMPLAINT -> `UI.complaintPrompt[lang]`.
- `mockJudge(ruleId, answer)` in order: (a) `norm(answer).length < 2` -> confused; (b) any `DONT_KNOW` -> confused; (c) any topic `red` -> confused; (d) any topic `core` -> understood; (e) otherwise confused. Feedback = `UI.understood[lang]` or `UI.confused[lang]`.
- Tap answers skip judging: option index 0 (before shuffle) = understood, else confused. Logged with `method:'tap'`, `source:'mock'`.
- `mockComplaint(text, lang)`: category by keywords (first hit wins): Pay `['pay','salary','overtime','पैसा','वेतन','तनख्वाह','ओवरटाइम','টাকা','বেতন','ওভারটাইম','ଟଙ୍କା','ଦରମା','ଓଭରଟାଇମ','சம்பளம்','ஓவர்டைம்']`; Harassment `['harass','abuse','touch','परेशान','गाली','छेड़','হয়রানি','গালি','ହଇରାଣ','ଗାଳି','தொல்லை','திட்டு']`; Safety `['injury','hurt','machine','guard','चोट','मशीन','আঘাত','মেশিন','ଆଘାତ','ମେସିନ','காயம்','இயந்திர']`; Facilities `['toilet','water','light','शौचालय','पानी','बत्ती','শৌচাগার','জল','ଶୌଚାଳୟ','ପାଣି','கழிப்பறை','தண்ணீர்']`; Shift `['shift','शिफ्ट','শিফট','ସିଫ୍ଟ','ஷிஃப்ட்']`; else Other. `urgent = category in [Harassment, Safety]`. `summaryEn = '<category> complaint (' + LANG.en + ', auto-tagged in demo mode)'`. `translatedText = lang==='en' ? text : '[Translation in Live AI mode] ' + text`.

### 7.3 Live prompts (`server.js`) — build exactly these strings
Common request: `{ systemInstruction:{parts:[{text:SYS}]}, contents:[{role:'user',parts:[{text:USER}]}], generationConfig:{ responseMimeType:'application/json', responseSchema:SCHEMA, temperature:0.2 } }`. Do **not** set maxOutputTokens (thinking tokens may consume it). Parse `candidates[0].content.parts.map(p=>p.text).join('')` with `JSON.parse`. Server timeout 7 s. On any error return `{ok:false}` with status 502. Missing key returns 503.

**ask**
- SYS: `You are KaamSathi, a safety helper for migrant factory workers in India who have little schooling. Reply only with JSON that matches the schema. Write "answer" in ${langName}, in its native script, in at most 2 very short, simple sentences. Use only the factory rules given. Never invent numbers, policies or medical advice. If the rules do not cover the question, say in ${langName}: "Please ask your supervisor."`
- USER: `Factory rules:\nPPE: Always wear a helmet near machines. Wear safety shoes on the shop floor.\nFIRE: When the fire alarm rings, stop work and walk to the green EXIT sign. Do not use the lift. Never block the exit door.\nMACHINE: Never remove the machine guard. Switch off the machine before cleaning or repairing it.\nCHEMICAL: Wear gloves and goggles when using chemicals. If a chemical touches your skin, wash with water for 15 minutes.\n\nIntents: PPE, FIRE, MACHINE, CHEMICAL, SHIFT (shift timing, leave, duty), COMPLAINT (worker wants to report a problem), OTHER.\nWorker question (may contain speech-to-text errors): <<<${question}>>>`
- SCHEMA: `{type:'OBJECT',properties:{intent:{type:'STRING',enum:['PPE','FIRE','MACHINE','CHEMICAL','SHIFT','COMPLAINT','OTHER']},answer:{type:'STRING'}},required:['intent','answer']}`

**teachback**
- SYS: `You check whether a factory worker understood a safety rule. The worker's answer may be in Hindi, Bengali, Odia, Tamil or English, may mix languages or use Latin script, and may contain speech-to-text errors. Judge the meaning, not grammar or exact words. Reply only with JSON that matches the schema.`
- USER: `Rule (English): ${ruleEn}\nQuestion asked: ${questionEn}\nKey idea the answer must contain: ${keyIdea}\nWorker's answer (${langName}): <<<${answer}>>>\n\nSet status to "understood" only if the answer contains the key idea and says nothing unsafe. Set status to "confused" if the answer is wrong, unsafe, empty, off-topic, or says they do not know.\nfeedback: one short, kind sentence in ${langName} native script, at most 12 words. If confused, state the correct action simply.\nreasonEn: at most 12 English words for the supervisor.`
- SCHEMA: `{type:'OBJECT',properties:{status:{type:'STRING',enum:['understood','confused']},feedback:{type:'STRING'},reasonEn:{type:'STRING'}},required:['status','feedback','reasonEn']}`

**complaint**
- SYS: `You help an HR team understand complaints from factory workers. Reply only with JSON that matches the schema. Be faithful; do not add facts.`
- USER: `Complaint spoken in ${langName} (may contain speech-to-text errors): <<<${text}>>>\ntranslatedText: faithful English translation.\nsummaryEn: one line for HR, at most 15 words.\ncategory: one of Pay, Safety, Harassment, Facilities, Shift, Other.\nurgent: true if it mentions injury, danger, harassment or women's safety.`
- SCHEMA: `{type:'OBJECT',properties:{translatedText:{type:'STRING'},summaryEn:{type:'STRING'},category:{type:'STRING',enum:['Pay','Safety','Harassment','Facilities','Shift','Other']},urgent:{type:'BOOLEAN'}},required:['translatedText','summaryEn','category','urgent']}`

**Client validation (`ai.js`)**: ask needs `intent` in the enum and a non-empty `answer`; teachback needs `status` in the enum; complaint needs a non-empty `summaryEn`. If invalid, use mock. **Safety override:** in live teachback, if `mockJudge` hits a `red` or `DONT_KNOW` phrase, the status is forced to `confused` (keeps the demo deterministic).
**Ask routing:** PPE/FIRE/MACHINE/CHEMICAL -> `#/topic/ID` with `answer` shown in an "Answer" banner above the bullets and spoken first. SHIFT -> `#/shift`. COMPLAINT -> `#/complaint`. OTHER -> stay on home, show the answer card and speak it.

---

## 8. Speech (`speech.js`)

- `sttSupported()` = `!!(window.SpeechRecognition||window.webkitSpeechRecognition) && window.isSecureContext`.
- `listen(bcp)` -> Promise<string>: new recognizer; `lang=bcp`, `interimResults=true` (show interim text live), `continuous=false`, `maxAlternatives=1`; resolve the final transcript on `result`, reject on `error`/empty `end`; hard stop after 8 s. Call `stopSpeak()` before starting (avoid echo). On error `language-not-supported` or `not-allowed`, set `sttBroken[lang]=true` for the session and show `UI.noMic` toast. The mic button then becomes disabled with a slash, and the typed box + options stay visible (they are **always** visible).
- `speak(text, lang)`: if no `speechSynthesis`, return false. Call `cancel()`, split `text` on `/(?<=[।.!?])\s+/`, and queue one `SpeechSynthesisUtterance` per sentence with `lang=bcp`, `rate=0.9`, `voice=pickVoice(bcp)` if found. `pickVoice` picks an exact `voice.lang` match (normalise `_` to `-`) else a prefix match on the language code. Voices load async: call `getVoices()` at start and on `voiceschanged`.
- `hasVoice(lang)` = pickVoice found. If false: still try to speak (Android may route to an installed engine), but show the yellow `UI.noVoice` badge under the title. **Never** speak Odia text with a Hindi voice.
- Speak only after a user tap has happened (Chrome autoplay). Auto-speak on topic/check screens is OK because navigation follows a tap.
- Every spoken text has a 🔊 replay button next to it.

---

## 9. Run and phone access

- Mock: `cd kaamsathi; node server.js` -> http://localhost:3000.
- Live (PowerShell): `$env:GEMINI_API_KEY="..."; $env:GEMINI_MODEL="gemini-3.5-flash-lite"; node server.js`. Server logs `mode: live (model)` or `mode: mock` at start. **The key is never sent to the browser.**
- Phone (mic needs HTTPS or localhost; pick the first that works):
  1. USB: `adb reverse tcp:3000 tcp:3000`, then open `http://localhost:3000` in phone Chrome.
  2. Tunnel: `npx localtunnel --port 3000` or `ssh -R 80:localhost:3000 nokey@localhost.run` -> HTTPS URL.
  3. Static HTTPS, mock only: drag `public/` onto https://app.netlify.com/drop.
  4. Phone `chrome://flags/#unsafely-treat-insecure-origin-as-secure` with `http://<laptop-ip>:3000`.
- Fallback for the demo: laptop Chrome DevTools device mode (mobile view). The mic works on localhost there.

---

## 10. Screens

Global: `font-size:20px` base, body text >= 20px, buttons min-height 64px, `#111` on `#fff`, focus outlines visible, max-width 480px centred. Header on worker screens: ← back, page title, 🏠 home. Toast area at the bottom. Mode badge top-right (`Demo mode` grey / `Live AI` green / `AI offline` amber).

| Screen | Components | States |
|---|---|---|
| **Language `#/`** | "KaamSathi" + "काम साथी" subtitle; 5 full-width buttons with script label (28px) + English name (14px); small link "Supervisor dashboard →"; mode badge (tap toggles forceMock). | default |
| **Home `#/home`** | Greeting `UI.welcome` (spoken once per session); section label `UI.safety`; 2x2 grid of topic tiles (icon 56px, title, topic bg colour); 2 wide tiles Shift 🕗 / Complaint 📢; fixed bottom-centre round 🎤 button 80px labelled `UI.ask`; "Change language" link. | idle; ask sheet open |
| **Ask sheet** (overlay on home) | big mic, interim transcript, `UI.typeHere` input + `UI.send`, 2 chips `UI.chips[lang]` (tap = submit that text), close ✕. | idle -> listening (pulsing mic, `UI.listening`) -> thinking (`UI.checking`) -> routed / answer card (OTHER) / error toast + typed box focused |
| **Topic `#/topic/:id`** | optional Answer banner (from Ask); icon 96px on topic bg; title; 2 bullets 24px, each with 🔊; `UI.listen` button (replay all); noVoice badge if needed; primary button `UI.nowYou` -> `#/check/:id`. | speaking (button shows ■ stop) / idle |
| **Teach-back `#/check/:id`** | `UI.ownWords` + q (spoken on enter); big 🎤 `UI.speak`; transcript "UI.youSaid …"; typed input + send; `UI.orTap` + 3 shuffled option buttons. | idle -> listening -> checking -> **understood** (full-width green panel ✅ 72px, feedback text spoken, buttons: Next topic, 🏠) / **confused** (red panel ⚠️, feedback spoken, buttons `UI.replay` -> topic, `UI.tryAgain` -> reset check). Inputs are disabled while checking. |
| **Shift `#/shift`** | 🕗 card: weekday + date (today+1, `toLocaleDateString(bcp,{weekday:'long',day:'numeric',month:'short'})`), large "08:00 – 16:00", type, line, supervisor; `SHIFT.text[lang]` + `SHIFT.leaveText[lang]` spoken on enter; leave chips "Casual 3 · Sick 2"; 🔊. | default |
| **Complaint `#/complaint`** | `UI.complaintPrompt` (spoken); big 🎤; textarea (transcript lands here and can be edited); checkbox `UI.hideName` default **checked**; `UI.submit`. | idle -> listening -> review -> sending -> done (✅ `UI.thanks` spoken, 🏠). Empty submit is blocked. |
| **Dashboard `#/dashboard`** (English) | Title "Understanding dashboard"; subtitle "Proof of understanding, not proof of notice"; KPI cards: Sessions (+N live), Understood %, Confused %, Open complaints; "Confusion by rule" CSS bars sorted high->low, labelled `%` and `n`; "Confusion by language" bars; heat table rule x language (cell bg from `#E8F5E9` (<20%) to `#FFCDD2` (>=50%) in 4 steps, value %); "Needs retraining" table (Worker, Language, Topic, Confused, LIVE pill); "Complaints" table (Time, Worker, Lang, Category, Summary, urgent marker; tap row expands original + translation); "Latest activity" last 5 live logs (time, lang, topic, ✅/⚠️, method, source); "Reset demo data" button (confirm). | re-render every 2 s + on `storage` event; empty-live state shows "No live sessions yet" |

---

## 11. Build order (50 minutes)

| Min | Task | Done when |
|---|---|---|
| 0-4 | `package.json`, `server.js` static + `/api/health` (live=false if no key), `index.html`, base `styles.css`. | localhost:3000 serves the page, health returns JSON |
| 4-10 | `content.js`: paste §5 + §6 verbatim. | module imports without error in the console |
| 10-16 | `app.js` router, Language + Home screens, `store.js` (localStorage). | tap हिन्दी -> home grid in Hindi |
| 16-22 | `speech.js` speak/pickVoice/noVoice badge; Topic screen. | PPE in Hindi speaks 2 bullets |
| 22-31 | `mock.js` norm + mockJudge; `ai.js` (mock path); Teach-back screen with voice, typed, tap; logging. | typed "मशीन के पास हमेशा" -> green; tap wrong -> red; logs in localStorage |
| 31-38 | `dashboard.js` with seed merge + 2 s refresh. | dashboard shows 200 sessions; after one check 201, +1 live |
| 38-42 | Ask sheet (mockAsk + routing + chips), Shift screen, Complaint screen + mockComplaint. | chip "मेरी अगली शिफ्ट कब है?" opens shift; complaint shows on dashboard |
| 42-46 | `server.js` `/api/ai` with §7.3 prompts; live path in `ai.js` with timeout + fallback + safety override. | with key: Hindi typed answer judged by Gemini (`source:'gemini'` in log) |
| 46-50 | Phone test via §9, run §13 checklist items marked ★, rehearse §12. | demo runs end to end on the phone |
If behind schedule at minute 38: skip the Ask sheet free text (keep chips only) and the heat table. Never skip teach-back, tap options or the dashboard.

## 12. Demo script (~80 s)

1. (0-10 s) "Factories keep proof a rule was *announced*. KaamSathi proves it was *understood*, in the worker's own language."
2. (10-20 s) Phone: tap **हिन्दी**. The welcome is spoken.
3. (20-35 s) Tap 🎤, say **"हेलमेट कब पहनना ज़रूरी है?"** (or tap the chip). PPE page opens, the answer is spoken in Hindi, big helmet icon.
4. (35-50 s) Tap **अब आप बताइए**. The question is spoken. Say **"मशीन के पास हमेशा हेलमेट पहनना है"** -> green ✅, Hindi praise spoken.
5. (50-62 s) 🏠 -> change language -> **ଓଡ଼ିଆ** -> Machine guard -> ଏବେ ଆପଣ କୁହନ୍ତୁ -> tap **ଚାଲୁଥିବା ମେସିନ ସଫା କରନ୍ତୁ** -> red ⚠️ + "Listen again". Tap the wrong answer once more (Try again) to trigger retraining. Point at the "no voice" badge if shown: "it still works as text and tap when the phone has no Odia voice."
6. (62-80 s) Open the dashboard: Sessions 200 -> 203 (+3 live), Latest activity shows the Hindi ✅ and two Odia ⚠️, Machine x Odia is the darkest cell, W-001 appears in Needs retraining with LIVE, complaints list with an urgent anonymous women's facilities issue. Close: "Supervisors now see where their explanations fail, by rule and by language. No login, any Android browser, Gemini when online."

## 13. Manual test checklist (★ = must pass before demo)

1. ★ `node server.js` with no key: badge "Demo mode", no console errors on all 7 routes.
2. ★ Each of the 5 languages: home tiles, topic titles/bullets, question and options render in the correct script (no tofu boxes) on the phone.
3. ★ Hindi + English: topic auto-speaks; 🔊 per bullet works; navigating away stops the speech.
4. ★ Odia: if no voice, the yellow badge shows and nothing garbled is spoken.
5. ★ Teach-back typed hi "मशीन के पास हमेशा हेलमेट पहनना है" -> understood. Typed "पता नहीं" -> confused. Typed "सिर्फ़ जब सुपरवाइज़र देखे" -> confused. Typed en "switch it off first" on MACHINE -> understood.
6. ★ Tap options: correct -> green, each wrong -> red; option order changes between visits.
7. ★ Voice teach-back in hi-IN on the phone transcribes and judges (or shows the noMic toast with the typed box usable).
8. ★ Dashboard: fresh = 200 sessions, 139 understood -> shows 70% (Math.round of 69.5); after each teach-back it updates within 2 s in another tab; reset returns to 200.
9. ★ Two wrong taps on the same topic -> W-001 in Needs retraining with LIVE; then a correct answer -> row disappears.
10. Ask chips in each language route correctly (helmet -> PPE, shift -> Shift). Typed "fire alarm" -> FIRE. Gibberish -> notUnderstood card.
11. Shift date = tomorrow in the chosen locale; text + leave spoken.
12. Complaint: empty submit blocked; Hide my name ON -> "Anonymous" on dashboard; OFF -> W-001; hi "ओवरटाइम का पैसा नहीं मिला" -> category Pay (mock).
13. Live mode (if key): badge "Live AI"; logs show `source:'gemini'`; kill the network / bad key -> falls back to mock within 8 s, badge "AI offline", flow continues.
14. View source / network tab: the API key appears nowhere in client files or responses.
15. 360px width: no horizontal scroll; all buttons >= 64px tall.

## 14. Definition of done
- All ★ tests pass on an Android phone (or the DevTools mobile fallback if no HTTPS route works) in mock mode.
- Demo script §12 runs in under 90 s without touching the laptop keyboard.
- No npm dependencies; `node server.js` is the only command; works with no key.
- Content in `content.js` matches §5/§6 exactly (no machine-translated substitutions).
- No secret in `public/`. No `console.error` during the demo path.

## 15. AUDIT CHECKLIST (for the reviewer of the finished build)

Structure and run
- [ ] File tree matches §3; `package.json` has no `dependencies`; `node server.js` starts on PORT||3000.
- [ ] `/api/health` returns `{live,model}`; with no key `live:false`.
- [ ] `GEMINI_API_KEY` is read only in `server.js`; `grep -ri "key" public/` shows no secret and no direct `generativelanguage.googleapis.com` call.
- [ ] `/api/ai` accepts only `task` in {ask, teachback, complaint}, caps inputs at 600 chars, builds prompts from the §7.3 templates (text matches), uses `responseMimeType` + `responseSchema`, timeout <= 7 s, returns `{ok:false}` on failure.
Scope
- [ ] Exactly 4 safety topics + Shift + Complaint + Ask; no HR Info tile; hash routes as §7.1.
- [ ] Gemini is never used to generate topic bullets; topic text comes only from `TOPICS`.
Content
- [ ] All 5 languages present for every `UI` key, every topic (title, 2 points, q, 3 options), `SHIFT.text`, `SHIFT.leaveText`; spot-check 5 strings against §5 character for character.
- [ ] Options shuffled on render; correctness tracked by original index.
- [ ] Shift date computed as today+1 (no literal date string in code).
Teach-back
- [ ] `mockJudge` order: short -> dontKnow -> red -> core -> confused; `norm` applied to both sides.
- [ ] Three input methods (voice, typed, tap) on the check screen; typed + tap visible even when STT works.
- [ ] Live path: validated, falls back to mock, red/dontKnow override applied, `source` logged.
- [ ] Every attempt logs the §4 schema to `ks_logs_v1`.
Speech
- [ ] `isSecureContext` checked; STT errors show `UI.noMic` and disable the mic for that language.
- [ ] TTS one utterance per sentence, voice picked by lang, `noVoice` badge when none, speech cancelled on route change and before listening.
Dashboard
- [ ] Seed numbers equal §6 (fresh: 200 sessions, 61 confused; MACHINE 44%; Odia 57.5%).
- [ ] Merge rule §6 steps 1-5 implemented; retraining rule = confused >= 2 and latest confused.
- [ ] Updates without reload (2 s poll + `storage` event); Reset clears only live data.
- [ ] Complaints show category, urgent marker, Anonymous when hidden; seeds present.
UX
- [ ] Base font >= 20px, buttons >= 64px, contrast dark on light, no horizontal scroll at 360px, every spoken text has 🔊.
- [ ] Mode badge reflects demo / live / offline correctly.
Demo
- [ ] §12 script reproduced end to end; §13 ★ items pass.

Deviations (implementer fills in): none yet.
