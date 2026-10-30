// KaamSathi server: zero dependencies. Static files + /api/health + /api/ai + /api/logs
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Safety net: a bad request must never end the demo.
process.on('unhandledRejection', (e) => console.warn('[unhandledRejection]', e && e.message));
process.on('uncaughtException', (e) => console.warn('[uncaughtException]', e && e.message));

const PORT = process.env.PORT || 3000;
const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

const logs = { teachback: [], complaints: [] }; // P1 in-memory store

const RULES = 'Factory rules:\nPPE: Always wear a helmet near machines. Wear safety shoes on the shop floor.\nFIRE: When the fire alarm rings, stop work and walk to the green EXIT sign. Do not use the lift. Never block the exit door.\nMACHINE: Never remove the machine guard. Switch off the machine before cleaning or repairing it.\nCHEMICAL: Wear gloves and goggles when using chemicals. If a chemical touches your skin, wash with water for 15 minutes.';

const cap = (v) => String(v == null ? '' : v).slice(0, 600);

function buildRequest(task, b) {
  const langName = cap(b.langName) || 'English';
  let SYS, USER, SCHEMA;
  if (task === 'ask') {
    const question = cap(b.question);
    SYS = `You are KaamSathi, a safety helper for migrant factory workers in India who have little schooling. Reply only with JSON that matches the schema. Write "answer" in ${langName}, in its native script, in at most 2 very short, simple sentences. Use only the factory rules given. Never invent numbers, policies or medical advice. If the rules do not cover the question, say in ${langName}: "Please ask your supervisor."`;
    USER = `${RULES}\n\nIntents: PPE, FIRE, MACHINE, CHEMICAL, SHIFT (shift timing, leave, duty), COMPLAINT (worker wants to report a problem), OTHER.\nWorker question (may contain speech-to-text errors): <<<${question}>>>`;
    SCHEMA = { type:'OBJECT', properties:{ intent:{ type:'STRING', enum:['PPE','FIRE','MACHINE','CHEMICAL','SHIFT','COMPLAINT','OTHER'] }, answer:{ type:'STRING' } }, required:['intent','answer'] };
  } else if (task === 'teachback') {
    const ruleEn = cap(b.ruleEn), questionEn = cap(b.questionEn), keyIdea = cap(b.keyIdea), answer = cap(b.answer);
    SYS = `You check whether a factory worker understood a safety rule. The worker's answer may be in Hindi, Bengali, Odia, Tamil or English, may mix languages or use Latin script, and may contain speech-to-text errors. Judge the meaning, not grammar or exact words. Reply only with JSON that matches the schema.`;
    USER = `Rule (English): ${ruleEn}\nQuestion asked: ${questionEn}\nKey idea the answer must contain: ${keyIdea}\nWorker's answer (${langName}): <<<${answer}>>>\n\nSet status to "understood" only if the answer contains the key idea and says nothing unsafe. Set status to "confused" if the answer is wrong, unsafe, empty, off-topic, or says they do not know.\nfeedback: one short, kind sentence in ${langName} native script, at most 12 words. If confused, state the correct action simply.\nreasonEn: at most 12 English words for the supervisor.`;
    SCHEMA = { type:'OBJECT', properties:{ status:{ type:'STRING', enum:['understood','confused'] }, feedback:{ type:'STRING' }, reasonEn:{ type:'STRING' } }, required:['status','feedback','reasonEn'] };
  } else if (task === 'complaint') {
    const text = cap(b.text);
    SYS = `You help an HR team understand complaints from factory workers. Reply only with JSON that matches the schema. Be faithful; do not add facts.`;
    USER = `Complaint spoken in ${langName} (may contain speech-to-text errors): <<<${text}>>>\ntranslatedText: faithful English translation.\nsummaryEn: one line for HR, at most 15 words.\ncategory: one of Pay, Safety, Harassment, Facilities, Shift, Other.\nurgent: true if it mentions injury, danger, harassment or women's safety.`;
    SCHEMA = { type:'OBJECT', properties:{ translatedText:{ type:'STRING' }, summaryEn:{ type:'STRING' }, category:{ type:'STRING', enum:['Pay','Safety','Harassment','Facilities','Shift','Other'] }, urgent:{ type:'BOOLEAN' } }, required:['translatedText','summaryEn','category','urgent'] };
  } else return null;
  return { systemInstruction:{ parts:[{ text:SYS }] }, contents:[{ role:'user', parts:[{ text:USER }] }],
    generationConfig:{ responseMimeType:'application/json', responseSchema:SCHEMA, temperature:0.2 } };
}

async function callGemini(reqBody) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const r = await fetch(url, { method:'POST', signal:ctl.signal,
      headers:{ 'Content-Type':'application/json', 'x-goog-api-key':KEY }, body:JSON.stringify(reqBody) });
    if (!r.ok) throw new Error('gemini http ' + r.status);
    const j = await r.json();
    const text = j.candidates[0].content.parts.map((p) => p.text || '').join('');
    return JSON.parse(text);
  } finally { clearTimeout(t); }
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(body);
}

function readBody(req, limit = 20000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, over = false;
    req.on('data', (c) => {
      if (over) return;
      size += c.length;
      if (size > limit) { over = true; chunks.length = 0; const e = new Error('too large'); e.status = 413; reject(e); }
      else chunks.push(c);
    });
    req.on('end', () => {
      if (over) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { e.status = 400; reject(e); }
    });
    req.on('error', reject);
  });
}

// ---- /api/logs hardening (no login: whitelists, size limits, same-origin check, rate limit, admin token for reset) ----
const RULE_IDS = ['PPE', 'FIRE', 'MACHINE', 'CHEMICAL'];
const LANG_IDS = ['hi', 'bn', 'or', 'ta', 'en'];
const STATUSES = ['understood', 'confused'];
const METHODS = ['voice', 'typed', 'tap'];
const SOURCES = ['mock', 'gemini'];
const CATEGORIES = ['Pay', 'Safety', 'Harassment', 'Facilities', 'Shift', 'Other'];
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(4).toString('hex');
const has = (arr, v) => typeof v === 'string' && arr.includes(v);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const isPlain = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const idOk = (v) => typeof v === 'string' && /^[\w-]{1,64}$/.test(v);
const tsOk = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

function cleanTeachback(i) {
  if (!isPlain(i) || !idOk(i.id) || !tsOk(i.ts)) return null;
  if (!has(RULE_IDS, i.ruleId) || !has(LANG_IDS, i.lang) || !has(STATUSES, i.status) || !has(METHODS, i.method)) return null;
  return { id: i.id, workerId: str(i.workerId, 32) || 'W-001', ruleId: i.ruleId, lang: i.lang, status: i.status, method: i.method,
    answer: str(i.answer, 300), source: has(SOURCES, i.source) ? i.source : 'mock', ts: i.ts };
}
function cleanComplaint(i) {
  if (!isPlain(i) || !idOk(i.id) || !tsOk(i.ts)) return null;
  if (!has(LANG_IDS, i.lang) || !has(CATEGORIES, i.category)) return null;
  return { id: i.id, workerId: str(i.workerId, 32) || 'Anonymous', lang: i.lang, originalText: str(i.originalText, 600),
    translatedText: str(i.translatedText, 600), summaryEn: str(i.summaryEn, 600), category: i.category, urgent: i.urgent === true,
    source: has(SOURCES, i.source) ? i.source : 'mock', ts: i.ts };
}

const FORWARD_HDRS = ['x-forwarded-for', 'x-forwarded-host', 'forwarded', 'x-real-ip'];
function hostName(req) { return String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '').replace(/^\[|\]$/g, ''); }
// True only for a direct request from this laptop (not through a tunnel and not via the LAN address).
function isLocalDirect(req) {
  if (FORWARD_HDRS.some((h) => req.headers[h])) return false;
  return ['localhost', '127.0.0.1', '::1'].includes(hostName(req)) && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
}
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host.toLowerCase() === String(req.headers.host || '').toLowerCase(); } catch (e) { return false; }
}
function isAdmin(req) {
  if (isLocalDirect(req)) return true;
  const a = Buffer.from(String(req.headers['x-admin-token'] || '')), b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const hits = new Map();
function rateLimited(req, bucket, max) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').toString().split(',')[0].trim();
  const k = bucket + '|' + ip, now = Date.now();
  if (hits.size > 5000) hits.clear();
  let h = hits.get(k);
  if (!h || now > h.reset) { h = { n: 0, reset: now + 60000 }; hits.set(k, h); }
  return ++h.n > max;
}
function bodyFail(res, e) {
  const status = e && e.status === 413 ? 413 : 400;
  res.setHeader('Connection', 'close');
  if (status === 413) res.once('finish', () => res.req.destroy());
  return send(res, status, { ok:false, error: status === 413 ? 'too large' : 'bad request' });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health' && req.method === 'GET') return send(res, 200, { live: !!KEY, model: MODEL });
  if (pathname === '/api/ai' && req.method === 'POST') {
    if (rateLimited(req, 'ai', 60)) return send(res, 429, { ok:false, error:'slow down' });
    let b;
    try { b = await readBody(req); } catch (e) { return bodyFail(res, e); }
    if (!isPlain(b)) return send(res, 400, { ok:false, error:'bad request' });
    const reqBody = buildRequest(b.task, b);
    if (!reqBody) return send(res, 400, { ok:false, error:'unknown task' });
    if (!KEY) return send(res, 503, { ok:false, error:'no key' });
    try { return send(res, 200, { ok:true, data: await callGemini(reqBody) }); }
    catch (e) { console.warn('[ai] failed:', e.message); return send(res, 502, { ok:false, error:'ai failed' }); }
  }
  if (pathname === '/api/logs') {
    if (req.method === 'GET') return send(res, 200, logs);
    if (req.method === 'DELETE') {
      if (!isAdmin(req)) return send(res, 403, { ok:false, error:'admin token required' });
      logs.teachback = []; logs.complaints = []; return send(res, 200, { ok:true });
    }
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, { ok:false, error:'cross-origin' });
      if (rateLimited(req, 'logs', 120)) return send(res, 429, { ok:false, error:'slow down' });
      let b;
      try { b = await readBody(req); } catch (e) { return bodyFail(res, e); }
      if (!isPlain(b)) return send(res, 400, { ok:false });
      let arr = null, item = null;
      if (b.kind === 'teachback') { arr = logs.teachback; item = cleanTeachback(b.item); }
      else if (b.kind === 'complaint') { arr = logs.complaints; item = cleanComplaint(b.item); }
      if (!arr || !item) return send(res, 400, { ok:false, error:'invalid item' });
      if (!arr.some((x) => x.id === item.id)) { arr.push(item); if (arr.length > 500) arr.shift(); }
      return send(res, 200, { ok:true });
    }
  }
  return send(res, 404, { ok:false, error:'not found' });
}

async function handle(req, res) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end('bad'); }
  if (pathname.includes('\0')) { res.writeHead(400); return res.end('bad'); }
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.normalize(path.join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type':'text/plain' }); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}

const server = http.createServer((req, res) => {
  Promise.resolve().then(() => handle(req, res)).catch((e) => {
    console.warn('[request failed]', e && e.message);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type':'text/plain' });
    res.end('error');
  });
});

server.listen(PORT, () => {
  console.log(`KaamSathi on http://localhost:${PORT}`);
  console.log(KEY ? `mode: live (${MODEL})` : 'mode: mock');
  console.log(`admin token (only needed to reset the dashboard through a tunnel or LAN address): ${ADMIN_TOKEN}`);
});
