# TCS iON AI Hackathon — Notes

## Theme
**Inclusive workforce**
Multilingual, low-digital-literacy access to work, health and food safety for migrant and rural populations.

**Why this theme**
- Fits LLMs: voice, translation and chat agents
- Easy demo: a phone-style voice bot in Hindi, Bengali, Odia and other languages
- No hard data or hardware dependency
- Clear impact story: number of workers reached

Other themes considered:
- Resilient Cities: needs GIS and data-science strength, longer setup
- Smart Industry: needs OT/SCADA knowledge

## Challenge
**Factory Worker's AI Companion**

> Industrial areas across India employ many migrant workers from different states. Language barriers and limited digital skills make it difficult for many workers to understand safety rules, check shift schedules, and file complaints.

**Why this challenge**
- Only one built around language barriers and low digital literacy
- Buildable in about 1 hour: a voice-first app with 3 features
  - safety rules read aloud
  - shift schedule lookup
  - complaint filing by voice
- Strong demo: the worker speaks in their own language and the app answers
- Works with Google AI Studio, Lovable or Bolt.new

**Not chosen**
- Food Adulteration Detector: needs real sensors or lab data, weak on language and literacy
- Primary Health Centre AI Companion: clinical accuracy and safety risk, less about inclusive access

## Step 3 — Who are you helping?

### Full version
> Migrant factory workers from states like Bihar, Odisha, Jharkhand, West Bengal and Uttar Pradesh, working in industrial areas in Gujarat, Maharashtra, Tamil Nadu and Haryana, who don't speak the local language and can't read the signs or instructions on the shop floor. Many have studied only up to primary or middle school and use a basic smartphone, with little comfort in typing, apps or English. Their supervisors, contractors and HR teams also struggle, because they must repeat safety rules and answer the same shift and leave questions again and again in several languages. Women workers and night-shift workers are especially affected, because they are less likely to know where to complain or whom to ask.

### Short version
> Migrant factory workers in industrial areas who speak a different language from the local one, have limited schooling and low digital skills, and can't easily understand safety rules, check shift schedules or file complaints. Supervisors and HR teams who must keep repeating the same information in many languages are also affected.

## Step 3 — What problems do they face?

**Migrant factory workers**
- They can't understand safety rules, warning signs or training in the local language or English, so they risk accidents and injuries.
- They can't read or use apps, portals or notice boards, so they don't know their shift timings, overtime, leave balance or pay details. They depend on co-workers, who sometimes give wrong information.
- They don't know how or where to file a complaint, and they fear losing their job or pay if they speak up.

**Supervisors and contractors**
- They spend a lot of time repeating the same instructions in several languages.
- Shift changes and safety updates don't reach everyone, so there are mistakes, absenteeism and disputes.

**HR teams**
- Complaints arrive late, unrecorded or in different languages, so they can't track or resolve issues quickly.
- They can't easily check whether every worker understood the safety rules, which creates compliance and audit risk.

**Women workers**
- They have fewer safe, private ways to raise harassment, wage or facility complaints.

**Night-shift workers**
- Few people are available to answer questions, and urgent safety or schedule information is hard to get.

**Lock previous steps dialog:** click **Continue**. Locking only stops edits to Steps 1–2 (language, theme, challenge) and the "Who" text. Your choices there are already final, and you can still go back and read them.

## Recommended pain point to pick
**Workers can't understand safety rules in their own language**
- Clear impact: injuries and compliance
- Easy to demo with voice
- Judges see why it matters

## Step 3 — Pain point selected
**Migrant factory workers cannot understand safety rules, warning signs, or training materials in unfamiliar languages, leading to frequent confusion on the shop floor and higher risk of accidents and injuries.**

Compared with:
| # | Pain point | Verdict |
|---|------------|---------|
| 1 | Can't understand safety rules and signs | **Picked** |
| 2 | Shifts, overtime, leave, pay unknown | Fold in as extra feature |
| 3 | No paper trail of what was communicated | Skip |
| 4 | New workers isolated from updates | Skip |

## Step 4 — Root cause (5 Whys)
1. Critical info is communicated through written local-language signs and text-heavy apps that many migrant workers cannot read.
2. Systems are designed around a "standard worker" (local, literate, smartphone-competent).
3. Decision-makers rarely involve migrant workers in designing or testing communication.
4. Workers have little voice, and incentives reward proof-of-notice, not proof-of-understanding.
5. Power imbalances and regulations require documentation that notices were issued, not that workers understood them.

**Root cause:** Structural power and incentive imbalances lead factories and system designers to optimize communication for compliance documentation and a presumed "standard worker", instead of co-creating inclusive, multilingual, low-literacy-friendly channels with migrant workers and holding management accountable for actual worker understanding.

**Design implication:** explain by voice and pictures, check understanding, and show HR a comprehension dashboard.

## Step 5 — Ideas and ratings
| Idea | Impact | Effort (fewer = easier) | Score | Verdict |
|------|--------|-------------------------|-------|---------|
| 1 KaamSathi Voice Guide | 5 | 3 | 83 | **Selected (Recommended)** |
| 2 SamjhoSaath Visual Studio | 4 | 4 | 58 | Skip |
| 3 ShiftSathi Help Desk | 3 | 4 | 42 | Skip |

**KaamSathi Voice Guide:** a voice-first AI companion that explains factory safety rules, machine instructions and HR policies in the worker's own language using simple audio and visuals. Workers speak or tap icons to ask doubts. The app answers in their language, then checks understanding with short spoken questions. Supervisors get a dashboard showing where workers are confused.

**Why it won**
- Hits the root cause directly: proof of understanding, not proof of notice
- Worker-facing, with the strongest demo
- Buildable with Gemini in AI Studio, Lovable or Bolt.new

**Tip:** borrow one idea from SamjhoSaath. Add a QR-code poster that opens the KaamSathi voice guide for that sign.

## Step 6 — Confirm selection
**Challenge:** Factory Worker's AI Companion
**Selected idea:** KaamSathi Voice Guide

### "Anything else we should know?" (paste this)
> Build a working web prototype that runs on a basic Android phone browser, with no login and no installation.
> - **Languages:** Hindi, Bengali, Odia, Tamil and English. The worker picks a language with big flag or script buttons and can speak instead of type.
> - **Hero feature:** a safety rule and sign explainer with voice in and out, big icons and simple words, using sample factory content such as PPE, fire exit, machine guarding and chemical handling.
> - **Teach-back:** after each explanation, the app asks 1–2 short spoken questions and checks the worker's answer with AI. It marks the result as understood or confused.
> - **Supervisor dashboard:** a separate page with sample plus live data showing which rules and which languages cause the most confusion, and who needs re-training.
> - **Small extras:** a shift schedule lookup and a voice complaint box, with sample data.
> - **Constraints:** a 50-minute build window. Use Gemini for language and voice, mock data for HR, no real integrations, a simple UI with a large font and high contrast, and low literacy in mind.
> - **Demo goal:** a worker speaks a question in Hindi, hears the answer, passes the teach-back, and the dashboard updates.

### MVP features to choose
1. Voice input and output in 4–5 languages (Hindi, Bengali, Odia, Tamil, English)
2. Safety rule and sign explainer, spoken with simple icons
3. Teach-back voice quiz that checks understanding
4. Supervisor dashboard showing who is confused and about what
5. Extras if offered: shift lookup and voice complaint

Skip anything needing real integrations (WhatsApp, telephony, HR systems).

## Pace (2 hours)
| Time | What you do |
|------|-------------|
| 0:00–0:10 | Sign in, language, theme, challenge |
| 0:10–0:30 | Describe people and problems, pick one pain point |
| 0:30–0:45 | Root cause, rate 3 ideas, choose one |
| 0:45–1:00 | Confirm idea, features, generate build plan |
| 1:00–1:50 | Build the prototype in an AI tool |
| 1:50–2:00 | Upload screenshots or video, press **Submit** |
