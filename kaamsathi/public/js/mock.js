// Deterministic demo-mode "AI": keyword matching, no network.
import { TOPICS, UI, SHIFT, INTENT_KW, DONT_KNOW, LANGS } from './content.js';

export function norm(s) {
  return String(s == null ? '' : s).normalize('NFC').toLowerCase()
    .replace(/[़়଼]/g, '')
    .replace(/[.,!?;:"'।॥()]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const ASCII = /^[a-z0-9 ]+$/;
// Judge matcher: ASCII keywords match whole words (plus a plural/verb ending) so "off" does not match "offer";
// non-ASCII keywords keep substring matching because Indic scripts have no \b.
const hit = (text, kws) => kws.some((k) => { const n = norm(k); return n && text.includes(n); }); // substring: used by the complaint tagger
const hitW = (text, kws) => kws.some((k) => {
  const n = norm(k);
  if (!n) return false;
  if (ASCII.test(n)) return new RegExp('(^|[^a-z0-9])' + n +'(s|es|ed|ped|ing)?($|[^a-z0-9])').test(text);
  return text.includes(n);
});
const count = (text, kws) => kws.reduce((n, k) => { const x = norm(k); return n + (x && text.includes(x) ? 1 : 0); }, 0);

// ---- demo-judge safety extras (fail closed: anything unsafe or negated is "confused") ----
const NEGATORS = new Set(['no', 'not', 'never', 'nahi', 'nahin', 'nhi', 'nahee', 'mat', 'without', 'cannot',
  'नहीं', 'नही', 'न', 'मत', 'না', 'নেই', 'নয়', 'ନାହିଁ', 'ନୁହେଁ', 'ନ', 'வேண்டாம்', 'இல்லை', 'கூடாது']);
// Objects of a legitimate prohibition ("do not use the lift", "never remove the guard"): such a negation is safe.
const SAFE_OBJ = ['lift', 'elevator', 'लिफ्ट', 'লিফট', 'ଲିଫ୍ଟ', 'லிஃப்ட்', 'guard', 'गार्ड', 'গার্ড', 'ଗାର୍ଡ', 'கார்ட',
  'remove', 'take off', 'block', 'हटा', 'उतार', 'খুল', 'ସରା', 'କାଢ', 'அகற்ற'].map(norm);
const COMMON_RED = ['no need', 'not needed', 'not necessary', 'need not', 'zaroori nahi', 'jaruri nahi', 'ज़रूरी नहीं', 'जरूरी नहीं',
  'ज़रूरत नहीं', 'জরুরি নয়', 'দরকার নেই', 'ଜରୁରୀ ନୁହେଁ', 'ଦରକାର ନାହିଁ', 'தேவையில்லை'];
const EXTRA_RED = {
  PPE: ['no helmet', 'without helmet', 'without a helmet'],
  FIRE: ['then exit', 'finish work', 'finish the work', 'after work', 'lift se', 'by lift', 'use lift', 'use the lift', 'lift lunga', 'लिफ्ट ले',
    'काम खत्म', 'लिफ्ट से', 'লিফট নি', 'ଲିଫ୍ଟ ନେ', 'ଲିଫ୍ଟରେ', 'லிஃப்ட் எடு', 'லிஃப்டில்'],
  MACHINE: ['never switch', 'not switch', 'keep it on', 'keep running', 'while running', 'while working', 'while its running', 'without stopping',
    'without off', 'चालू मशीन', 'चलते', 'बंद नहीं', 'বন্ধ না', 'ବନ୍ଦ ନାହିଁ', 'நிறுத்த வேண்டாம்'],
  CHEMICAL: ['no glove', 'without glove', 'no goggle', 'without goggle', 'no mask', 'bare hand', 'bina'],
};

// Remove safe prohibitions, e.g. "do not take the lift" or "गार्ड कभी न हटाएँ" (negator close to a lift/guard/remove word).
function stripSafeNegations(text) {
  const tok = text.split(' ');
  const drop = new Array(tok.length).fill(false);
  const isObj = (w) => SAFE_OBJ.some((o) => (ASCII.test(o) ? w === o || w === o + 's' : w.includes(o)));
  tok.forEach((w, i) => {
    if (!isObj(w)) return;
    for (let j = Math.max(0, i - 3); j <= Math.min(tok.length - 1, i + 3); j++) {
      if (NEGATORS.has(tok[j])) { for (let k = Math.min(i, j); k <= Math.max(i, j); k++) drop[k] = true; }
    }
  });
  return tok.filter((_, i) => !drop[i]).join(' ');
}
function hasNegation(text) {
  const t = text.replace(/\b(don|doesn|isn|can|won|shouldn|needn)\s+t\b/g, 'not');
  return t.split(' ').some((w) => NEGATORS.has(w));
}

export function mockAsk(q, lang) {
  const t = norm(q);
  let best = null, bestScore = 0;
  for (const id of Object.keys(INTENT_KW)) {
    const sc = count(t, INTENT_KW[id]);
    if (sc > bestScore) { best = id; bestScore = sc; }
  }
  if (!best) return { intent: 'OTHER', answer: UI.notUnderstood[lang], source: 'mock' };
  let answer;
  if (best === 'SHIFT') answer = SHIFT.text[lang];
  else if (best === 'COMPLAINT') answer = UI.complaintPrompt[lang];
  else answer = TOPICS[best][lang].points[0];
  return { intent: best, answer, source: 'mock' };
}

// Returns { status, hardConfused, feedback, source }. hardConfused = red flag / negation / don't know / too short.
// Order: short -> dontKnow -> unsafe or negated -> core -> confused. Fails closed.
export function mockJudge(ruleId, answer, lang) {
  const t0 = norm(answer).replace(/\b(don|doesn|isn|can|won|shouldn|needn)\s+t\b/g, 'not');
  const topic = Object.hasOwn(TOPICS, ruleId) ? TOPICS[ruleId] : null;
  const t = stripSafeNegations(t0);
  let status, hard = false;
  if (!topic) { status = 'confused'; hard = true; }
  else if (t0.length < 2) { status = 'confused'; hard = true; }
  else if (hitW(t0, DONT_KNOW)) { status = 'confused'; hard = true; }
  else if (hitW(t, topic.red) || hitW(t, COMMON_RED) || hitW(t, EXTRA_RED[ruleId] || []) || hasNegation(t)) { status = 'confused'; hard = true; }
  else if (hitW(t, topic.core)) status = 'understood';
  else status = 'confused';
  return { status, hardConfused: hard, feedback: status === 'understood' ? UI.understood[lang] : UI.confused[lang], source: 'mock' };
}

const CATS = [
  ['Pay', ['pay','salary','overtime','पैसा','वेतन','तनख्वाह','ओवरटाइम','টাকা','বেতন','ওভারটাইম','ଟଙ୍କା','ଦରମା','ଓଭରଟାଇମ','சம்பளம்','ஓவர்டைம்']],
  ['Harassment', ['harass','abuse','touch','परेशान','गाली','छेड़','হয়রানি','গালি','ହଇରାଣ','ଗାଳି','தொல்லை','திட்டு']],
  ['Safety', ['injury','hurt','machine','guard','चोट','मशीन','আঘাত','মেশিন','ଆଘାତ','ମେସିନ','காயம்','இயந்திர']],
  ['Facilities', ['toilet','water','light','शौचालय','पानी','बत्ती','শৌচাগার','জল','ଶୌଚାଳୟ','ପାଣି','கழிப்பறை','தண்ணீர்']],
  ['Shift', ['shift','शिफ्ट','শিফট','ସିଫ୍ଟ','ஷிஃப்ட்']],
];

export function mockComplaint(text, lang) {
  const t = norm(text);
  let category = 'Other';
  for (const [c, kws] of CATS) { if (hit(t, kws)) { category = c; break; } }
  const urgent = category === 'Harassment' || category === 'Safety';
  const en = (LANGS.find((l) => l.code === lang) || LANGS[4]).en;
  return {
    translatedText: lang === 'en' ? text : '[Translation in Live AI mode] ' + text,
    summaryEn: category + ' complaint (' + en + ', auto-tagged in demo mode)',
    category, urgent, source: 'mock',
  };
}
