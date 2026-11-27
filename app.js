/* مطبعتي v1.0.20 */
clearTimeout(window.ldT);
const APP_VERSION = '1.0.20';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en-US', {maximumFractionDigits: 2});
const DEMO = /[?&]demo=1/.test(location.search);
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const TBL = {items:'mt_items', customers:'mt_customers', places:'mt_places', ledger:'mt_ledger'};
const IC = {
  home:'<path d="M3 11l9-8 9 8v10H3z"/>',
  items:'<path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  tool:'<path d="M14.5 6.5a4 4 0 0 0 5 5L10 21a2.1 2.1 0 0 1-3-3zM14.5 6.5l3-3 3 3-3 3"/>',
  wallet:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  back:'<path d="M9 5l7 7-7 7"/>'
};
const svg = n => `<svg viewBox="0 0 24 24">${IC[n]}</svg>`;

let MUT = 0, BM = null, READY = false, sb = null, S = {items:[], customers:[], places:[], ledger:[]}, Q = '';

/* ---------- data ---------- */
/* بيانات الاتصال (مفتاح publishable عام بطبيعته، والأمان من قواعد RLS في قاعدة البيانات) */
const DEFAULT_CFG = {url: 'https://dpxivnzaaqiiiabssrqf.supabase.co', key: 'sb_publishable_Jh23JBER2VljR63DjqKzbg_VdshUnY3'};
function cfg() { try { return JSON.parse(localStorage.getItem('mt_cfg') || 'null') || DEFAULT_CFG; } catch (e) { return DEFAULT_CFG; } }
function tfetch(u, o) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 20000);
  if (o && o.signal) o.signal.addEventListener('abort', () => ac.abort());
  return fetch(u, Object.assign({}, o, {signal: ac.signal})).finally(() => clearTimeout(t));
}
const TMO = 'الاتصال بالسيرفر بطيء أو واقف. اتأكد من النت واضغط إعادة المحاولة.';
function withTmo(p, ms) { return Promise.race([p, new Promise((_, rj) => setTimeout(() => rj(new Error(TMO)), ms))]); }
async function fetchAll(t) {
  let out = [], from = 0;
  for (;;) {
    const {data, error} = await sb.from(TBL[t]).select('*').order('created_at', {ascending: false}).range(from, from + 999);
    if (error) { error.message = 'تحميل ' + t + ': ' + error.message; throw error; }
    out = out.concat(data);
    if (data.length < 1000) return out;
    from += 1000;
  }
}
const CK = 'mt_cache_v1';
function saveCache() { try { localStorage.setItem(CK, JSON.stringify(S)); } catch (e) {} }
function loadCache() {
  try { const c = JSON.parse(localStorage.getItem(CK) || 'null'); if (c && c.items && c.customers && c.places && c.ledger) { S = c; BM = null; return true; } } catch (e) {}
  return false;
}
async function loadAll() {
  if (DEMO) { S = demoData(); BM = null; return; }
  const m0 = MUT;
  const r = await Promise.all(['items', 'customers', 'places', 'ledger'].map(fetchAll));
  if (m0 !== MUT) return;
  S = {items: r[0], customers: r[1], places: r[2], ledger: r[3]}; BM = null; saveCache();
}
async function mut(t, op, row, id) {
  if (DEMO) {
    const a = S[t];
    if (op === 'ins') a.unshift({...row, id: 'd' + Math.random().toString(36).slice(2), created_at: new Date().toISOString()});
    else if (op === 'upd') Object.assign(a.find(x => x.id === id), row);
    else { S[t] = a.filter(x => x.id !== id); if (t === 'customers') S.ledger = S.ledger.filter(x => x.customer_id !== id); }
    render(); return;
  }
  const q = sb.from(TBL[t]); MUT++;
  if (op === 'ins') { const {data, error} = await q.insert(row).select().single(); if (error) throw error; S[t].unshift(data); }
  else if (op === 'upd') { const {data, error} = await q.update(row).eq('id', id).select().single(); if (error) throw error; const i = S[t].findIndex(x => x.id === id); if (i >= 0) S[t][i] = data; }
  else { const {error} = await q.delete().eq('id', id); if (error) throw error; S[t] = S[t].filter(x => x.id !== id); if (t === 'customers') S.ledger = S.ledger.filter(x => x.customer_id !== id); }
  BM = null; saveCache(); render();
}
function errMsg(x) {
  const m = (x && x.message) || '';
  if (/Invalid login/i.test(m)) return 'الإيميل أو كلمة السر غلط';
  if (/abort/i.test(m)) return TMO;
  if (/fetch|network/i.test(m)) return 'مفيش إنترنت أو الاتصال فشل. جرّب تاني.';
  return m || 'حصل خطأ، جرّب تاني';
}
const normNum = s => String(s == null ? '' : s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, m => m === '٫' ? '.' : '').trim();
function num(s) { const v = Number(normNum(s)); if (!isFinite(v) || normNum(s) === '') throw new Error('اكتب رقم صحيح'); return v; }
const today = () => new Date().toISOString().slice(0, 10);

function balance(cid) {
  if (!BM) { BM = {}; S.ledger.forEach(e => { BM[e.customer_id] = (BM[e.customer_id] || 0) + (e.kind === 'debit' ? 1 : -1) * Number(e.amount); }); }
  return BM[cid] || 0;
}
function totals() {
  let debt = 0, cnt = 0, credit = 0;
  S.customers.forEach(c => { const b = balance(c.id); if (b > 0) { debt += b; cnt++; } else if (b < 0) credit += -b; });
  return {debt, cnt, credit};
}
const balHTML = b => b > 0 ? `<span class="m">مدين ${fmt(b)}</span>` : b < 0 ? `<span class="c">دائن ${fmt(-b)}</span>` : '<span class="z">خالص</span>';

/* ---------- views ---------- */
function head(title, sub, opts = {}) {
  return `<div class="top">${opts.back ? `<button class="ib" data-act="back">${svg('back')}</button>` : '<div class="lg">م</div>'}<div class="ti">${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</div>${opts.gear === false ? '' : `<button class="ib" data-act="settings">${svg('gear')}</button>`}</div>`;
}
function nav(v) {
  const L = [['home', 'الرئيسية', 'home'], ['items', 'الأصناف', 'items'], ['customers', 'العملاء', 'user'], ['accounts', 'الحسابات', 'wallet']];
  return `<div class="nav">${L.map(l => `<a href="#/${l[0]}" class="${v === l[0] || (v === 'c' && l[0] === 'accounts') ? 'on' : ''}">${svg(l[2])}${l[1]}</a>`).join('')}</div>`;
}
function searchBox(ph) { return `<div class="sr"><input id="q" placeholder="${ph}" value="${esc(Q)}" autocomplete="off"></div>`; }

let BANON = null;
function showBan(old) {
  if (BANON === null) { BANON = !!(old && S.customers.length && !localStorage.getItem('mt_ban_seen')); if (BANON) localStorage.setItem('mt_ban_seen', '1'); }
  return BANON;
}
window.addEventListener('hashchange', () => { if (BANON) BANON = false; });
function pageHome() {
  const t = totals();
  const lb = +localStorage.getItem('mt_lastbackup') || 0;
  const old = !lb || (Date.now() - lb) > 7 * 864e5;
  const top = S.customers.map(c => ({c, b: balance(c.id)})).filter(x => x.b > 0).sort((a, b) => b.b - a.b).slice(0, 5);
  return head('مطبعتي', 'أهلاً يا سارة') +
    (showBan(old) ? '<div class="ban">آخر نسخة احتياطية قديمة. من ⚙️ اضغط "نسخة احتياطية Excel".</div>' : '') +
    `<div class="big" data-go="accounts" style="cursor:pointer"><div style="font-size:14px">إجمالي الديون الخارجية</div><b>${fmt(t.debt)} ج</b><small>${t.cnt} عميل عليهم مبالغ${t.credit ? ` · ليهم عندنا ${fmt(t.credit)} ج` : ''}</small></div>
    <div class="g">
    <button class="tile" style="border-top-color:var(--t)" data-go="items">${svg('items')}<span>الأصناف<br><small>${S.items.length} صنف</small></span></button>
    <button class="tile" style="border-top-color:var(--p)" data-go="customers">${svg('user')}<span>العملاء<br><small>${S.customers.length} عميل</small></span></button>
    <button class="tile" style="border-top-color:var(--y)" data-go="places">${svg('tool')}<span>أماكن الصيانة<br><small>${S.places.length} مكان</small></span></button>
    <button class="tile" style="border-top-color:var(--k)" data-go="accounts">${svg('wallet')}<span>الحسابات<br><small>دائن ومدين</small></span></button></div>
    ${top.length ? '<div class="h2">أكبر المديونيات</div>' + top.map(x => `<button class="row" data-go="c/${x.c.id}"><span class="n">${esc(x.c.name)}</span>${balHTML(x.b)}</button>`).join('') : ''}` + nav('home');
}
function listItems() {
  const q = Q.trim().toLowerCase();
  const a = S.items.filter(i => !q || (i.name + ' ' + (i.details || '')).toLowerCase().includes(q));
  return a.length ? a.map(i => `<button class="row" data-act="edit-item" data-id="${i.id}"><span class="n">${esc(i.name)}${i.details ? `<span class="d">${esc(i.details)}</span>` : ''}</span><span class="c">${fmt(i.price)} ج</span></button>`).join('') : '<div class="empty">مفيش أصناف. اضغط + عشان تضيف.</div>';
}
function pageItems() { return head('الأصناف', `${S.items.length} صنف`) + searchBox('ابحث عن صنف') + '<div id="list">' + listItems() + '</div>' + `<button class="fab" data-act="add-item">${svg('plus')}</button>` + nav('items'); }
function listCustomers() {
  const q = Q.trim().toLowerCase();
  const a = S.customers.filter(c => !q || (c.name + ' ' + (c.phone || '') + ' ' + (c.address || '')).toLowerCase().includes(q));
  return a.length ? a.map(c => `<button class="row" data-go="c/${c.id}"><span class="n">${esc(c.name)}<span class="d">${esc(c.phone || '')}${c.address ? ' · ' + esc(c.address) : ''}</span></span>${balHTML(balance(c.id))}</button>`).join('') : '<div class="empty">مفيش عملاء. اضغط + عشان تضيف.</div>';
}
function pageCustomers() { return head('العملاء', `${S.customers.length} عميل`) + searchBox('ابحث بالاسم أو الرقم') + '<div id="list">' + listCustomers() + '</div>' + `<button class="fab" data-act="add-customer">${svg('plus')}</button>` + nav('customers'); }
function listPlaces() {
  const q = Q.trim().toLowerCase();
  const a = S.places.filter(p => !q || (p.name + ' ' + (p.service || '') + ' ' + (p.address || '')).toLowerCase().includes(q));
  return a.length ? a.map(p => `<button class="row" data-act="edit-place" data-id="${p.id}"><span class="n">${esc(p.name)}<span class="d">${esc(p.service || '')}${p.address ? ' · ' + esc(p.address) : ''}</span></span><span class="z">${esc(p.phone || '')}</span></button>`).join('') : '<div class="empty">مفيش أماكن صيانة. اضغط + عشان تضيف.</div>';
}
function pagePlaces() { return head('أماكن الصيانة', `${S.places.length} مكان`) + searchBox('ابحث عن مكان') + '<div id="list">' + listPlaces() + '</div>' + `<button class="fab" data-act="add-place">${svg('plus')}</button>` + nav('places'); }
function listAccounts() {
  const q = Q.trim().toLowerCase();
  const a = S.customers.map(c => ({c, b: balance(c.id)})).filter(x => !q || x.c.name.toLowerCase().includes(q)).sort((x, y) => y.b - x.b);
  return a.length ? a.map(x => `<button class="row" data-go="c/${x.c.id}"><span class="n">${esc(x.c.name)}</span>${balHTML(x.b)}</button>`).join('') : '<div class="empty">مفيش عملاء لسه.</div>';
}
function pageAccounts() {
  const t = totals();
  return head('الحسابات', 'دائن ومدين') +
    `<div class="two"><div class="big" style="margin:0;background:linear-gradient(135deg,#e5368a,#f0609f)"><small>مدين (علينا نقبض)</small><b style="font-size:24px">${fmt(t.debt)}</b></div><div class="big" style="margin:0"><small>دائن (علينا ندفع)</small><b style="font-size:24px">${fmt(t.credit)}</b></div></div><div style="height:10px"></div>` +
    searchBox('ابحث عن عميل') + '<div id="list">' + listAccounts() + '</div>' + nav('accounts');
}
function pageCustomer(id) {
  const c = S.customers.find(x => x.id === id);
  if (!c) return head('العميل', '', {back: true, gear: false}) + '<div class="empty">العميل مش موجود.</div>' + nav('accounts');
  const b = balance(id);
  const es = S.ledger.filter(e => e.customer_id === id).sort((x, y) => (y.entry_date + y.created_at).localeCompare(x.entry_date + x.created_at));
  const col = b > 0 ? 'linear-gradient(135deg,#e5368a,#f0609f)' : b < 0 ? 'linear-gradient(135deg,#0e7c86,#16a5a0)' : 'linear-gradient(135deg,#6a8a8d,#8aa6a8)';
  const ph = (c.phone || '').replace(/[^\d+]/g, '');
  return head(c.name, c.phone || '', {back: true, gear: false}) +
    `<div class="bal" style="background:${col}"><small>${b > 0 ? 'مدين (عليه لينا)' : b < 0 ? 'دائن (ليه عندنا)' : 'الحساب خالص'}</small><b>${fmt(Math.abs(b))} ج</b></div>
    <div class="two"><button class="btn p" style="margin:0" data-act="add-debit" data-id="${id}">+ دين عليه</button><button class="btn" style="margin:0" data-act="add-credit" data-id="${id}">+ دفعة منه</button></div>
    <div class="chips">${ph ? `<a href="tel:${esc(ph)}">${svg('phone')}اتصال</a>` : ''}<a href="#" data-act="edit-customer" data-id="${id}">تعديل بيانات العميل</a></div>
    ${c.address ? `<div class="d" style="opacity:.7;font-size:13px;margin:2px 4px">${esc(c.address)}</div>` : ''}
    <div class="h2">سجل الحساب</div>` +
    (es.length ? es.map(e => `<div class="row"><span class="n">${e.kind === 'debit' ? 'دين' : 'دفعة'}${e.note ? ` · ${esc(e.note)}` : ''}<span class="d">${esc(e.entry_date)}</span></span><span><span class="${e.kind === 'debit' ? 'm' : 'c'}">${e.kind === 'debit' ? '+' : '-'}${fmt(e.amount)}</span><button class="x" data-act="del-entry" data-id="${e.id}">حذف</button></span></div>`).join('') : '<div class="empty">مفيش حركات لسه.</div>') + nav('accounts');
}

function render() {
  document.body.classList.remove('lgn');
  BM = null;
  const r = (location.hash || '#/').slice(2).split('/');
  const v = r[0] || 'home';
  const pages = {home: pageHome, items: pageItems, customers: pageCustomers, places: pagePlaces, accounts: pageAccounts, c: () => pageCustomer(r[1])};
  if (!(v in pages)) { location.hash = '#/home'; return; }
  const keep = $('#q') && document.activeElement === $('#q');
  $('#app').innerHTML = pages[v]();
  if (keep && $('#q')) { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  setNavH();
}
function setNavH() { const n = document.querySelector('.nav'); if (n) document.documentElement.style.setProperty('--navh', n.offsetHeight + 'px'); }
window.addEventListener('resize', setNavH);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(setNavH);
function redrawList() {
  const v = (location.hash || '#/').slice(2).split('/')[0];
  const f = {items: listItems, customers: listCustomers, places: listPlaces, accounts: listAccounts}[v];
  if (f && $('#list')) $('#list').innerHTML = f();
}

/* ---------- forms ---------- */
function dlg(msg, ok, cancel, danger) {
  return new Promise(res => {
    let d = document.getElementById('dlg');
    if (!d) { d = document.createElement('div'); d.id = 'dlg'; document.body.appendChild(d); }
    const e = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
    d.innerHTML = `<div class="dbox"><div class="dm">${e(msg)}</div><div class="dbt">${cancel ? `<button type="button" class="dc" data-r="0">${cancel}</button>` : ''}<button type="button" class="dok${danger ? ' dd' : ''}" data-r="1">${ok}</button></div></div>`;
    d.className = 'on';
    d.onclick = ev => {
      const b = ev.target.closest('button[data-r]');
      if (!b && ev.target !== d) return;
      ev.stopPropagation();
      d.className = ''; d.innerHTML = '';
      res(!!b && b.dataset.r === '1');
    };
  });
}
const askC = (m, ok) => dlg(m, ok || 'تأكيد', 'إلغاء', true);
const tell = m => dlg(m, 'تمام', null, false);
function closeModal() { $('#modal').classList.remove('on'); $('#modal').innerHTML = ''; }
function form(title, fields, vals, onSave, onDel, btn) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet"><div class="sh-h">${esc(title)}<button type="button" data-act="close">✕</button></div><form id="f" autocomplete="off">${fields.map(f => `<label>${esc(f.l)}${f.t === 'area' ? `<textarea name="${f.k}" rows="3">${esc(vals[f.k] == null ? '' : vals[f.k])}</textarea>` : `<input name="${f.k}" type="${f.t || 'text'}" ${f.m ? `inputmode="${f.m}"` : ''} value="${esc(vals[f.k] == null ? '' : vals[f.k])}">`}</label>`).join('')}<div class="err" id="ferr"></div><button class="btn ${btn || ''}" type="submit">حفظ</button>${onDel ? '<button type="button" class="btn del" id="fdel">حذف</button>' : ''}</form></div>`;
  m.classList.add('on');
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    const b = e.target.querySelector('.btn'); b.disabled = true;
    try { await onSave(o); closeModal(); } catch (x) { $('#ferr').textContent = errMsg(x); b.disabled = false; }
  };
  if (onDel) $('#fdel').onclick = async () => { if (await askC('متأكد إنك عايز تحذف؟', 'احذف')) { try { await onDel(); closeModal(); } catch (x) { $('#ferr').textContent = errMsg(x); } } };
}
const needName = o => { if (!String(o.name || '').trim()) throw new Error('اكتب الاسم'); return String(o.name).trim(); };
function itemForm(it) {
  form(it ? 'تعديل صنف' : 'صنف جديد', [{k: 'name', l: 'اسم الصنف'}, {k: 'price', l: 'السعر (جنيه)', m: 'decimal'}, {k: 'details', l: 'تفاصيل', t: 'area'}], it || {},
    o => { const row = {name: needName(o), price: num(o.price), details: o.details.trim()}; return it ? mut('items', 'upd', row, it.id) : mut('items', 'ins', row); },
    it && (() => mut('items', 'del', null, it.id)));
}
function customerForm(c) {
  form(c ? 'تعديل عميل' : 'عميل جديد', [{k: 'name', l: 'اسم العميل'}, {k: 'phone', l: 'رقم التليفون', m: 'tel'}, {k: 'address', l: 'العنوان'}, {k: 'notes', l: 'ملاحظات', t: 'area'}], c || {},
    o => { const row = {name: needName(o), phone: o.phone.trim(), address: o.address.trim(), notes: o.notes.trim()}; return c ? mut('customers', 'upd', row, c.id) : mut('customers', 'ins', row); },
    c && (async () => { await mut('customers', 'del', null, c.id); location.hash = '#/customers'; }));
}
function placeForm(p) {
  form(p ? 'تعديل مكان صيانة' : 'مكان صيانة جديد', [{k: 'name', l: 'الاسم'}, {k: 'service', l: 'بيصلّح إيه'}, {k: 'phone', l: 'رقم التليفون', m: 'tel'}, {k: 'address', l: 'العنوان'}, {k: 'notes', l: 'ملاحظات', t: 'area'}], p || {},
    o => { const row = {name: needName(o), service: o.service.trim(), phone: o.phone.trim(), address: o.address.trim(), notes: o.notes.trim()}; return p ? mut('places', 'upd', row, p.id) : mut('places', 'ins', row); },
    p && (() => mut('places', 'del', null, p.id)));
}
function entryForm(cid, kind) {
  const c = S.customers.find(x => x.id === cid);
  form((kind === 'debit' ? 'دين على ' : 'دفعة من ') + c.name, [{k: 'amount', l: 'المبلغ (جنيه)', m: 'decimal'}, {k: 'note', l: 'ملاحظة (اختياري)'}, {k: 'entry_date', l: 'التاريخ', t: 'date'}], {entry_date: today()},
    o => { const a = num(o.amount); if (a <= 0) throw new Error('المبلغ لازم يكون أكبر من صفر'); return mut('ledger', 'ins', {customer_id: cid, kind, amount: a, note: o.note.trim(), entry_date: o.entry_date || today()}); },
    null, kind === 'debit' ? 'p' : '');
}

/* ---------- backup ---------- */
const xe = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
function sheet(name, rows) {
  return `<Worksheet ss:Name="${xe(name)}"><Table>${rows.map(r => `<Row>${r.map(c => typeof c === 'number' ? `<Cell><Data ss:Type="Number">${c}</Data></Cell>` : `<Cell><Data ss:Type="String">${xe(c)}</Data></Cell>`).join('')}</Row>`).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions></Worksheet>`;
}
function backup() {
  const nm = id => (S.customers.find(c => c.id === id) || {}).name || '';
  const sheets = [
    sheet('الأصناف', [['الاسم', 'السعر', 'التفاصيل']].concat(S.items.map(i => [i.name, Number(i.price), i.details || '']))),
    sheet('العملاء', [['الاسم', 'التليفون', 'العنوان', 'ملاحظات', 'الرصيد (موجب = مدين)']].concat(S.customers.map(c => [c.name, c.phone || '', c.address || '', c.notes || '', balance(c.id)]))),
    sheet('أماكن الصيانة', [['الاسم', 'الخدمة', 'التليفون', 'العنوان', 'ملاحظات']].concat(S.places.map(p => [p.name, p.service || '', p.phone || '', p.address || '', p.notes || '']))),
    sheet('الحركات', [['التاريخ', 'العميل', 'النوع', 'المبلغ', 'ملاحظة']].concat(S.ledger.map(e => [e.entry_date, nm(e.customer_id), e.kind === 'debit' ? 'دين عليه' : 'دفعة منه', Number(e.amount), e.note || ''])))
  ];
  const xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' + sheets.join('') + '</Workbook>';
  const fname = 'matbaati-backup-' + today() + '.xls';
  if (NATIVE) {
    (async () => {
      try {
        const C = window.Capacitor || {};
        const call = async (p, m, o) => {
          const tries = [];
          if (C.nativePromise) tries.push(() => C.nativePromise(p, m, o));
          if (C.Plugins && C.Plugins[p] && C.Plugins[p][m]) tries.push(() => C.Plugins[p][m](o));
          if (C.registerPlugin) tries.push(() => C.registerPlugin(p)[m](o));
          let last = new Error('إضافة الملفات مش موجودة');
          for (const t of tries) { try { return await t(); } catch (e) { if (/cancel/i.test(String(e && e.message || e))) throw e; last = e; } }
          throw last;
        };
        const r = await call('Filesystem', 'writeFile', {path: fname, data: xml, directory: 'CACHE', encoding: 'utf8'});
        await call('Share', 'share', {title: 'نسخة مطبعتي الاحتياطية', url: r.uri, dialogTitle: 'احفظ أو ابعت النسخة'});
        localStorage.setItem('mt_lastbackup', String(Date.now()));
      } catch (e) { if (!/cancel/i.test(String(e && e.message || e))) tell('تعذر عمل النسخة: ' + errMsg(e)); }
    })();
    return;
  }
  const blob = new Blob([xml], {type: 'application/vnd.ms-excel'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  localStorage.setItem('mt_lastbackup', String(Date.now()));
  setTimeout(() => URL.revokeObjectURL(a.href), 20000);
}
function settings() {
  const lb = +localStorage.getItem('mt_lastbackup');
  $('#modal').innerHTML = `<div class="sheet"><div class="sh-h">الإعدادات<button type="button" data-act="close">✕</button></div>
  <button class="btn" data-act="backup">نسخة احتياطية Excel</button>
  <div class="sub" style="text-align:center;margin:6px 0 14px">آخر نسخة: ${lb ? new Date(lb).toLocaleDateString('ar-EG') : 'لسه ماعملتش'}</div>
  <button class="btn w" data-act="refresh">تحديث البيانات</button>
  ${DEMO ? '' : '<button class="btn del" data-act="logout">تسجيل خروج</button>'}
  <div class="sub" style="text-align:center;margin-top:14px">مطبعتي · نسخة ${APP_VERSION}</div></div>`;
  $('#modal').classList.add('on');
}

/* ---------- auth screens ---------- */
function setupScreen() {
  $('#app').innerHTML = `<div class="center"><div class="lg">م</div><h1>مطبعتي</h1><p>أول مرة بس: الصق بيانات الاتصال بقاعدة البيانات</p>
  <form id="sf"><label>رابط المشروع (Project URL)<input name="url" dir="ltr" placeholder="https://xxxx.supabase.co" autocapitalize="off"></label>
  <label>المفتاح (anon public key)<textarea name="key" dir="ltr" rows="3" autocapitalize="off"></textarea></label><div class="err" id="ferr"></div><button class="btn" type="submit">حفظ واتصال</button></form></div>`;
  $('#sf').onsubmit = e => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    const url = o.url.trim().replace(/\/+$/, ''), key = o.key.replace(/\s+/g, '');
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) { $('#ferr').textContent = 'الرابط لازم يبقى بالشكل https://xxxx.supabase.co'; return; }
    if (key.length < 40) { $('#ferr').textContent = 'المفتاح ناقص. انسخه كله.'; return; }
    localStorage.setItem('mt_cfg', JSON.stringify({url, key})); boot();
  };
}
function loginScreen() {
  document.body.classList.add('lgn');
  $('#app').innerHTML = `<div class="lw"><div class="lgo">م</div><div class="lt">مطبعتي</div><div class="lh">سجّل دخولك عشان تبدأ</div>
  <form id="lf"><input class="f1" name="email" type="email" placeholder="البريد الإلكتروني" autocomplete="username" autocapitalize="off">
  <input class="f2" name="pw" type="password" placeholder="كلمة السر" autocomplete="current-password"><button class="lb" type="submit">دخول</button><div class="err" id="ferr"></div></form>
  <div class="forgot">نسيت كلمة السر؟</div>
  <div class="dots"><b style="background:var(--t)"></b><b style="background:var(--p)"></b><b style="background:var(--y)"></b><b style="background:var(--k)"></b></div></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    const b = e.target.querySelector('.lb'); b.disabled = true;
    const {error} = await sb.auth.signInWithPassword({email: o.email.trim(), password: o.pw});
    if (error) { $('#ferr').textContent = errMsg(error); $('#ferr').style.marginTop = '10px'; b.disabled = false; return; }
    boot();
  };
}

/* ---------- boot & events ---------- */
async function boot() {
  clearTimeout(window.ldT);
  READY = false;
  if (DEMO) { await loadAll(); if (!location.hash) location.hash = '#/home'; render(); return; }
  const c = cfg();
  if (!c) { setupScreen(); return; }
  if (!sb) sb = supabase.createClient(c.url, c.key, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: async (n, t, fn) => await fn()}, global: {fetch: tfetch}});
  let data; try { ({data} = await withTmo(sb.auth.getSession(), 12000)); } catch (e) { $('#app').innerHTML = `<div class="empty">${esc(errMsg(e))}<br><br><button class="btn" onclick="boot()">إعادة المحاولة</button></div>`; return; }
  if (!data.session) { loginScreen(); return; }
  if (loadCache()) {
    READY = true;
    if (!location.hash) location.hash = '#/home';
    render();
    const m0 = MUT;
    loadAll().then(() => { if (m0 === MUT) render(); }).catch(() => {});
    return;
  }
  $('#app').innerHTML = '<div class="empty">جاري التحميل…</div>';
  try { await withTmo(loadAll(), 25000); } catch (e) {
    $('#app').innerHTML = `<div class="empty">${esc(errMsg(e))}<br><br><button class="btn" onclick="boot()">إعادة المحاولة</button></div>`; return;
  }
  READY = true;
  if (!location.hash) location.hash = '#/home';
  render();
}
document.addEventListener('click', async e => {
  const g = e.target.closest('[data-go]'); if (g) { Q = ''; location.hash = '#/' + g.dataset.go; return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (el.tagName === 'A') e.preventDefault();
  if (a === 'close') closeModal();
  else if (a === 'back') { if (history.length > 1) history.back(); else location.hash = '#/customers'; }
  else if (a === 'settings') settings();
  else if (a === 'backup') backup();
  else if (a === 'refresh') { const before = JSON.stringify(S); try { await withTmo(loadAll(), 25000); } catch (x) { closeModal(); tell('تعذر التحديث: ' + errMsg(x)); return; } render(); closeModal(); tell(JSON.stringify(S) === before ? 'لا يوجد تحديث، البيانات محدثة' : 'تم تحديث البيانات'); }
  else if (a === 'logout') { { await sb.auth.signOut(); try { localStorage.removeItem(CK); } catch (e) {} closeModal(); boot(); } }
  else if (a === 'add-item') itemForm();
  else if (a === 'edit-item') itemForm(S.items.find(x => x.id === id));
  else if (a === 'add-customer') customerForm();
  else if (a === 'edit-customer') customerForm(S.customers.find(x => x.id === id));
  else if (a === 'add-place') placeForm();
  else if (a === 'edit-place') placeForm(S.places.find(x => x.id === id));
  else if (a === 'add-debit') entryForm(id, 'debit');
  else if (a === 'add-credit') entryForm(id, 'credit');
  else if (a === 'del-entry') { if (await askC('حذف الحركة دي؟', 'احذف')) { try { await mut('ledger', 'del', null, id); } catch (x) { tell(errMsg(x)); } } }
});
document.addEventListener('input', e => { if (e.target.id === 'q') { Q = e.target.value; redrawList(); } });
window.addEventListener('hashchange', () => { Q = ''; if (READY || DEMO) render(); window.scrollTo(0, 0); });

if ('serviceWorker' in navigator && !DEMO && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}

/* ---------- demo data (only for ?demo=1 previews) ---------- */
function demoData() {
  const d = (n, x) => ({id: n, created_at: '2026-11-0' + (1 + (x || 0) % 9), ...{}});
  const cust = [['أحمد محمود', '01012345678', 'شارع النصر، الإسكندرية'], ['مكتبة النور', '01123456789', 'محطة الرمل'], ['شركة الأمل للدعاية', '01234567890', 'سموحة'], ['محمد سعيد', '01098765432', 'العجمي'], ['صيدلية الشفاء', '01155554444', 'كفر عبده']];
  const customers = cust.map((c, i) => ({id: 'c' + i, name: c[0], phone: c[1], address: c[2], notes: '', created_at: '2026-11-0' + (i + 1)}));
  const L = [['c0', 'debit', 8200, 'طباعة كروت وفلايرات', '2026-11-10'], ['c0', 'credit', 2000, 'دفعة نقدي', '2026-11-18'], ['c1', 'debit', 3500, 'بانرات', '2026-11-05'], ['c1', 'credit', 5000, 'دفعة مقدمة', '2026-11-12'], ['c2', 'debit', 24000, 'حملة إعلانية', '2026-11-14'], ['c2', 'credit', 6000, '', '2026-11-20'], ['c3', 'debit', 15000, 'ستيكرات وعلب', '2026-11-16'], ['c4', 'debit', 1200, 'أكياس مطبوعة', '2026-11-22']];
  const ledger = L.map((e, i) => ({id: 'l' + i, customer_id: e[0], kind: e[1], amount: e[2], note: e[3], entry_date: e[4], created_at: e[4] + 'T10:0' + i}));
  const items = [['كارت شخصي (1000 كارت)', 350, 'ورق كوشيه 300 جم، وش وظهر'], ['بانر فينيل', 85, 'سعر المتر'], ['فلاير A5', 600, '1000 فلاير، كوشيه 150 جم'], ['ستيكر قص', 120, 'سعر المتر'], ['علب كرتون مطبوعة', 14, 'سعر العلبة، من 500']].map((x, i) => ({id: 'i' + i, name: x[0], price: x[1], details: x[2], created_at: '2026-11-0' + (i + 1)}));
  const places = [['ورشة الأوفست - م. حسن', 'صيانة ماكينات الأوفست', '01011112222', 'المنطقة الصناعية'], ['مركز الأمانة', 'قطع غيار وطابعات', '01122223333', 'وسط البلد'], ['الفني سامي', 'سكاكين وقص', '01233334444', 'برج العرب']].map((x, i) => ({id: 'p' + i, name: x[0], service: x[1], phone: x[2], address: x[3], notes: '', created_at: '2026-11-0' + (i + 1)}));
  return {items, customers, places, ledger};
}
boot();
