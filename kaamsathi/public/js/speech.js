// Browser speech only: SpeechSynthesis for output, Web Speech recognition for input.
import { LANGS } from './content.js';

const bcpOf = (code) => (LANGS.find((l) => l.code === code) || LANGS[4]).bcp;
const synth = window.speechSynthesis || null;
let voices = [];
function loadVoices() { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } }
loadVoices();
if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);

const norm = (s) => String(s || '').replace(/_/g, '-').toLowerCase();

export function pickVoice(bcp) {
  if (!voices.length) loadVoices();
  const want = norm(bcp);
  const prefix = want.split('-')[0];
  return voices.find((v) => norm(v.lang) === want)
    || voices.find((v) => norm(v.lang).split('-')[0] === prefix) || null;
}

export function hasVoice(lang) { return !!pickVoice(bcpOf(lang)); }

let speakingCb = null;
export function onSpeakingChange(cb) { speakingCb = cb; }

export function stopSpeak() {
  if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
  if (speakingCb) speakingCb(false);
}

export function isSpeaking() { return !!(synth && synth.speaking); }

// Speaks text one sentence at a time. Returns false when speech is not possible.
// Never falls back to a voice of another language (no Hindi voice for Odia text).
export function speak(text, lang) {
  if (!synth || !text) return false;
  const bcp = bcpOf(lang);
  try { synth.cancel(); } catch (e) { /* ignore */ }
  const voice = pickVoice(bcp);
  const parts = String(text).split(/(?<=[।.!?])\s+/).filter((s) => s.trim());
  if (!parts.length) return false;
  parts.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(s);
    u.lang = bcp;
    u.rate = 0.9;
    if (voice) u.voice = voice;
    if (i === 0 && speakingCb) u.onstart = () => speakingCb(true);
    if (i === parts.length - 1) { u.onend = () => speakingCb && speakingCb(false); u.onerror = () => speakingCb && speakingCb(false); }
    synth.speak(u);
  });
  return true;
}

// ---------- recognition ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const sttBroken = {};
export function sttSupported() { return !!SR && !!window.isSecureContext; }
export function sttUsable(lang) { return sttSupported() && !sttBroken[lang]; }

let current = null;
export function abortListen() {
  if (current) { try { current.rec.abort(); } catch (e) { /* ignore */ } current.cancelled = true; current = null; }
}

// listen(lang, onInterim) -> Promise<string>. Rejects with Error(code).
export function listen(lang, onInterim) {
  abortListen();
  stopSpeak();
  return new Promise((resolve, reject) => {
    if (!sttSupported()) return reject(new Error('unsupported'));
    const rec = new SR();
    const state = { rec, cancelled: false };
    current = state;
    rec.lang = bcpOf(lang);
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let text = '', done = false, err = null;
    const timer = setTimeout(() => { try { rec.stop(); } catch (e) { /* ignore */ } }, 8000);
    const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); if (current === state) current = null; fn(v); };
    rec.onresult = (ev) => {
      let t = '';
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      text = t;
      if (onInterim) onInterim(t);
    };
    rec.onerror = (ev) => {
      err = ev.error || 'error';
      if (err === 'language-not-supported' || err === 'not-allowed' || err === 'service-not-allowed') sttBroken[lang] = true;
      finish(reject, new Error(err));
    };
    rec.onend = () => {
      if (state.cancelled) return finish(reject, new Error('aborted'));
      if (text.trim()) finish(resolve, text.trim()); else finish(reject, new Error(err || 'empty'));
    };
    try { rec.start(); } catch (e) { finish(reject, e); }
  });
}
