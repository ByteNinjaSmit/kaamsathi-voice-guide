// Supervisor dashboard: seed matrix + live logs merged cell by cell. English only.
import { LANGS, TOPICS, TOPIC_ORDER, SEED_MATRIX, SEED_RETRAIN, SEED_COMPLAINTS } from './content.js';
import { getLive, resetLive } from './store.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const LOAD_TS = Date.now();
const langEn = (c) => (LANGS.find((l) => l.code === c) || { en: c }).en;
const isRule = (id) => typeof id === 'string' && Object.hasOwn(TOPICS, id);
const isLang = (c) => typeof c === 'string' && LANGS.some((l) => l.code === c);
const ruleEn = (id) => (isRule(id) ? TOPICS[id].en.title : String(id));
const pct = (c, n) => (n ? Math.round(100 * c / n) : 0);
const pct1 = (c, n) => (n ? Math.round(1000 * c / n) / 10 : 0);
const heatColor = (p) => (p < 20 ? '#E8F5E9' : p < 35 ? '#FFF3C4' : p < 50 ? '#FFE0B2' : p < 70 ? '#FFCDD2' : '#EF9A9A');
const fmtTime = (ts) => { try { return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(ts); } };

// Pure computation, exported for testing.
export function compute(live) {
  const cell = {};
  for (const r of TOPIC_ORDER) { cell[r] = {}; for (const l of LANGS) cell[r][l.code] = SEED_MATRIX[r][l.code].slice(); }
  const valid = [];
  for (const log of live.teachback) {
    if (log && isRule(log.ruleId) && isLang(log.lang) && TOPIC_ORDER.includes(log.ruleId) && Object.hasOwn(cell[log.ruleId], log.lang)) {
      cell[log.ruleId][log.lang][log.status === 'understood' ? 0 : 1] += 1;
      valid.push(log);
    }
  }
  live = { ...live, teachback: valid };
  let sumU = 0, sumC = 0;
  const byRule = {}, byLang = {};
  for (const r of TOPIC_ORDER) byRule[r] = [0, 0];
  for (const l of LANGS) byLang[l.code] = [0, 0];
  for (const r of TOPIC_ORDER) for (const l of LANGS) {
    const [u, c] = cell[r][l.code];
    sumU += u; sumC += c; byRule[r][0] += u; byRule[r][1] += c; byLang[l.code][0] += u; byLang[l.code][1] += c;
  }
  const sessions = sumU + sumC;
  // retraining
  const groups = {};
  for (const log of live.teachback.slice().sort((a, b) => a.ts - b.ts)) {
    const k = log.workerId + '|' + log.ruleId;
    const g = groups[k] || (groups[k] = { workerId: log.workerId, ruleId: log.ruleId, lang: log.lang, confused: 0, latest: null });
    if (log.status === 'confused') g.confused++;
    g.latest = log.status; g.lang = log.lang;
  }
  const liveRetrain = Object.values(groups).filter((g) => g.confused >= 2 && g.latest === 'confused')
    .map((g) => ({ workerId: g.workerId, lang: g.lang, ruleId: g.ruleId, confused: g.confused, live: true }));
  const retrain = liveRetrain.concat(SEED_RETRAIN.map((r) => ({ ...r, live: false })));
  const seedC = SEED_COMPLAINTS.map((c) => ({ ...c, ts: LOAD_TS - c.minutesAgo * 60000 }));
  const complaints = live.complaints.slice().sort((a, b) => b.ts - a.ts).concat(seedC);
  return { cell, sessions, sumU, sumC, byRule, byLang, understoodRate: pct(sumU, sessions), confusedRate: 100 - pct(sumU, sessions), retrain, complaints,
    liveCount: live.teachback.length, liveTeachback: live.teachback };
}

function bars(map, nameOf) {
  const rows = Object.keys(map).map((k) => ({ k, c: map[k][1], n: map[k][0] + map[k][1] })).sort((a, b) => pct1(b.c, b.n) - pct1(a.c, a.n));
  return rows.map((r) => { const p = pct1(r.c, r.n); return `<div class="bar"><span class="nm">${esc(nameOf(r.k))}</span><span class="track"><span class="fill" style="display:block;width:${p}%"></span></span><span class="pc"><b>${p}%</b> (${r.c}/${r.n})</span></div>`; }).join('');
}

export function renderDashboard(el, opts = {}) {
  const expanded = new Set();
  let lastSig = '', stopped = false, busy = false;

  function html(d, live) {
    const heat = `<div class="tblwrap"><table class="heatt"><thead><tr><th>Rule</th>${LANGS.map((l) => `<th>${l.en}</th>`).join('')}</tr></thead><tbody>${
      TOPIC_ORDER.map((r) => `<tr><th>${esc(ruleEn(r))}</th>${LANGS.map((l) => { const [u, c] = d.cell[r][l.code]; const p = pct(c, u + c); return `<td class="heat" style="background:${heatColor(p)}" title="${c} confused of ${u + c}">${p}%</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    const retr = `<div class="tblwrap"><table class="stack compact"><thead><tr><th>Worker</th><th>Language</th><th>Topic</th><th>Confused</th></tr></thead><tbody>${
      d.retrain.map((r) => `<tr><td data-label="Worker">${esc(r.workerId)}${r.live ? '<span class="livepill">LIVE</span>' : ''}</td><td data-label="Language">${esc(langEn(r.lang))}</td><td data-label="Topic">${esc(ruleEn(r.ruleId))}</td><td data-label="Confused">${r.confused}</td></tr>`).join('')}</tbody></table></div>`;
    const comp = `<div class="tblwrap"><table class="stack"><thead><tr><th>Time</th><th>Worker</th><th>Lang</th><th>Category</th><th>Summary</th></tr></thead><tbody>${
      d.complaints.map((c) => `<tr class="crow ${c.urgent ? 'urgent' : ''}" data-id="${esc(c.id)}"><td data-label="Time">${esc(fmtTime(c.ts))}</td><td data-label="Worker">${esc(c.workerId)}${c.seed ? '' : '<span class="livepill">LIVE</span>'}</td><td data-label="Lang">${esc(langEn(c.lang))}</td><td data-label="Category">${esc(c.category)}${c.urgent ? ' <b style="color:#B3261E">URGENT</b>' : ''}</td><td data-label="Summary">${esc(c.summaryEn)}</td></tr>${
        expanded.has(c.id) ? `<tr class="detail"><td colspan="5"><b>Original:</b> ${esc(c.originalText)}<br><b>English:</b> ${esc(c.translatedText)}<br><small>source: ${esc(c.source || 'mock')}</small></td></tr>` : ''}`).join('')}</tbody></table></div>`;
    const recent = d.liveTeachback.slice().sort((a, b) => b.ts - a.ts).slice(0, 5);
    const act = recent.length ? `<div class="tblwrap"><table class="stack"><thead><tr><th>Time</th><th>Lang</th><th>Topic</th><th>Result</th><th>Method</th><th>Source</th></tr></thead><tbody>${
      recent.map((x) => `<tr><td data-label="Time">${esc(fmtTime(x.ts))}</td><td data-label="Lang">${esc(langEn(x.lang))}</td><td data-label="Topic">${esc(ruleEn(x.ruleId))}</td><td data-label="Result">${x.status === 'understood' ? '✅' : '⚠️'} ${esc(x.status)}</td><td data-label="Method">${esc(x.method)}</td><td data-label="Source">${esc(x.source)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p>No live sessions yet</p>';
    return `${opts.badge ? opts.badge() : ''}
    <div class="dash">
    <p style="margin:12px 0 0"><a href="#/" id="dBack">← Worker app</a></p>
    <h1>Understanding dashboard</h1>
    <div class="subt">Proof of understanding, not proof of notice</div>
    <div class="subt sample">Sample data + live results: the 200 seeded sessions and 3 seeded complaints are simulated.</div>
    <div class="kpis">
      <div class="kpi"><div class="v">${d.sessions}</div><div class="l">Sessions ${d.liveCount ? `<span class="live">+${d.liveCount} live</span>` : ''}</div></div>
      <div class="kpi"><div class="v">${d.understoodRate}%</div><div class="l">Understood</div></div>
      <div class="kpi"><div class="v">${d.confusedRate}%</div><div class="l">Confused</div></div>
      <div class="kpi"><div class="v">${d.complaints.length}</div><div class="l">Open complaints</div></div>
    </div>
    <h2>Confusion by rule</h2>${bars(d.byRule, ruleEn)}
    <h2>Confusion by language</h2>${bars(d.byLang, langEn)}
    <h2>Rule x language (% confused)</h2>${heat}
    <h2>Needs retraining</h2>${retr}
    <h2>Complaints</h2>${comp}
    <h2>Latest activity</h2>${act}
    <p style="margin-top:24px"><button id="reset">Reset demo data</button></p>
    </div>`;
  }

  async function refresh(force) {
    if (stopped || busy) return;
    busy = true;
    const raw = await getLive();
    busy = false;
    if (stopped) return;
    const isObj = (x) => x !== null && typeof x === 'object';
    const live = { teachback: raw.teachback.filter(isObj), complaints: raw.complaints.filter(isObj) };
    const sig = JSON.stringify([live.teachback.map((x) => x.id), live.complaints.map((x) => x.id), [...expanded]]);
    if (!force && sig === lastSig) return;
    lastSig = sig;
    const y = window.scrollY;
    try { el.innerHTML = html(compute(live), live); }
    catch (e) { console.warn('dashboard render failed', e); el.innerHTML = '<div class="dash"><p>Dashboard error. Bad log data was ignored; tap Reset below or reload.</p><p><button id="reset">Reset demo data</button></p></div>'; }
    window.scrollTo(0, y);
    el.querySelectorAll('tr.crow').forEach((tr) => tr.addEventListener('click', () => {
      const id = tr.dataset.id;
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      refresh(true);
    }));
    const rb = el.querySelector('#reset');
    if (rb) rb.addEventListener('click', async () => {
      if (!window.confirm('Reset live demo data? Seed data stays.')) return;
      await resetLive(); refresh(true);
    });
  }

  refresh(true);
  const timer = setInterval(() => refresh(false), 2000);
  const onStorage = () => refresh(false);
  window.addEventListener('storage', onStorage);
  return () => { stopped = true; clearInterval(timer); window.removeEventListener('storage', onStorage); };
}
