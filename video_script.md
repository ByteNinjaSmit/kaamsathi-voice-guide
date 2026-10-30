# KaamSathi Voice Guide — 80-second demo video script

## Before you record (5 min)
- [ ] Start the app: `cd D:\Lab\TCS_Ai_hackathon\kaamsathi` then `.\start.ps1`
- [ ] Phone mic needs HTTPS or localhost. Easiest options:
  - Record the **laptop** in Chrome at phone width (DevTools, 360 wide), with the laptop mic.
  - Or use a tunnel / Chrome port forwarding to the phone (see README.md).
- [ ] Use Chrome. Allow the microphone when asked.
- [ ] Reload the dashboard and press **Reset** so numbers start at 200 sessions.
- [ ] Turn off notifications. Raise volume so the spoken replies are heard.
- [ ] Screen record with audio (Windows: Win+G, or OBS; phone: built-in screen recorder with mic on).
- [ ] Do one dry run. If voice recognition misfires, use the typed answer or the tap options; the app is built for that.

## Script (voice-over in English, speak the Hindi/Odia parts in the app)

| Time | On screen | You say |
|------|-----------|---------|
| 0:00–0:08 | Title card (`00_title_card.png`) | "Factories can prove they posted a safety notice. They can't prove the worker understood it. KaamSathi proves understanding, in the worker's own language." |
| 0:08–0:16 | Language screen, tap **हिन्दी** | "A migrant worker opens it on any phone browser. No login, no install. They tap their language." |
| 0:16–0:30 | Tap the Ask button / chip, say **"हेलमेट कब पहनना ज़रूरी है?"**; PPE page opens and speaks | "They ask by voice. Big icon, short words, and the answer is spoken in Hindi." |
| 0:30–0:44 | Tap **अब आप बताइए**; say **"मशीन के पास हमेशा हेलमेट पहनना है"**; green tick | "Now the key step: the worker explains the rule back in their own words. Gemini judges the meaning, not the exact words. Green: understood." |
| 0:44–0:58 | Home, change language to **ଓଡ଼ିଆ**, Machine guard, teach-back, tap the wrong option, red warning, tap it again | "Here an Odia-speaking worker gets the machine rule wrong. Red: not understood. The app replays the rule and logs the confusion. If the phone has no Odia voice, it shows a badge and works by text and taps." |
| 0:58–1:12 | Dashboard: sessions count up, heat map cell Machine × Odia, retraining list, complaint list | "The supervisor sees it live: which rule fails in which language, and who needs retraining. Complaints spoken in any language arrive here translated and summarised for HR." |
| 1:12–1:20 | Dashboard caption or title card | "Supervisors now answer for whether workers understood, not just whether a notice went up. Works in five languages, with a fallback when the network or AI is down. Dashboard numbers are simulated sample data." |

## Honest-claims rules (say these, don't overclaim)
- Say "prototype" and "simulated sample data" for the dashboard history.
- Don't say Odia voice works unless you heard it on your device.
- Don't claim it is tested with real workers. Say "next step: pilot with workers and native-speaker review of translations."
- Numbers on the title card are sourced: 3 died / 11 injured per day (2017–2020, DGFASLI via Business Standard); about 60 million inter-state migrants (Economic Survey 2016–17).

## If something fails while recording
| Problem | Fix |
|---------|-----|
| Mic blocked or no speech recognition | Use the typed box or the 3 tap answers. Say "voice or tap or type". |
| Gemini slow or key error | The app falls back to demo mode in 8 seconds. Badge shows "AI offline". Keep going. |
| Dashboard numbers look odd | Press **Reset** on the dashboard and redo the run. |
| Odia has no voice | Point at the badge and say it works as text and taps. |

## After recording
1. Trim to 90 seconds or less.
2. Upload on the platform with `00_title_card.png` and 4–6 screenshots from `D:\Lab\TCS_Ai_hackathon\screenshots\`: 03, 04, 05, 09, 10, 11.
3. Press **Submit**.
4. Rotate the Gemini key in Google AI Studio and delete `kaamsathi\start.ps1`.
