// AI facade: live (server proxy to Gemini) with silent fallback to deterministic mock.
import { LANGS, TOPICS, UI } from './content.js';
import { mockAsk, mockJudge, mockComplaint } from './mock.js';
import { setServerOk } from './store.js';

const state = { live: false, model: '', healthOk: false, forceMock: false, offline: false };
const listeners = [];
const langName = (code) => (LANGS.find((l) => l.code === code) || LANGS[4]).en;
const INTENTS = ['PPE', 'FIRE', 'MACHINE', 'CHEMICAL', 'SHIFT', 'COMPLAINT', 'OTHER'];
const CATS = ['Pay', 'Safety', 'Harassment', 'Facilities', 'Shift', 'Other'];

function readForce() {
  try {
    if (new URLSearchParams(location.search).get('mock') === '1') return true;
    return localStorage.getItem('ks_forceMock') === '1';
  } catch (e) { return false; }
}

export async function initMode() {
  state.forceMock = readForce();
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch('/api/health', { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(t);
    const j = await r.json();
    state.live = !!j.live; state.model = j.model || ''; state.healthOk = true;
    setServerOk(true);
  } catch (e) { state.live = false; state.healthOk = false; setServerOk(false); }
  notify();
}

export function getMode() {
  if (state.live && !state.forceMock) return state.offline ? 'offline' : 'live';
  return 'mock';
}
export function onModeChange(cb) { listeners.push(cb); }
function notify() { listeners.forEach((cb) => cb(getMode())); }

export function toggleForceMock() {
  state.forceMock = !state.forceMock;
  try { localStorage.setItem('ks_forceMock', state.forceMock ? '1' : '0'); } catch (e) { /* ignore */ }
  notify();
}

async function callLive(body) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json();
    if (!r.ok || !j.ok || !j.data) throw new Error('bad response');
    return j.data;
  } finally { clearTimeout(t); }
}
const useLive = () => state.live && !state.forceMock && !state.offline;
function fail() { state.offline = true; notify(); }
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

export async function ask(lang, question) {
  if (useLive()) {
    try {
      const d = await callLive({ task: 'ask', lang, langName: langName(lang), question });
      if (INTENTS.includes(d.intent) && nonEmpty(d.answer)) return { intent: d.intent, answer: d.answer, source: 'gemini' };
      throw new Error('invalid');
    } catch (e) { fail(); }
  }
  return mockAsk(question, lang);
}

export async function judge(lang, ruleId, answer) {
  const m = mockJudge(ruleId, answer, lang);
  if (useLive()) {
    try {
      const t = TOPICS[ruleId];
      const d = await callLive({ task: 'teachback', lang, langName: langName(lang), ruleEn: t.ruleEn, questionEn: t.questionEn, keyIdea: t.keyIdea, answer });
      if (d.status === 'understood' || d.status === 'confused') {
        let status = d.status;
        if (m.hardConfused) status = 'confused'; // safety override
        const feedback = (status === d.status && nonEmpty(d.feedback)) ? d.feedback : UI[status][lang];
        return { status, feedback, reasonEn: d.reasonEn || '', source: 'gemini' };
      }
      throw new Error('invalid');
    } catch (e) { fail(); }
  }
  return m;
}

export async function complaint(lang, text) {
  if (useLive()) {
    try {
      const d = await callLive({ task: 'complaint', lang, langName: langName(lang), text });
      if (nonEmpty(d.summaryEn)) {
        return { translatedText: nonEmpty(d.translatedText) ? d.translatedText : text, summaryEn: d.summaryEn,
          category: CATS.includes(d.category) ? d.category : 'Other', urgent: !!d.urgent, source: 'gemini' };
      }
      throw new Error('invalid');
    } catch (e) { fail(); }
  }
  return mockComplaint(text, lang);
}
