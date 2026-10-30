// localStorage first; P1 fire-and-forget sync to the server log store.
const K_TB = 'ks_logs_v1', K_C = 'ks_complaints_v1';
let serverOk = false;
export function setServerOk(v) { serverOk = !!v; }

function read(k) { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
function post(kind, item) {
  if (!serverOk) return;
  try { fetch('/api/logs', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ kind, item }) }).catch(() => {}); } catch (e) { /* ignore */ }
}

export function addTeachback(o) {
  const item = { id: 'tb_' + Date.now() + '_' + Math.floor(Math.random() * 1000), workerId: 'W-001', ruleId: o.ruleId, lang: o.lang,
    status: o.status, method: o.method, answer: String(o.answer || '').slice(0, 300), source: o.source || 'mock', ts: Date.now() };
  const a = read(K_TB); a.push(item); write(K_TB, a);
  post('teachback', item);
  return item;
}

export function addComplaint(o) {
  const item = { id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000), workerId: o.hide ? 'Anonymous' : 'W-001', lang: o.lang,
    originalText: o.originalText, translatedText: o.translatedText, summaryEn: o.summaryEn, category: o.category, urgent: !!o.urgent,
    source: o.source || 'mock', ts: Date.now() };
  const a = read(K_C); a.push(item); write(K_C, a);
  post('complaint', item);
  return item;
}

function merge(local, remote) {
  const seen = new Set(), out = [];
  for (const x of local.concat(remote || [])) { if (x && !seen.has(x.id)) { seen.add(x.id); out.push(x); } }
  return out.sort((a, b) => a.ts - b.ts);
}

// Async: localStorage merged with the server store (when reachable).
export async function getLive() {
  const local = { teachback: read(K_TB), complaints: read(K_C) };
  if (!serverOk) return local;
  try {
    const r = await fetch('/api/logs', { cache: 'no-store' });
    if (!r.ok) return local;
    const s = await r.json();
    return { teachback: merge(local.teachback, s.teachback), complaints: merge(local.complaints, s.complaints) };
  } catch (e) { return local; }
}

export async function resetLive() {
  try { localStorage.removeItem(K_TB); localStorage.removeItem(K_C); } catch (e) { /* ignore */ }
  if (serverOk) {
    try {
      let r = await fetch('/api/logs', { method: 'DELETE' });
      if (r.status === 403) { // opened through a tunnel or LAN address: the server wants its admin token (printed in its console)
        const tok = window.prompt('Admin token (shown in the server console):');
        if (tok) r = await fetch('/api/logs', { method: 'DELETE', headers: { 'X-Admin-Token': tok } });
      }
    } catch (e) { /* ignore */ }
  }
}

export function getLocalTeachbacks() { return read(K_TB); }
