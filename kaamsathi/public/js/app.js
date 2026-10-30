// Router + worker screens.
import { LANGS, UI, TOPICS, TOPIC_ORDER, SHIFT } from './content.js';
import { speak, stopSpeak, hasVoice, listen, abortListen, sttUsable, onSpeakingChange, isSpeaking } from './speech.js';
import { initMode, getMode, onModeChange, toggleForceMock, ask, judge, complaint } from './ai.js';
import { addTeachback, addComplaint } from './store.js';
import { renderDashboard } from './dashboard.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
let lang = null;
try { lang = localStorage.getItem('ks_lang'); } catch (e) { /* ignore */ }
if (!LANGS.some((l) => l.code === lang)) lang = null;
let token = 0;                 // invalidates stale async work after navigation
let cleanups = [];
let welcomed = false;
let pendingAnswer = null;      // {id, answer} from Ask routing
let homeAnswer = null;         // answer card for OTHER intent

const t = (k) => UI[k][lang || 'en'];
const bcpOf = () => (LANGS.find((l) => l.code === lang) || LANGS[4]).bcp;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const $ = (sel, root = app) => root.querySelector(sel);
const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
}

// Speak with the language rule: if voices are loaded and none matches the language, stay silent (badge shows).
function say(text) {
  if (!text) return false;
  if (!hasVoice(lang) && speechVoicesLoaded()) return false;
  return speak(text, lang);
}
function speechVoicesLoaded() { try { return (window.speechSynthesis.getVoices() || []).length > 0; } catch (e) { return false; } }

function badgeHtml() {
  const m = getMode();
  const txt = m === 'live' ? 'Live AI' : m === 'offline' ? 'AI offline' : 'Demo mode';
  return `<button class="badge ${m}" id="badge" aria-label="${txt}">${txt}</button>`;
}
function bindBadge(canToggle) {
  const b = $('#badge'); if (!b) return;
  if (canToggle) b.addEventListener('click', () => { toggleForceMock(); toast(getMode() === 'mock' ? 'Demo mode' : 'Live AI'); });
}
onModeChange(() => {
  const b = $('#badge'); if (!b) return;
  const m = getMode();
  b.className = 'badge ' + m;
  b.textContent = m === 'live' ? 'Live AI' : m === 'offline' ? 'AI offline' : 'Demo mode';
});

function header(title, back = '#/home') {
  return `${badgeHtml()}<header class="top"><button id="back" aria-label="Back">←</button><h1>${esc(title)}</h1><button id="homeBtn" aria-label="${esc(t('home'))}">🏠</button></header>`;
}
function bindHeader(back = '#/home') {
  const b = $('#back'), h = $('#homeBtn');
  if (b) b.addEventListener('click', () => { location.hash = back; });
  if (h) h.addEventListener('click', () => { location.hash = '#/home'; });
  bindBadge(false);
}

function voiceBadge() {
  return `<div class="novoice" id="novoice" ${hasVoice(lang) || !speechVoicesLoaded() ? 'hidden' : ''}>${esc(t('noVoice'))}</div>`;
}
function refreshVoiceBadge() {
  const el = $('#novoice'); if (!el) return;
  setTimeout(() => { if (el.isConnected) el.hidden = hasVoice(lang) || !speechVoicesLoaded(); }, 700);
}

// ---------------- router ----------------
function parse() {
  const h = (location.hash || '#/').replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  return { name: parts[0] || '', arg: parts[1] || '' };
}

function render() {
  token++;
  stopSpeak(); abortListen();
  cleanups.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
  cleanups = [];
  onSpeakingChange(null);
  app.className = '';
  const { name, arg } = parse();
  document.documentElement.lang = lang || 'en';
  if (name === 'dashboard') { document.documentElement.lang = 'en'; app.className = 'wide'; return screenDashboard(); }
  if (name === '' ) return screenLang();
  if (!lang) { location.hash = '#/'; return; }
  switch (name) {
    case 'home': return screenHome();
    case 'topic': if (TOPICS[arg]) return screenTopic(arg); break;
    case 'check': if (TOPICS[arg]) return screenCheck(arg); break;
    case 'shift': return screenShift();
    case 'complaint': return screenComplaint();
    default: break;
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', render);

// ---------------- language ----------------
function screenLang() {
  app.innerHTML = `${badgeHtml()}
  <div class="hero"><h1>KaamSathi</h1><div class="sub">काम साथी</div></div>
  <p style="text-align:center;font-size:22px;margin:8px 0">${esc(UI.chooseLang.en)}</p>
  ${LANGS.map((l) => `<button class="lang-btn" data-l="${l.code}" lang="${l.code}"><span class="big">${l.label}</span><span class="small">${l.en}</span></button>`).join('')}
  <button class="link" id="dashLink">Supervisor dashboard →</button>`;
  bindBadge(true);
  app.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.l;
    try { localStorage.setItem('ks_lang', lang); } catch (e) { /* ignore */ }
    location.hash = '#/home';
  }));
  $('#dashLink').addEventListener('click', () => { location.hash = '#/dashboard'; });
}

// ---------------- home ----------------
function screenHome() {
  const my = token;
  const ans = homeAnswer; homeAnswer = null; // show an OTHER answer once, not on every later visit to Home
  const ansCard = ans ? `<div class="card ans" id="ansCard"><div class="bullet" style="margin:0"><span>${esc(ans)}</span><button id="ansSpeak" aria-label="${esc(t('listen'))}">🔊</button></div></div>` : '';
  app.innerHTML = `${badgeHtml()}
  <div class="greet" style="padding-top:44px"><span>${esc(t('welcome'))}</span><button id="gSpeak" style="min-width:64px;padding:0;font-size:26px" aria-label="${esc(t('listen'))}">🔊</button></div>
  ${voiceBadge()}
  <button class="askbtn" id="fab" aria-label="${esc(t('ask'))}"><span class="ic">🎤</span><span>${esc(t('ask'))}</span></button>
  ${ansCard}
  <div class="sec">${esc(t('safety'))}</div>
  <div class="grid">${TOPIC_ORDER.map((id) => { const tp = TOPICS[id]; return `<button class="tile" data-id="${id}" style="background:${tp.bg};color:#111"><span class="ic">${tp.icon}</span><span>${esc(tp[lang].title)}</span></button>`; }).join('')}</div>
  <button class="wide-tile" id="tShift" style="background:#E8F5E9"><span class="ic">🕗</span><span>${esc(t('shift'))}</span></button>
  <button class="wide-tile" id="tComp" style="background:#FFF3E0"><span class="ic">📢</span><span>${esc(t('complaint'))}</span></button>
  <button class="link" id="chgLang">Change language / भाषा बदलें</button>`;
  bindBadge(false);
  refreshVoiceBadge();
  app.querySelectorAll('.tile').forEach((b) => b.addEventListener('click', () => { pendingAnswer = null; location.hash = '#/topic/' + b.dataset.id; }));
  $('#tShift').addEventListener('click', () => { location.hash = '#/shift'; });
  $('#tComp').addEventListener('click', () => { location.hash = '#/complaint'; });
  $('#chgLang').addEventListener('click', () => { location.hash = '#/'; });
  $('#gSpeak').addEventListener('click', () => say(t('welcome')));
  const as = $('#ansSpeak'); if (as) as.addEventListener('click', () => say(ans));
  $('#fab').addEventListener('click', () => openAsk(my));
  if (ans) { say(ans); }
  else if (!welcomed) { welcomed = true; say(t('welcome')); }
}

// ---------------- ask sheet ----------------
function openAsk(my) {
  homeAnswer = null;
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  const usable = sttUsable(lang);
  bg.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(t('ask'))}">
    <button class="close" id="aClose" aria-label="Close">✕</button>
    <h2>${esc(t('ask'))}</h2>
    <button class="micbig" id="aMic" ${usable ? '' : 'disabled'} aria-label="${esc(t('speak'))}">${usable ? '🎤' : '🎤🚫'}</button>
    <div class="status" id="aStatus">${usable ? esc(t('speak')) : esc(t('noMic'))}</div>
    <div class="transcript" id="aTr"></div>
    <input type="text" id="aIn" placeholder="${esc(t('typeHere'))}" aria-label="${esc(t('typeHere'))}">
    <button class="btn-primary" id="aSend">${esc(t('send'))}</button>
    ${t0chips().map((c, i) => `<button class="chip" data-i="${i}">${esc(c)}</button>`).join('')}
  </div>`;
  document.body.appendChild(bg);
  const close = () => { abortListen(); bg.remove(); };
  cleanups.push(close);
  const st = (s) => { $('#aStatus', bg).textContent = s; };
  let busy = false;

  async function submit(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true; $('#aTr', bg).textContent = t('youSaid') + ' ' + text; st(t('checking'));
    const res = await ask(lang, text);
    if (my !== token) return;
    busy = false;
    close();
    if (['PPE', 'FIRE', 'MACHINE', 'CHEMICAL'].includes(res.intent)) { pendingAnswer = { id: res.intent, answer: res.answer }; location.hash = '#/topic/' + res.intent; }
    else if (res.intent === 'SHIFT') location.hash = '#/shift';
    else if (res.intent === 'COMPLAINT') location.hash = '#/complaint';
    else { homeAnswer = res.answer; render(); }
  }

  async function startListen() {
    if (busy) return;
    const mic = $('#aMic', bg);
    mic.classList.add('on'); st(t('listening'));
    try {
      const txt = await listen(lang, (i) => { $('#aTr', bg).textContent = i; });
      mic.classList.remove('on');
      if (my !== token) return;
      submit(txt);
    } catch (e) {
      mic.classList.remove('on');
      if (e.message === 'aborted' || my !== token) return;
      toast(t('noMic')); st(t('typeHere'));
      if (!sttUsable(lang)) { mic.disabled = true; mic.textContent = '🎤🚫'; }
      $('#aIn', bg).focus();
    }
  }

  $('#aClose', bg).addEventListener('click', close);
  $('#aMic', bg).addEventListener('click', () => { if ($('#aMic', bg).classList.contains('on')) abortListen(); else startListen(); });
  $('#aSend', bg).addEventListener('click', () => submit($('#aIn', bg).value));
  $('#aIn', bg).addEventListener('keydown', (e) => { if (e.key === 'Enter') submit($('#aIn', bg).value); });
  bg.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => submit(t0chips()[+c.dataset.i])));
  if (usable) startListen();
}
function t0chips() { return UI.chips[lang]; }

// ---------------- topic ----------------
function screenTopic(id) {
  const my = token;
  const tp = TOPICS[id], d = tp[lang];
  const pa = pendingAnswer && pendingAnswer.id === id ? pendingAnswer : null;
  pendingAnswer = null;
  const showAns = pa && pa.answer !== d.points[0];
  app.innerHTML = `${header(d.title)}
  ${voiceBadge()}
  ${pa ? `<div class="card ans"><span aria-hidden="true">💬</span> ${esc(pa.answer)}</div>` : ''}
  <div class="topic-icon" style="background:${tp.bg}">${tp.icon}</div>
  ${d.points.map((p, i) => `<div class="bullet"><span>${esc(p)}</span><button data-i="${i}" aria-label="${esc(t('listen'))}">🔊</button></div>`).join('')}
  <button class="btn-wide" id="all">🔊 ${esc(t('listen'))}</button>
  <button class="btn-primary" id="now">${esc(t('nowYou'))}</button>`;
  bindHeader();
  refreshVoiceBadge();
  const allBtn = $('#all');
  const allText = (showAns ? pa.answer + ' ' : '') + d.points.join(' ');
  onSpeakingChange((on) => { if (my === token && allBtn.isConnected) allBtn.textContent = (on ? '■ ' : '🔊 ') + t('listen'); });
  app.querySelectorAll('.bullet button').forEach((b) => b.addEventListener('click', () => say(d.points[+b.dataset.i])));
  allBtn.addEventListener('click', () => { if (isSpeaking()) stopSpeak(); else say(allText); });
  $('#now').addEventListener('click', () => { location.hash = '#/check/' + id; });
  say(allText);
}

// ---------------- teach-back ----------------
function screenCheck(id) {
  const my = token;
  const tp = TOPICS[id], d = tp[lang];
  const opts = shuffle(d.options.map((text, idx) => ({ text, idx })));
  app.innerHTML = `${header(d.title, '#/topic/' + id)}
  ${voiceBadge()}
  <p style="margin:12px 0 4px;color:#555">${esc(t('ownWords'))}</p>
  <div class="qtext"><span>${esc(d.q)}</span><button id="qSpeak" aria-label="${esc(t('listen'))}">🔊</button></div>
  <div id="inputs">
    <button class="micbig" id="mic" ${sttUsable(lang) ? '' : 'disabled'} aria-label="${esc(t('speak'))}">${sttUsable(lang) ? '🎤' : '🎤🚫'}</button>
    <div class="status" id="stat">${esc(t('speak'))}</div>
    <div class="transcript" id="tr" aria-live="polite"></div>
    <input type="text" id="typed" placeholder="${esc(t('typeHere'))}" aria-label="${esc(t('typeHere'))}">
    <button class="btn-primary" id="send">${esc(t('send'))}</button>
    <p style="margin:16px 0 0;font-weight:700">${esc(t('orTap'))}</p>
    ${opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o.text)}</button>`).join('')}
  </div>
  <div id="res"></div>`;
  bindHeader('#/topic/' + id);
  refreshVoiceBadge();
  const inputs = $('#inputs');
  const lockInputs = (v) => inputs.querySelectorAll('button,input').forEach((e) => { e.disabled = v; });
  $('#qSpeak').addEventListener('click', () => say(d.q));
  let busy = false;

  function showResult(r, method, answerText) {
    if (my !== token) return;
    addTeachback({ ruleId: id, lang, status: r.status, method, answer: answerText, source: r.source });
    const good = r.status === 'understood';
    const nextId = TOPIC_ORDER[(TOPIC_ORDER.indexOf(id) + 1) % TOPIC_ORDER.length];
    inputs.hidden = true;
    $('#res').innerHTML = `<div class="result ${good ? 'good' : 'bad'}" role="alert"><span class="big">${good ? '✅' : '⚠️'}</span>${esc(r.feedback)}</div>
      <button class="btn-wide" id="rSpeak">🔊 ${esc(t('listen'))}</button>
      ${good
        ? `<button class="btn-good" id="rNext">${esc(TOPICS[nextId][lang].title)} →</button><button class="btn-wide" id="rHome">🏠 ${esc(t('home'))}</button>`
        : `<button class="btn-primary" id="rReplay">${esc(t('replay'))}</button><button class="btn-wide" id="rTry">${esc(t('tryAgain'))}</button>`}`;
    $('#rSpeak').addEventListener('click', () => say(r.feedback));
    if (good) {
      $('#rNext').addEventListener('click', () => { location.hash = '#/topic/' + nextId; });
      $('#rHome').addEventListener('click', () => { location.hash = '#/home'; });
    } else {
      $('#rReplay').addEventListener('click', () => { location.hash = '#/topic/' + id; });
      $('#rTry').addEventListener('click', () => render());
    }
    say(r.feedback);
  }

  async function submitText(text, method) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true; lockInputs(true);
    $('#tr').textContent = t('youSaid') + ' ' + text; $('#stat').textContent = t('checking');
    const r = await judge(lang, id, text);
    busy = false;
    showResult(r, method, text);
  }

  $('#send').addEventListener('click', () => submitText($('#typed').value, 'typed'));
  $('#typed').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitText($('#typed').value, 'typed'); });
  inputs.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
    if (busy) return; busy = true; lockInputs(true);
    const o = opts[+b.dataset.i];
    const good = o.idx === 0;
    showResult({ status: good ? 'understood' : 'confused', feedback: good ? t('understood') : t('confused'), source: 'mock' }, 'tap', o.text);
  }));
  $('#mic').addEventListener('click', async () => {
    const mic = $('#mic');
    if (mic.classList.contains('on')) { abortListen(); return; }
    if (busy) return;
    mic.classList.add('on'); $('#stat').textContent = t('listening');
    try {
      const txt = await listen(lang, (i) => { if (my === token) $('#tr').textContent = i; });
      mic.classList.remove('on');
      if (my !== token) return;
      submitText(txt, 'voice');
    } catch (e) {
      mic.classList.remove('on');
      if (e.message === 'aborted' || my !== token) return;
      $('#stat').textContent = t('speak');
      toast(t('noMic'));
      if (!sttUsable(lang)) { mic.disabled = true; mic.textContent = '🎤🚫'; }
      $('#typed').focus();
    }
  });
  say(d.q);
}

// ---------------- shift ----------------
function screenShift() {
  const dt = new Date(); dt.setDate(dt.getDate() + SHIFT.dayOffset);
  let dateStr;
  try { dateStr = dt.toLocaleDateString(bcpOf(), { weekday: 'long', day: 'numeric', month: 'short' }); }
  catch (e) { dateStr = dt.toDateString(); }
  const spoken = SHIFT.text[lang] + ' ' + SHIFT.leaveText[lang];
  app.innerHTML = `${header(t('shift'))}
  ${voiceBadge()}
  <div class="card"><div style="font-size:42px">🕗</div>
    <div style="font-size:24px;font-weight:700">${esc(dateStr)}</div>
    <div class="shift-time">${SHIFT.start} – ${SHIFT.end}</div>
    <div class="pills"><span class="pill">${SHIFT.type}</span><span class="pill">${SHIFT.line}</span><span class="pill">${SHIFT.supervisor}</span></div></div>
  <div class="bullet"><span>${esc(SHIFT.text[lang])}</span></div>
  <div class="bullet"><span>${esc(SHIFT.leaveText[lang])}</span></div>
  <div class="pills"><span class="pill">Casual ${SHIFT.leave.casual}</span><span class="pill">Sick ${SHIFT.leave.sick}</span></div>
  <button class="btn-primary" id="sp">🔊 ${esc(t('listen'))}</button>`;
  bindHeader();
  refreshVoiceBadge();
  $('#sp').addEventListener('click', () => say(spoken));
  say(spoken);
}

// ---------------- complaint ----------------
function screenComplaint() {
  const my = token;
  const usable = sttUsable(lang);
  app.innerHTML = `${header(t('complaint'))}
  ${voiceBadge()}
  <div class="qtext" style="margin-top:12px"><span>${esc(t('complaintPrompt'))}</span><button id="cSpeak" aria-label="${esc(t('listen'))}">🔊</button></div>
  <div id="form">
    <button class="micbig" id="mic" ${usable ? '' : 'disabled'} aria-label="${esc(t('speak'))}">${usable ? '🎤' : '🎤🚫'}</button>
    <div class="status" id="stat">${esc(usable ? t('speak') : t('noMic'))}</div>
    <textarea id="txt" placeholder="${esc(t('typeHere'))}" aria-label="${esc(t('typeHere'))}"></textarea>
    <label class="chk"><input type="checkbox" id="hide" checked> <span>${esc(t('hideName'))}</span></label>
    <button class="btn-primary" id="sub">${esc(t('submit'))}</button>
  </div>
  <div id="done"></div>`;
  bindHeader();
  refreshVoiceBadge();
  $('#cSpeak').addEventListener('click', () => say(t('complaintPrompt')));
  let busy = false;
  $('#mic').addEventListener('click', async () => {
    const mic = $('#mic');
    if (mic.classList.contains('on')) { abortListen(); return; }
    mic.classList.add('on'); $('#stat').textContent = t('listening');
    try {
      const txt = await listen(lang, (i) => { if (my === token) $('#txt').value = i; });
      mic.classList.remove('on'); if (my !== token) return;
      $('#txt').value = txt; $('#stat').textContent = t('speak');
    } catch (e) {
      mic.classList.remove('on');
      if (e.message === 'aborted' || my !== token) return;
      $('#stat').textContent = t('speak'); toast(t('noMic'));
      if (!sttUsable(lang)) { mic.disabled = true; mic.textContent = '🎤🚫'; }
      $('#txt').focus();
    }
  });
  $('#sub').addEventListener('click', async () => {
    if (busy) return;
    const text = $('#txt').value.trim();
    if (!text) { toast(t('complaintPrompt')); $('#txt').focus(); return; }
    busy = true;
    const hide = $('#hide').checked;
    $('#form').querySelectorAll('button,textarea,input').forEach((e) => { e.disabled = true; });
    $('#stat').textContent = t('checking');
    const r = await complaint(lang, text);
    if (my !== token) return;
    addComplaint({ hide, lang, originalText: text, translatedText: r.translatedText, summaryEn: r.summaryEn, category: r.category, urgent: r.urgent, source: r.source });
    $('#form').hidden = true;
    $('#done').innerHTML = `<div class="result good"><span class="big">✅</span>${esc(t('thanks'))}</div>
      <button class="btn-wide" id="dSpeak">🔊 ${esc(t('listen'))}</button>
      <button class="btn-primary" id="dHome">🏠 ${esc(t('home'))}</button>`;
    $('#dSpeak').addEventListener('click', () => say(t('thanks')));
    $('#dHome').addEventListener('click', () => { location.hash = '#/home'; });
    say(t('thanks'));
  });
}

// ---------------- dashboard ----------------
function screenDashboard() {
  const stop = renderDashboard(app, { badge: badgeHtml });
  cleanups.push(stop);
  bindBadge(false);
}

// ---------------- start ----------------
(async function start() {
  await initMode();
  render();
})();
