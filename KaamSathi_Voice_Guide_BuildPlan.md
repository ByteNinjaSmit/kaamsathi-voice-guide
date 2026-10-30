# KaamSathi Voice Guide – Build Plan (Hackathon Prototype)

## 1. Problem Statement

Migrant factory workers often do not fully understand safety rules, machine instructions, or HR policies because:

- Instructions are written for compliance, not understanding (dense text, legal language).
- Content assumes a “standard” literate worker and one official language.
- Communication is one-way (posters, handouts, fast briefings) with no real feedback loop to check if workers actually understood.
- Supervisors are rarely held accountable for workers’ comprehension; they are only required to “document” that rules were shared.

This leads to:

- Higher risk of accidents and unsafe behaviors.
- Confusion about shifts, leave, and rights.
- Silent grievances because complaint mechanisms are hard to access or fear-inducing.

We need a low-friction, multilingual, voice-first channel that:

- Meets workers where they are (voice, icons, simple language).
- Checks **actual** understanding via teach-back.
- Surfaces confusion back to supervisors so they must improve how they communicate and train.

---

## 2. Solution Overview

**KaamSathi Voice Guide** is a browser-based, voice-first AI companion for factory workers:

- Runs in a basic Android browser, no login, no install.
- Workers pick their language (Hindi, Bengali, Odia, Tamil, English) via big buttons and icons.
- They can tap safety icons (PPE, fire exit, machine guarding, chemical handling) or ask questions by voice.
- The system explains rules via simple audio + big visuals, then runs **voice-based teach-back**: the worker repeats the rule in their own words; AI checks if it’s understood.
- A lightweight supervisor dashboard shows which rules and languages are causing confusion and who might need retraining.
- Extras: workers can ask about their next shift by voice and record complaints; the system logs and translates them for HR (mock data).

The demo will show: a worker asks a question in Hindi, hears the answer, completes teach-back successfully, and the dashboard instantly reflects improved understanding stats.

---

## 3. Target Users

### Primary: Migrant Shop-Floor Workers

- Languages: Hindi, Bengali, Odia, Tamil, English; low literacy is common.
- Work Conditions: No time or patience for complex apps; many use entry-level Android phones.
- Needs:
  - Simple, trusted way to understand safety rules and HR info in their own language.
  - Ability to ask questions by speaking instead of typing.
  - Confirmation they’ve understood correctly (and know what they’re still unclear about).
  - Easy way to check shifts and log complaints without reading/writing long forms.

### Secondary: Line Supervisors & HR / Safety Officers

- Needs:
  - Clear view of where workers are confused (by rule and language).
  - Evidence that workers have been trained and have understood, not just signed a paper.
  - Simple, non-technical dashboard accessible on a browser.
  - Overview of complaints and recurring issues (for HR).

---

## 4. Key Features

All of these must be implemented in the prototype, even if simplified:

1. **Multilingual Voice Assistance**  
   - Workers select Hindi, Bengali, Odia, Tamil, or English via large language buttons.
   - All major explanations (safety, HR basics, shift answers) are provided via **audio output** in the chosen language, with simple, on-screen text and icons.
   - Use Gemini for translation, language simplification, and text-to-speech.

2. **Interactive Query System**  
   - Workers can tap big icons (e.g., PPE, Fire Exit, Machine Guarding, Chemical Handling, HR Policies, Shifts) or press a microphone button to **speak a question** instead of typing.
   - The app converts speech to text, uses Gemini to interpret the question, fetches or generates a relevant simple answer, and responds in **voice + text + icon**.

3. **Voice-based Teach-back Checks**  
   - After each safety rule explanation, app asks 1–2 **short, spoken teach-back questions** (e.g., “In your own words, tell me when you must wear a helmet.”).
   - Worker answers by voice; app transcribes and sends to Gemini to classify understanding into:
     - `understood`
     - `confused`
   - The result is displayed to the worker via simple green/red visuals and also logged in a local/mock data store for later dashboard aggregation.

4. **Simple Supervisor Dashboard**  
   - A separate route `/dashboard` (linked via a quiet “Supervisor” button) shows:
     - Which rules (PPE, Fire Exit, Machine Guarding, Chemicals) have the **highest confusion rates**.
     - Breakdowns by language (Hindi/Bengali/Odia/Tamil/English).
     - Simple, anonymized list: “Workers needing retraining” (IDs or sample names).
     - Complaint list (transcribed + translated summaries).
   - Updates live (within the session) when new teach-back results or complaints are submitted.

5. **Visual Aid Integration**  
   - Each safety topic page shows:
     - A **big icon or illustration** (hard hat, fire exit door, gear guarding, chemical bottle).
     - 1–3 short, large-font bullet points (simple phrases).
     - The audio explanation is synchronized or at least consistent with these visuals.
   - The UI uses large fonts, high contrast, minimal text, and clear icons for low-literacy users.

6. **Shift and Leave Lookup**  
   - Workers can say: “Mera agla shift kab hai?” or tap a “Shift” icon.
   - The app uses **mock shift schedule data** keyed by worker (e.g., fixed worker ID or name for demo).
   - The answer is read aloud in the chosen language, e.g., “Aapka agla shift kal subah 8 baje hai – morning shift.”

7. **Voice Complaint Box**  
   - A big “Complaint” icon leads to a simple record button.
   - Worker records a complaint by voice (any supported language).
   - App transcribes using speech-to-text, then uses Gemini to:
     - Summarize it in simple English for HR.
     - Optionally translate the original to English.
   - Logs a complaint entry in mock data visible on the supervisor dashboard.

*(Note: There are 7 total, but they map exactly to the “Confirmed Features to Build” list plus visual aids.)*

---

## 5. User Flow

### 5.1 Entry & Language Selection (Worker)

1. Worker opens URL in an Android browser.
2. Landing screen shows:
   - App title: “KaamSathi Voice Guide”.
   - Big language buttons with script + flag (e.g., “हिन्दी”, “বাংলা”, “ଓଡ଼ିଆ”, “தமிழ்”, “English”).
3. Worker taps their language.
4. App stores selected language in memory (e.g., `currentLanguage = 'hi'`).
5. Optional: brief spoken welcome message: “Namaste, yeh KaamSathi hai. Screen pe icon dabaiye ya bol kar sawaal poochhiye.”

### 5.2 Main Worker Home Screen

The main screen (for chosen language) shows 3–4 large tiles with icons:

- Safety & Rules:
  - PPE
  - Fire Exit
  - Machine Guarding
  - Chemical Handling
- HR Info / Policies
- Shift & Leave
- Complaint Box

And a floating **mic button** at bottom center for general questions.

Actions:

1. Worker either:
   - Taps a safety tile (e.g., “PPE”), OR
   - Presses mic, asks a question by voice (e.g., “Helmet kab pehenna zaroori hai?”).

2. On tap of a safety tile:
   - Navigate to safety topic detail page (Section 5.3).

3. On voice question:
   - Start browser recording (permission).
   - Capture audio, convert to text (via speech-to-text).
   - Send text + language code to Gemini to:
     - Detect intent (safety topic / HR / shift / complaint).
     - Generate a simple explanation, matching the chosen language.
   - Render explanation page similar to a topic detail, then proceed to teach-back for safety rules.

### 5.3 Safety Rule Detail + Visual Aids

For each topic (e.g., PPE):

1. UI shows:
   - Large icon (e.g., helmet).
   - Title in selected language (e.g., “सुरक्षा टोपी (Helmet)”).
   - 1–3 big bullet points, e.g.:
     - “Machine ke paas kaam karte waqt hamesha helmet pehno.”
     - “Helmet sahi tarah se banda ho.”
2. App simultaneously:
   - Calls Gemini to generate **simple spoken explanation** in the same language (or uses static text piped through text-to-speech).
   - Plays TTS audio: short, 30–45 seconds.

3. After audio finishes (or after a delay):
   - App transitions to teach-back section auto or via visible button “Ab aap batayein” (“Now you explain”).

### 5.4 Teach-back Check (Hero Feature)

1. The teach-back screen shows:
   - Prompt text (in language): “Aap apne shabdon mein batao: helmet kab zaroori hai?”
   - A large record button: “Boliye” with mic icon.
2. Worker presses record, speaks answer.
3. App:
   - Uses speech-to-text to get transcription in worker’s language.
   - Sends to Gemini with:
     - Original rule text (ground truth).
     - Worker’s answer transcription.
     - Language code.
   - Gemini returns a structured result:
     - `{ status: "understood" | "confused", feedbackMessageLocalized: string }`
4. UI:
   - Shows big green tick + simple message if `understood`:
     - “Samajh gaye. Bahut accha!” (plus audio).
   - Or red warning + “Thoda aur practice chahiye. Phir se sunte hain.” if `confused`.
   - If confused, app offers:
     - Button to replay explanation.
     - Button to retry teach-back.

5. Logging:
   - App stores teach-back result in a local data structure (for session-demo), e.g.:

   ```js
   teachbackLogs.push({
     ruleId: 'PPE',
     language: 'hi',
     status: 'understood',
     timestamp: Date.now(),
     workerId: 'worker_001'
   });
   ```

6. After success or attempt:
   - Worker can go back home or choose another topic.

### 5.5 Shift & Leave Lookup

1. Worker from home taps “Shift & Leave” tile or asks “Mera agla shift kab hai?”
2. App:
   - Determines workerId (for demo, fixed: `worker_001`).
   - Uses mock schedule:

   ```js
   mockShifts = {
     worker_001: {
       nextShift: { date: '2026-10-31', start: '08:00', type: 'Morning' },
       leaveBalance: { casual: 3, sick: 2 }
     }
   };
   ```

3. Response:
   - Display big text, e.g.: “Aapka agla shift: Kal, subah 8 baje, Morning shift.”
   - Use Gemini to translate/phrase in chosen language, then TTS audio playback.

### 5.6 Voice Complaint Box

1. Worker taps “Complaint” icon from home.
2. Complaint screen:
   - One-line instruction: “Apni pareshaani ya shikayat bol kar batayein.”
   - Big mic button: “Record Complaint.”
3. On record:
   - Capture speech, transcribe.
   - Send transcription + language to Gemini to:
     - Summarize in simple English for HR.
     - Translate full text to English.
   - Append complaint item to `complaints` array:

   ```js
   complaints.push({
     id: 'c_001',
     workerId: 'worker_001',
     originalLanguage: 'hi',
     originalText: '...',
     translatedText: '...',
     summaryEn: 'Issue with overtime not paid.',
     timestamp: ...
   });
   ```

4. Show thank-you screen:
   - “Shukriya, aapki shikayat likh li gayi hai.” + short audio.

### 5.7 Supervisor Dashboard

Entry:

1. From landing or via small link at bottom: “Supervisor / HR Dashboard”.
2. No login for prototype; simply open `/dashboard`.

Dashboard sections (simple, card-based layout):

1. **Overview cards**:
   - Total teach-back sessions.
   - Overall understanding rate (% understood vs. confused).
2. **Confusion by Rule** (bar chart or list using mock + live data):
   - PPE: 20% confused
   - Fire Exit: 40% confused
   - Machine Guarding: 55% confused
   - Chemical Handling: 30% confused
3. **Confusion by Language**:
   - Hindi: 15% confused
   - Bengali: 25% confused
   - Odia: 50% confused
   - Tamil: 35% confused
   - English: 10% confused
   - Updated as new teach-back logs are added (recalculated on render).
4. **Workers Needing Retraining**:
   - Simple rule: if a worker has >1 `confused` teach-back on same topic, show in a table:
     - Worker ID, Language, Topic, Attempts.
5. **Complaints List**:
   - Show table of complaints:
     - Time, Worker ID, Language, Summary (English), “View full text” link.
   - Data comes from `complaints` array populated by the Voice Complaint Box.

---

## 6. Technical Approach

### 6.1 Overall Stack

- **Frontend:**  
  - Pure HTML5/CSS/JavaScript or lightweight framework like React (CRA or Vite) – whichever the prototyping tool defaults to.
  - Single-page app with client-side routing for:
    - `/` – language + worker home
    - `/topic/:id` – safety rule pages
    - `/shift` – shift view
    - `/complaint` – complaint recording
    - `/dashboard` – supervisor view

- **Backend:**  
  - For hackathon speed: minimal Node.js/Express or serverless functions (if required by Gemini setup).
  - Most mock data (shifts, sample content, logs) can be stored in memory on client for the demo session.
  - Gemini API proxy endpoints:
    - `/api/ask` – question answering, multilingual response
    - `/api/teachback` – evaluate spoken explanation
    - `/api/complaint` – summarize/translate complaint
    - `/api/tts` – optional if Gemini’s TTS needs server-side handling
    - `/api/stt` – if not using browser’s Web Speech API

- **AI Services (Gemini):**
  - **Language understanding & generation:**
    - Interpret user questions and intents.
    - Generate simplified explanations and localized responses.
    - Evaluate teach-back answers (classification).
    - Summarize complaints.
  - **Multilingual support:**
    - Translate responses into target language.
    - Maintain simple vocabulary.

- **Voice Handling:**
  - **Speech-to-Text (STT):**
    - Ideal: Browser Web Speech API (if supported) for direct STT.
    - Fallback: Capture audio in browser (MediaRecorder), send blob to backend STT using Gemini (if available).
    - Use recognition language based on `currentLanguage` (e.g., `hi-IN`, `ta-IN`).
  - **Text-to-Speech (TTS):**
    - Option A: Use browser SpeechSynthesis (if local voices support target language).
    - Option B: Use Gemini’s TTS endpoint and stream audio back to client.
    - For the 50-min build, a pragmatic approach:
      - Use SpeechSynthesis API with prompts in local script where possible.
      - Ensure UI still displays text even if TTS fails.

### 6.2 Data Structures (Client-side Mock Data)

- **Safety Content:**

```js
const safetyTopics = {
  PPE: {
    id: 'PPE',
    icon: 'helmet.png',
    baseTitle: 'Personal Protective Equipment',
    basePoints: [
      'Always wear helmet near machines.',
      'Wear safety shoes on the shop floor.',
      'Check your PPE for damage.'
    ]
  },
  FIRE_EXIT: { ... },
  MACHINE_GUARD: { ... },
  CHEMICAL: { ... }
};
```

- **Shift Data:**

```js
const mockShifts = {
  worker_001: {
    name: 'Ravi',
    nextShift: { date: '2026-10-31', start: '08:00', type: 'Morning' },
    leaveBalance: { casual: 3, sick: 2 }
  }
};
```

- **Teach-back Logs (in-memory for demo):**

```js
let teachbackLogs = [];
```

- **Complaints (in-memory):**

```js
let complaints = [];
```

### 6.3 API Contracts (for AI Calls)

#### 6.3.1 `/api/ask` – Interactive Query System

- **Input:**

```json
{
  "question": "Helmet kab pehenna zaroori hai?",
  "language": "hi",
  "topicHint": null
}
```

- **Process:**

  - Prompt Gemini: detect intent + generate simple answer in language.
  - “If safety rule, keep response within 3 sentences, low vocabulary complexity.”

- **Output:**

```json
{
  "topic": "PPE",
  "answerText": "Machine ke paas kaam karte waqt hamesha helmet pehno. Helmet girne ya takraane se sir ko bachata hai.",
  "answerLanguage": "hi"
}
```

#### 6.3.2 `/api/teachback` – Teach-back Evaluation

- **Input:**

```json
{
  "ruleId": "PPE",
  "language": "hi",
  "groundTruth": "Always wear helmet near machines to protect your head.",
  "workerAnswer": "Jab machine ke paas kaam karte hain tab helmet pehenna chahiye."
}
```

- **Gemini Prompt Example:**

> You are evaluating if a worker understood a safety rule.  
> Ground truth rule (English): ...  
> Worker answer (Hindi): ...  
> Decide "understood" only if the worker covers the core safety idea.  
> Respond as JSON: {"status":"understood"|"confused","feedback":"<short feedback in Hindi>"}

- **Output:**

```json
{
  "status": "understood",
  "feedback": "Sahi hai, aapne helmet ka sahi istemal samjha."
}
```

#### 6.3.3 `/api/complaint` – Complaint Processing

- **Input:**

```json
{
  "language": "hi",
  "text": "Mujhe teen din se overtime ka paisa nahi mila."
}
```

- **Output:**

```json
{
  "translatedText": "I have not received overtime pay for three days.",
  "summaryEn": "Worker reports unpaid overtime for three days."
}
```

### 6.4 UI / UX Implementation Notes

- **Layout:**
  - Single-column, mobile-first design.
  - Large tappable areas (min-height > 60px) for icons and buttons.
  - High contrast: dark text on light background; accent color for important actions.

- **Accessibility / Low Literacy:**
  - Use icons plus short text labels.
  - Whenever text appears, have a small speaker button to replay audio.
  - Avoid deep navigation; keep “Back” buttons clearly visible.

- **Languages:**
  - Keep language constants for headings/prompts in JSON:

  ```js
  const strings = {
    hi: { welcome: "नमस्ते, यह KaamSathi है।", ... },
    bn: { ... },
    or: { ... },
    ta: { ... },
    en: { ... }
  };
  ```

- **Timeboxing for 50-Min Build:**
  1. Skeleton pages + navigation.
  2. Safety topic cards with static icons & text.
  3. Stubbed STT/TTS with simple JS prompts.
  4. In-memory teachbackLogs and dashboard derived from it.
  5. Wire Gemini calls; if time-limited, mock responses but keep API structure ready.

---

## 7. Success Metrics

For the hackathon prototype and demo:

### 7.1 Functional Demo Metrics

- **End-to-end worker flow works:**
  - Worker selects Hindi.
  - Asks voice question about PPE.
  - Receives spoken explanation with relevant icon/text.
  - Completes teach-back; app classifies correctly as “understood”.
  - Dashboard shows:
    - Increased total teach-back count.
    - PPE’s confusion/understanding data updated.
- **Dashboard:**
  - Displays at least one confusion metric by rule and language.
  - Displays at least one complaint transcribed and summarized.

### 7.2 UX / Usability Indicators (Qualitative for judges)

- A non-technical judge can:
  - Use the app on an Android phone browser without help.
  - Understand what each icon means.
  - Ask “When is my next shift?” and hear a correct answer in their chosen language.
  - File a voice complaint; see it appear in the dashboard.

### 7.3 Alignment with Root Cause

- Evidence in the dashboard that:
  - Supervisors can see where their explanations fail (e.g., high confusion on machine guarding in Odia).
  - The system is optimized for **worker understanding** (teach-back results) rather than just ticking compliance boxes.

If by the end of the demo:

1. Voice IN + voice OUT works in at least Hindi + English.
2. Teach-back classifies at least one answer as “understood” and one as “confused”.
3. Dashboard reflects live data changes from worker interactions.

…then the KaamSathi Voice Guide prototype is considered a successful implementation for the hackathon scope.