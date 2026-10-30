# KaamSathi Voice Guide: Can it win? (judge's audit, 2026-10-30)

What I read: `hackathon_notes.md`, `PLAN.md`, `README.md`, `AUDIT.md`, all of `public/js/*.js`, the 11 screenshots, and the TCS iON Student Guide PDF (pages 1-10 and 17-23). I did not open `start.ps1`. I changed no file except this one.

## 0. Two facts that change the strategy

1. **The judges only see uploaded files.** The guide's upload step takes "PNG, JPG, MP4 up to 50MB" and has no text or pitch field (Student Guide p.22). It says judges "review your prototype". There is no live demo. So the risk of a live demo failing is low. The real risk is that **voice, the core of the idea, cannot be seen in still screenshots.** Any framing or numbers have to be inside the images or the video.
2. **The concept is not ours.** The platform generated "KaamSathi Voice Guide" and labelled it "Recommended" with a score of 83 (`hackathon_notes.md`, Step 5). Every student who picks this challenge and the safety pain point is likely to be offered the same or a very similar idea, possibly with the same name. **Originality has to come from execution, not from the idea.**

Also check: the guide says "any tool is fine, as long as you finish within the 2 hours" (p.22). This build has 8 files, a hardened Node server and rate limiting, which looks like it was pre-built. If any of it was built outside the event window, that is an integrity risk that outweighs everything below. Make sure what you submit is what you built in the window, and name the tool you actually used.

## 1. Predicted field (my inference, not data)

All students get the same funnel: problem, then 5 Whys, then 3 AI-generated ideas, then an AI build plan pasted into Lovable, AI Studio or Bolt. Within this challenge I expect:

| Share (guess) | Typical entry | Where it is weak |
|---|---|---|
| ~50% | A chatbot with a language dropdown (React/shadcn from Lovable or Bolt). It answers safety questions through Gemini and has a mock shift table and a complaint form. | It looks generic. The UI is in English with Hindi answers, and there is no voice or only English TTS. The screenshots are text-heavy, which is the very thing the root cause says fails. There is no proof of understanding. |
| ~25% | A "voice companion" with an MCQ quiz and a static chart dashboard | The quiz is multiple choice, not the worker's own words. The dashboard is hard-coded and not linked to worker actions. Translations come from the model live and nobody reviewed them. |
| ~15% | A visual poster or help desk (ideas 2 and 3) | Thin demos |
| ~10% | **Strong AI Studio builds**, some using Gemini's native audio, so the worker talks and Gemini talks back in real time in Hindi or Bengali | **This is the real threat.** Native voice in a video sounds far better than browser TTS, and they can claim "real AI voice". |

Most entries will be weak on the same four things: (a) proof the worker understood, (b) any link between worker actions and what the supervisor sees, (c) honesty about what is mocked, and (d) numbers.

## 2. What exists today, and the evidence you can quote

The products nearby are blue-collar learning platforms rather than factory safety tools with comprehension checks. chaabi offers vernacular, WhatsApp-based upskilling for blue-collar workers ([YourStory](https://yourstory.com/2023/12/chaabi-ai-powered-vernacular-learning-upskill-indian-blue-collar-workforce)). Utter's Co-Rakshak delivered COVID-era safety training in 5 languages ([BioSpectrum](https://www.biospectrumindia.com/news/83/17721/utter-launches-safety-training-app-for-essential-service-providers.html)). Sarvam pitches multilingual safety audio for multilingual plants ([Sarvam](https://www.sarvam.ai/text-to-speech/training)). IIT-Madras describes a multilingual SME process-safety platform ([IITM WCTE](https://wcte.iitm.ac.in/?p=1481)). In a handful of searches I found **no product that checks a worker's spoken explanation and reports comprehension by rule and by language**. That is a fair "gap" claim, but it is not exhaustive. Odia voice routes exist: Bhashini wrappers list Odia ([bhashini-translator](https://libraries.io/pypi/bhashini-translator)), and so do IITM ASR ([docs](https://speech-lab-iitm.github.io/docs/api_docs/asr)) and Sarvam Odia STT ([Sarvam](https://www.sarvam.ai/apis/speech-to-text/odia)).

Numbers you can quote. These are as reported by the sources. I could not open the primary DGFASLI tables.
- **About 3 workers die and 11 are injured every day in registered Indian factories (2017-2022)**, per reporting on DGFASLI data ([Janata Weekly](https://janataweekly.org/three-workers-die-every-day-in-indian-factories-govt-data-show/); [Business Standard](https://business-standard.com/article/economy-policy/three-deaths-every-day-labour-safety-under-construction-in-india-123012900704_1.html)). An average of about 1,000 deaths a year, 2012-2022 ([Factly](https://factly.in/data-an-average-of-1000-people-died-in-accidents-in-factories-between-2012-2022)).
- Lok Sabha reply: 1,433 (2011), 1,383 (2012) and 1,417 (2013) fatal injuries in registered factories ([Business Standard/PTI](https://www.business-standard.com/article/pti-stories/ind-factories-saw-more-than-1-400-fatalities-in-2013-114120800617_1.html)). These cover only the registered, organised sector, so they are a floor.
- **About 60 million inter-state migrants.** The Economic Survey 2016-17 estimated 5-6.5 million inter-state movers a year over 2001-2011 ([Business Standard](https://business-standard.com/article/news-ani/study-reveals-labour-migration-in-india-increasing-at-an-accelerating-rate-economic-survey-117013100614_1.html)). Researchers dispute the Survey's railway-based figures, so quote the census-based 60 million.
- **Law.** Factories Act s.111A gives every worker the right to obtain safety information from the occupier and to be trained ([lawgist](https://lawgist.in/factories-act/111A); [AdvocateKhoj](https://www.advocatekhoj.com/library/bareacts/factories/111a.php)). The OSH Code 2020 subsumes the Act, per a Lok Sabha reply ([eparlib](https://eparlib.nic.in/bitstream/123456789/2980486/1/AU66_vgLHLo.pdf)). It covers self-migrating inter-state workers and applies where 10 or more are employed ([K&S Partners](https://ksandk.com/md/labour-employment/inter-state-migrant-workers-osh-code-2020/); [Bar & Bench](https://www.barandbench.com/view-point/occupational-safety-health-and-working-conditions-code-2020-transforming-indias-workplace-safety-regime)). **Pitch line:** the law gives a right to be informed and trained, but nothing measures whether the worker understood. That is exactly your root cause. I did not find a statutory "in a language understood" clause, so do not claim one.
- International support: a review found that safety training often ignores language and literacy barriers, and that this leads to more injuries ([Workplace Health & Safety, 2015](https://journals.sagepub.com/doi/xml/10.1177/2165079915607872)).

What judges reward: a concrete pain point plus realistic adoption steps; a stable end-to-end demo over ambitious claims; originality; clear communication ([Reskilll](https://blogs.reskilll.com/?p=436); [Eventornado](https://eventornado.com/blog/how-to-judge-a-hackathon-5-criteria-to-pick-winners); [Devfolio](https://guide.devfolio.co:8443/introduction/judging)). Weights vary a lot. Impact plus feasibility and presentation often make up 40-50% between them.

## 3. Scorecard (out of 10, against the predicted field)

| Criterion | Score | Why |
|---|---|---|
| Problem fit | **9** | It hits all three parts of the challenge (safety, shift, complaint) and builds on the root cause the platform itself generated (proof of notice versus proof of understanding). |
| Originality vs. field | **5** | The idea came from the platform and many will share it. The execution is above average: free-form teach-back judged by AI with an unsafe-answer override, and a rule × language heat table fed by worker actions. |
| Depth of demo | **8** | 7 routes, 5 scripts, 3 input modes, retraining logic and an anonymous complaint that reaches HR. Few 2-hour entries will have a closed loop from worker to supervisor. |
| Working-ness | **7** | **Real:** native-script UI, browser TTS for Hindi and English, Chrome STT on localhost, live Gemini (screenshot 04's feedback "…बिल्कुल सही है" is not in `content.js`, so it came from Gemini), and live updates to the dashboard. **Mocked:** worker identity (W-001 "Ravi"), shift and leave data, the 200 seeded sessions and seeded complaints. **Untested:** a real Android phone, the HTTPS route, and Odia/Bengali/Tamil voice. |
| Impact story | **5** | Nothing in the submission yet: no numbers, no users, no pilot metric. It can reach 7 with the cited figures and one sentence on the metric. |
| Feasibility / scale | **7** | No login, no install, zero dependencies, curated content (no hallucinated safety rules), and it works offline in demo mode. The gaps: each factory must author and verify content per language, there is no route for feature phones (IVR or WhatsApp), and the Odia voice gap. |
| Inclusion / accessibility | **7** | Script-labelled buttons, 20px+ text, tap fallback, a "hide my name" option that defaults to on, and attention to women and night shifts. Against it: the language prompt is English-only, there is no Bhojpuri or Santali, and see the Odia problem below. |
| Polish / presentation | **6** | Clean, high-contrast and readable, but plain, with emoji icons. Defects visible in the current screenshots are listed in §4. |
| Live-demo failure risk (higher = safer) | **8** | The submission is recorded, so this is low risk. If mentors ask for a live run, the phone mic over HTTPS has never been tested (`AUDIT.md` items 12, 21, 22). |

**What really sets it apart:** (1) the worker explains the rule in their own words, by voice or typing, and Gemini judges the *meaning*, with a deterministic safety override and fallback; (2) every attempt flows into a supervisor heat map that shows *which rule fails in which language* and *who needs retraining*; (3) safety text is curated, never generated, which answers "what if the AI hallucinates a safety rule?"; (4) it keeps working with no network or key, and still works when the phone has no voice for the language.

**What does NOT set it apart:** being multilingual; using Gemini; voice input; the shift lookup; the complaint form; a dashboard as such; the name and concept; the security hardening (rate limits, admin token, null-byte guard), which is invisible to judges and earns nothing.

## 4. Weaknesses a judge will attack (ranked)

1. **The voice cannot be heard in the submission.** Still screenshots of a "voice-first" app look like a text app. This is the biggest gap.
2. **Odia irony.** The language with the worst seeded confusion (57.5%) is the one with no voice on the phone. The app then tells a low-literacy worker "please read the text" (screenshot 05), which is the very failure the root cause names. Name it yourself, with the fix: Bhashini/AI4Bharat Odia TTS, or pre-recorded audio clips reviewed by a native speaker.
3. **The dashboard numbers are made up.** 200 sessions, "Odia 57.5%" and "Machine guard 44%" are seed data. If they are shown unlabelled, a judge may read them as findings, and if caught it costs credibility. Label them "simulated" in the image.
4. **No user validation.** No worker, supervisor or native speaker has checked anything. The translations in `content.js` were written by AI and never reviewed.
5. **Visible defects in the current screenshots:**
   - 03: the answer banner is labelled "पूछें:" ("Ask:"), a bug (AUDIT D12).
   - 07: a leftover toast covers the Home button.
   - 09/10: the floating "Live AI" badge sits over dashboard numbers.
   - 10: two identical live "Pay / Hindi" complaints left over from testing, and the complaints table is cut off at phone width.
6. **A tapped wrong answer gets generic feedback.** It says "Not clear yet. Let us listen again" and never states the correct action. Only Gemini-judged free-form answers explain.
7. **Mocked HR data and a fixed worker ID.** This is expected for a prototype. Say "mock HR data" once and move on.
8. **The look is like any AI-tool app.** It is neutral rather than distinctive. That is acceptable, but it gives no "wow" in a thumbnail.

## 5. Changes ranked by gain per hour of work

| # | Change | Time | Gain |
|---|---|---|---|
| 1 | Record a 75-90 s narrated video with **system audio** (Win+G Game Bar records it) | 12 min | Huge. It is the only way voice and live updates reach the judges. |
| 2 | Make a title card (PNG) with the framing sentence, 3 cited numbers, and "real vs. simulated" | 7 min | High. There is no text field, so this *is* your pitch. |
| 3 | In Live AI mode, prepare 2 Hindi free-form answers that a keyword or MCQ app would get wrong: a paraphrase with none of the keywords (should turn green) and a plausible but unsafe answer (should turn red with a correction) | 4 min | High. It proves Gemini judges meaning and is the clearest originality signal. |
| 4 | Reset demo data and retake clean screenshots (no toast, no duplicate rows, scrolled so the badge covers nothing) | 5 min | Medium-high |
| 5 | Label the seed data, for example in a caption or on the title card: "200 simulated sessions + live sessions from this demo" | 2 min | Protects credibility |
| 6 | Fix the "पूछें:" label (`app.js:221`: use 💬 or no label) | 2 min | Small, but it is visible in a screenshot |
| 7 | Have one native speaker check the Odia and Bengali strings by phone or WhatsApp, then say "checked by a native speaker" | 15-30 min | Medium. It is real validation. |
| 8 | Odia voice via pre-recorded clips or Bhashini TTS | 2+ h | Skip. Pitch it as the next step. |

## 6. Top 5 before submitting (fits in about 30 minutes)

1. **Dashboard → Reset demo data.** Then retake 3 clean screenshots at phone width, with Live AI on and no toasts. (5 min)
2. **Build the title card** in any slide tool and export it as PNG. Put on it the framing sentence, the 3 numbers in §7, and one line: "Real: Gemini judging, Hindi/English voice, live dashboard. Simulated: HR data, 200 seed sessions." (7 min)
3. **Rehearse the 2 semantic answers live once** (step 3 of the video below) so you know Gemini scores them correctly. If it does not, use the README script instead. (4 min)
4. **Record the video** (under 50 MB, 720p). Follow the moments in §7 exactly. One take plus one retake. (12 min)
5. **Upload in this order:** title card, video, then the 3 screenshots. Fix `app.js:221` first only if there is time to spare. (2 min)

## 7. What to say and show

**Framing sentence** (title card and the first line of narration):
> "Factories can prove a safety rule was announced. KaamSathi proves it was *understood*. A migrant worker hears the rule in their own language, explains it back in their own words, and the supervisor sees which rule fails in which language."

**Video moments** (about 80 s, with audio):
1. (0-10 s) Title card plus the sentence above.
2. (10-30 s) Tap हिन्दी and speak "हेलमेट कब पहनना ज़रूरी है?" into the mic. The judges *hear* the Hindi answer.
3. (30-55 s) "अब आप बताइए". First speak the paraphrase and get green. Then press Try again and give the unsafe answer to get red with Gemini's correction. Say: "It is not a quiz. Gemini checks the meaning, and unsafe answers are always blocked."
4. (55-65 s) Odia, Machine guard, wrong tap twice. Point at the no-voice badge: "Odia voice through Bhashini is the next step; tap still works."
5. (65-85 s) Dashboard: 200 → 203 (+3 live), Machine × Odia at 83% is the darkest cell, W-001 LIVE in the retraining list, and the anonymous urgent women's-toilet complaint.

**The 3 screenshots that matter most:** (a) green Hindi and red Odia teach-back results side by side in one image; (b) the dashboard heat table with the retraining list; (c) the Hindi home screen with the mic. Drop the shift and complaint-confirmation shots. Every entry will have those.

**Numbers to quote:** about 3 deaths a day in registered factories (DGFASLI-based reporting); about 60 million inter-state migrants (Economic Survey 2016-17); Factories Act s.111A gives a right to information and training but has no measure of understanding. Pilot metric to propose: "% of workers who explain each rule correctly on the first try, by language, measured weekly". Never quote the seeded 57.5% or 44% as findings.

## 8. Verdict

**Tier: top quartile now, top 10% within reach.** The reasoning:
- It already beats the likely median entry on closing the loop from worker to supervisor, on tying the build to the root cause, and on fallback robustness.
- It is held back by a concept the platform shared with others, a submission with no voice in it, unlabelled simulated data, and no validation.
- Against a strong AI Studio entry using native Gemini audio, it wins only if the judges *see and hear* the teach-back judging meaning and the dashboard reacting.

**The single biggest lever:** a narrated video with audible Hindi voice that shows a free-form spoken answer judged correctly (one green, one red) and the dashboard updating. Without it, still screenshots make KaamSathi look like the other multilingual apps. With it, it plausibly moves into the top 10%. The one thing that could drop it below the middle is the build-window integrity issue in §0.
