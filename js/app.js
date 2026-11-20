/* =====================================================================
   বদরকণ্ঠ তারুণ্য মঞ্চ — রক্তদাতা তালিকা
   একটি ফাইলে পুরো অ্যাপ: রাউটার, ডেটা, ভিউ, অথ, ড্যাশবোর্ড, PWA
   ===================================================================== */
(() => {
'use strict';

/* ইমেইলের লিংকে চাপ দিয়ে সাইটে ফিরলে ঠিকানার হ্যাশে টোকেন বা ত্রুটির তথ্য থাকে। Supabase সেটা মুছে ফেলার আগেই ধরে রাখা */
const LANDING = (() => {
  const h = (location.hash || '').replace(/^#/, '');
  if (!h || h.startsWith('/')) return null;
  const p = new URLSearchParams(h);
  const type = p.get('type'), error = p.get('error_code') || p.get('error');
  if (!p.get('access_token') && !error && !type) return null;
  return { type: type || '', error: error || '' };
})();
const SITE_URL = location.origin + location.pathname;

/* কোনো ত্রুটি হলে পেজ খালি না রেখে স্ক্রিনে কারণ দেখানো */
function showFatal(msg) {
  const app = document.getElementById('app');
  if (!app || app.dataset.fatal) return;
  app.dataset.fatal = '1';
  const box = document.createElement('div');
  box.style.cssText = 'margin:24px 16px;padding:18px;border:2px solid #c2455a;border-radius:16px;background:rgba(194,69,90,.12);font:15px/1.6 system-ui,sans-serif;word-break:break-word';
  box.innerHTML = '<b>সাইট চালু হতে সমস্যা হয়েছে।</b><br>এই লেখাটির ছবি তুলে Claude-কে পাঠান:<br><code></code>';
  box.querySelector('code').textContent = String(msg);
  app.appendChild(box);
}
window.addEventListener('error', (e) => showFatal((e.message || 'error') + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : '')));
window.addEventListener('unhandledrejection', (e) => showFatal('promise: ' + ((e.reason && e.reason.message) || e.reason)));

/* ---------------------------------------------------------------- কনফিগ */
const CFG = window.APP_CONFIG || {};
const GAP_DAYS = Number(CFG.DONATION_GAP_DAYS) || 120;
const CONFIGURED = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && !/YOUR_/i.test(CFG.SUPABASE_URL + CFG.SUPABASE_ANON_KEY));
let sb = null;
if (CONFIGURED && window.supabase) {
  try { sb = window.supabase.createClient(String(CFG.SUPABASE_URL).trim(), String(CFG.SUPABASE_ANON_KEY).trim(), { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } }); }
  catch (e) { console.error(e); setTimeout(() => showFatal('Supabase কনফিগ ভুল: ' + e.message + ' — js/config.js-এর লাইন ৯ ও ১০ দেখুন'), 0); }
}
const DEMO = !sb;
const DEMO_MSG = 'এটি ডেমো মোড। js/config.js-এ Supabase-এর তথ্য বসালে এই কাজ চালু হবে।';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const BLOOD_BN = { 'A+': 'এ পজিটিভ', 'A-': 'এ নেগেটিভ', 'B+': 'বি পজিটিভ', 'B-': 'বি নেগেটিভ', 'O+': 'ও পজিটিভ', 'O-': 'ও নেগেটিভ', 'AB+': 'এবি পজিটিভ', 'AB-': 'এবি নেগেটিভ' };
const DISTRICTS = (window.DISTRICTS || []).slice();
const PAGE = 12;

const DEFAULTS = {
  org_name: 'বদরকণ্ঠ তারুণ্য মঞ্চ',
  tagline: 'শিক্ষার্থীদের স্বেচ্ছাসেবী উদ্যোগ — প্রয়োজনের মুহূর্তে রক্তদাতা খুঁজে পাওয়া হোক সহজ।',
  about_text:
    'বদরকণ্ঠ তারুণ্য মঞ্চ একটি অরাজনৈতিক, অলাভজনক ও স্বেচ্ছাসেবী শিক্ষার্থী সংগঠন। আমরা বিশ্বাস করি, তারুণ্যের শক্তি যখন মানবতার কাজে লাগে, তখনই সমাজে সত্যিকারের পরিবর্তন আসে।\n\n' +
    'জরুরি মুহূর্তে এক ব্যাগ রক্ত অনেক সময় একটি জীবন বাঁচিয়ে দেয়। কিন্তু ঠিক সময়ে সঠিক গ্রুপের রক্তদাতাকে খুঁজে পাওয়া সবসময় সহজ হয় না। এই সমস্যার সমাধানে আমরা শিক্ষার্থীরা মিলে তৈরি করেছি এই রক্তদাতা তালিকা, যেখানে যে কেউ ব্লাড গ্রুপ ও এলাকা অনুযায়ী রক্তদাতা খুঁজে নিতে পারেন, সম্পূর্ণ বিনা খরচে।\n\n' +
    'এখানে তালিকাভুক্ত প্রত্যেকে স্বেচ্ছায় ও নিজের সম্মতিতে যুক্ত হয়েছেন। রক্ত আমাদের কাছে বিক্রির নয়, মানবতার উপহার। আপনিও যুক্ত হতে পারেন — আপনার একটি সিদ্ধান্ত বাঁচিয়ে দিতে পারে কারও জীবন।',
  contact_phone: '01XXXXXXXXX',
  contact_email: 'info@example.com',
  contact_facebook: '',
  contact_address: 'আপনার এলাকা, জেলা',
  dev_name: 'ডেভেলপারের নাম',
  dev_role: 'ওয়েব ডেভেলপার',
  dev_bio: 'এই ওয়েবসাইটটি বদরকণ্ঠ তারুণ্য মঞ্চের জন্য তৈরি। রক্তদাতা ও রক্তগ্রহীতার মধ্যে সেতুবন্ধন গড়াই এর উদ্দেশ্য।',
  dev_email: 'dev@example.com',
  dev_phone: '01XXXXXXXXX',
  dev_facebook: '',
  donation_note: 'আপনার দেওয়া অর্থ সংগঠনের মানবিক কাজ, যেমন রক্তদান কর্মসূচি ও সচেতনতামূলক উদ্যোগে ব্যয় হবে।',
  auto_approve: 'false'
};

const SETTING_FIELDS = [
  { group: 'সংগঠন', items: [
    ['org_name', 'সংগঠনের নাম', 'text'],
    ['tagline', 'ট্যাগলাইন (হোমপেজে)', 'text'],
    ['about_text', 'সংগঠন পরিচিতি (অনুচ্ছেদ আলাদা করতে ফাঁকা লাইন দিন)', 'textarea']
  ] },
  { group: 'যোগাযোগ', items: [
    ['contact_phone', 'ফোন নম্বর', 'text'],
    ['contact_email', 'ইমেইল', 'text'],
    ['contact_facebook', 'ফেসবুক পেজের লিংক', 'text'],
    ['contact_address', 'ঠিকানা', 'text']
  ] },
  { group: 'ডেভেলপার পরিচিতি', items: [
    ['dev_name', 'নাম', 'text'],
    ['dev_role', 'পরিচয় / পদবি', 'text'],
    ['dev_bio', 'সংক্ষিপ্ত পরিচিতি', 'textarea'],
    ['dev_email', 'ইমেইল', 'text'],
    ['dev_phone', 'ফোন', 'text'],
    ['dev_facebook', 'ফেসবুক / প্রোফাইল লিংক', 'text']
  ] },
  { group: 'ডোনেশন পেজ', items: [['donation_note', 'ডোনেশন পেজের বার্তা', 'textarea']] },
  { group: 'রেজিস্ট্রেশন', items: [['auto_approve', 'নতুন রক্তদাতা মডারেটরের অনুমোদন ছাড়াই সরাসরি তালিকায় আসবে', 'toggle']] }
];

const PAY_KINDS = [['bkash', 'বিকাশ'], ['nagad', 'নগদ'], ['rocket', 'রকেট'], ['bank', 'ব্যাংক'], ['other', 'অন্যান্য']];
const ROLE_BN = { donor: 'রক্তদাতা', moderator: 'মডারেটর', admin: 'অ্যাডমিন', developer: 'ডেভেলপার' };
const PANEL_BN = { donor: 'আমার প্রোফাইল', moderator: 'মডারেটর প্যানেল', admin: 'অ্যাডমিন প্যানেল', developer: 'ডেভেলপার প্যানেল' };
const NOTICE_DURATIONS = [[24, '২৪ ঘণ্টা'], [48, '২ দিন'], [72, '৩ দিন'], [168, '১ সপ্তাহ']];
const isModRole = (r) => r === 'moderator' || r === 'admin' || r === 'developer';
const isAdminRole = (r) => r === 'admin' || r === 'developer';
const STATUS_BN = { pending: 'অপেক্ষমাণ', approved: 'অনুমোদিত', rejected: 'বাতিল' };

/* ---------------------------------------------------------------- আইকন */
const ICONS = {
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  droplet: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  phone2: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ভেরিফিকেশন ব্যাজ: ডেভেলপার = সবুজ, অ্যাডমিন = নীল, মডারেটর = লাল */
const BADGE_TITLE = { developer: 'যাচাইকৃত ডেভেলপার', admin: 'যাচাইকৃত অ্যাডমিন', moderator: 'যাচাইকৃত মডারেটর' };
const badge = (role) => !BADGE_TITLE[role] ? '' :
  `<span class="vb vb-${role}" title="${BADGE_TITLE[role]}" aria-label="${BADGE_TITLE[role]}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.4 1.7 2.9-.2 1.2 2.7 2.6 1.4-.4 2.9L22 12l-1.3 2 .4 2.9-2.6 1.4-1.2 2.7-2.9-.2L12 22.5l-2.4-1.7-2.9.2-1.2-2.7-2.6-1.4.4-2.9L2 12l1.3-2-.4-2.9 2.6-1.4 1.2-2.7 2.9.2z" fill="currentColor"/><path d="M8 12.2l2.7 2.7L16.2 9.4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

/* ---------------------------------------------------------------- হেল্পার */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BN_D = '০১২৩৪৫৬৭৮৯';
const bn = (v) => String(v).replace(/\d/g, (d) => BN_D[d]);
const en = (v) => String(v).replace(/[০-৯]/g, (d) => BN_D.indexOf(d));
const normPhone = (v) => en(v).replace(/[\s\-().]/g, '').replace(/^\+?88(?=01)/, '');
const isPhone = (p) => /^01[3-9]\d{8}$/.test(p);
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const parseDate = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const fmtD = (d) => d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDate = (s) => fmtD(parseDate(s));
const daysSince = (s) => Math.floor((new Date().setHours(0, 0, 0, 0) - parseDate(s)) / 86400000);
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return d; };
const isReady = (s) => !s || daysSince(s) >= GAP_DAYS;
const relPast = (iso) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
  if (m < 1) return 'এইমাত্র';
  if (m < 60) return bn(m) + ' মিনিট আগে';
  if (m < 1440) return bn(Math.floor(m / 60)) + ' ঘণ্টা আগে';
  return bn(Math.floor(m / 1440)) + ' দিন আগে';
};
const relLeft = (iso) => {
  const m = Math.floor((new Date(iso) - Date.now()) / 60000);
  if (m <= 0) return 'মেয়াদ শেষ';
  if (m < 60) return 'আরও ' + bn(m) + ' মিনিট';
  if (m < 1440) return 'আরও ' + bn(Math.floor(m / 60)) + ' ঘণ্টা';
  return 'আরও ' + bn(Math.floor(m / 1440)) + ' দিন';
};
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const paragraphs = (t) => String(t || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

function errMsg(e) {
  const m = String((e && e.message) || e || '');
  const c = e && e.code;
  if (c === '23505' || /duplicate key/i.test(m)) return 'এই মোবাইল নম্বর দিয়ে আগেই নিবন্ধন করা হয়েছে।';
  if (c === '42501' || /row-level security|permission denied/i.test(m)) return 'এই কাজের অনুমতি আপনার নেই।';
  if (/Invalid login credentials/i.test(m)) return 'ইমেইল বা পাসওয়ার্ড ভুল।';
  if (/Email not confirmed/i.test(m)) return 'আপনার ইমেইল এখনও যাচাই করা হয়নি। ইনবক্স দেখুন।';
  if (/already registered/i.test(m)) return 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। লগইন করুন।';
  if (/at least \d+ characters|Password should/i.test(m)) return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
  if (/rate limit|too many/i.test(m)) return 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'ইন্টারনেট সংযোগ পরীক্ষা করুন।';
  if (m === 'DEMO') return DEMO_MSG;
  return m || 'কিছু একটা ভুল হয়েছে, আবার চেষ্টা করুন।';
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 450); }, 4200);
}

function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> অপেক্ষা করুন…'; }
  else { btn.disabled = false; btn.innerHTML = label || btn.dataset.label || btn.innerHTML; }
}

/* মোডাল */
function openModal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-back" data-close></div><div class="modal-sheet glass" role="dialog" aria-modal="true">${html}</div>`;
  requestAnimationFrame(() => m.classList.add('open'));
  document.body.classList.add('lock');
  const first = $('input, select, textarea, button', m.querySelector('.modal-sheet'));
  if (first && !matchMedia('(pointer: coarse)').matches) first.focus();
  return m.querySelector('.modal-sheet');
}
function closeModal() {
  const m = $('#modal');
  m.classList.remove('open');
  document.body.classList.remove('lock');
  setTimeout(() => { if (!m.classList.contains('open')) m.innerHTML = ''; }, 400);
}
function confirmBox(message, okLabel = 'নিশ্চিত') {
  return new Promise((resolve) => {
    const sheet = openModal(`<h2>নিশ্চিত করুন</h2><p>${esc(message)}</p>
      <div class="actions"><button class="btn btn-danger" data-ok type="button">${esc(okLabel)}</button><button class="btn btn-ghost" data-no type="button">বাতিল</button></div>`);
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('[data-ok]')) { closeModal(); resolve(true); }
      else if (e.target.closest('[data-no]')) { closeModal(); resolve(false); }
    });
    $('#modal .modal-back').addEventListener('click', () => resolve(false));
  });
}

/* ---------------------------------------------------------------- স্টেট */
const S = { user: null, role: 'anon', donor: null, settings: { ...DEFAULTS }, installEvt: null };

/* ---------------------------------------------------------------- ডেমো ডেটা */
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const DEMO_DONORS = [
  ['রাকিবুল ইসলাম', 'O+', 'ঢাকা', 'মিরপুর', 200], ['তানজিলা আক্তার', 'A+', 'চট্টগ্রাম', 'পাঁচলাইশ', null],
  ['সাদমান সাকিব', 'B+', 'ঢাকা', 'উত্তরা', 45], ['মেহজাবিন হক', 'AB+', 'রাজশাহী', 'বোয়ালিয়া', 300],
  ['ফারহান আহমেদ', 'O-', 'সিলেট', 'জিন্দাবাজার', null], ['নুসরাত জাহান', 'A-', 'কুমিল্লা', 'কান্দিরপাড়', 150],
  ['আরিফুল হাসান', 'B-', 'খুলনা', 'সোনাডাঙ্গা', 20], ['সুমাইয়া আক্তার', 'O+', 'ময়মনসিংহ', 'গাঙ্গিনারপাড়', 400],
  ['ইমরান হোসেন', 'AB-', 'বরিশাল', 'কাউনিয়া', null], ['তাসনিম রহমান', 'A+', 'ঢাকা', 'ধানমন্ডি', 130],
  ['মাহিন চৌধুরী', 'O+', 'গাজীপুর', 'টঙ্গী', 90], ['জান্নাতুল ফেরদৌস', 'B+', 'রংপুর', 'কাউনিয়া', 260]
].map((r, i) => ({ id: 'demo' + i, name: r[0], blood_group: r[1], phone: '017000000' + String(i + 10), district: r[2], area: r[3], last_donation: r[4] == null ? null : ago(r[4]), status: 'approved' }));
const DEMO_NOTICES = [
  { id: 'n1', title: 'রক্তদান কর্মসূচি', body: 'এই শুক্রবার সকাল ১০টা থেকে বিকাল ৪টা পর্যন্ত স্কুল মাঠে রক্তদান কর্মসূচি। সবাইকে আন্তরিক আমন্ত্রণ।', author_name: 'অ্যাডমিন', author_role: 'admin', created_at: new Date(Date.now() - 3600e3).toISOString(), expires_at: new Date(Date.now() + 2 * 86400e3).toISOString() },
  { id: 'n2', title: 'জরুরি: ও নেগেটিভ রক্ত দরকার', body: 'সদর হাসপাতালে একজন রোগীর জন্য জরুরি ভিত্তিতে ও নেগেটিভ রক্ত প্রয়োজন।', author_name: 'ডেভেলপার', author_role: 'developer', created_at: new Date(Date.now() - 7200e3).toISOString(), expires_at: new Date(Date.now() + 20 * 3600e3).toISOString() }
];
const DEMO_PAYMENTS = [
  { id: 'p1', name: 'বিকাশ', kind: 'bkash', number: '01XXXXXXXXX', account_type: 'পার্সোনাল' },
  { id: 'p2', name: 'নগদ', kind: 'nagad', number: '01XXXXXXXXX', account_type: 'পার্সোনাল' },
  { id: 'p3', name: 'রকেট', kind: 'rocket', number: '01XXXXXXXXX', account_type: 'পার্সোনাল' }
];

/* ---------------------------------------------------------------- ডেটা লেয়ার */
const demoOnly = () => { throw new Error('DEMO'); };
const clean = (s) => String(s || '').replace(/[,()%*\\"'`;]/g, ' ').trim().slice(0, 40);

const API = {
  async settings() {
    if (DEMO) return {};
    const { data, error } = await sb.from('site_settings').select('key,value');
    if (error) throw error;
    return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  },
  async saveSettings(obj) {
    if (DEMO) demoOnly();
    const rows = Object.entries(obj).map(([key, value]) => ({ key, value: String(value ?? '') }));
    const { error } = await sb.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
  },
  async payments(all = false) {
    if (DEMO) return DEMO_PAYMENTS;
    let q = sb.from('payment_methods').select('*').order('sort_order');
    if (!all) q = q.eq('active', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async savePayment(m) {
    if (DEMO) demoOnly();
    const row = { name: m.name, kind: m.kind, number: m.number, account_type: m.account_type, active: m.active, sort_order: m.sort_order };
    const q = m.id ? sb.from('payment_methods').update(row).eq('id', m.id) : sb.from('payment_methods').insert(row);
    const { data, error } = await q.select().single();
    if (error) throw error;
    return data;
  },
  async deletePayment(id) {
    if (DEMO) demoOnly();
    const { error } = await sb.from('payment_methods').delete().eq('id', id);
    if (error) throw error;
  },
  async notices(all = false) {
    if (DEMO) return DEMO_NOTICES;
    let q = sb.from('notices').select('*').order('created_at', { ascending: false }).limit(all ? 100 : 50);
    if (!all) q = q.gt('expires_at', new Date().toISOString());
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async createNotice(n) {
    if (DEMO) demoOnly();
    const { data, error } = await sb.from('notices').insert(n).select().single();
    if (error) throw error;
    return data;
  },
  async deleteNotice(id) {
    if (DEMO) demoOnly();
    const { error } = await sb.from('notices').delete().eq('id', id);
    if (error) throw error;
  },
  async deleteUser(id) {
    if (DEMO) demoOnly();
    const { error } = await sb.rpc('delete_user_account', { target: id });
    if (error) throw error;
  },
  async recordVisit() {
    if (DEMO) return;
    let id = store.get('vid');
    if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); store.set('vid', id); }
    S.vid = id;
    await sb.rpc('record_visit', { p_visitor: id });
  },
  async recordNoticeViews(list) {
    if (DEMO || !S.vid) return;
    let seen = []; try { seen = JSON.parse(sessionStorage.getItem('seenN') || '[]'); } catch { /* ignore */ }
    const ids = list.map((n) => n.id).filter((id) => !seen.includes(id)).slice(0, 50);
    if (!ids.length) return;
    try { sessionStorage.setItem('seenN', JSON.stringify(seen.concat(ids))); } catch { /* ignore */ }
    await sb.rpc('record_notice_views', { p_ids: ids, p_visitor: S.vid });
  },
  async visitStats() {
    if (DEMO) demoOnly();
    const { data, error } = await sb.rpc('visit_stats');
    if (error) throw error;
    return data;
  },
  async noticeViewCounts() {
    if (DEMO) return {};
    const { data, error } = await sb.rpc('notice_view_counts');
    if (error) throw error;
    return Object.fromEntries((data || []).map((r) => [r.notice_id, Number(r.viewers)]));
  },
  async stats() {
    const by = {}; let total = 0;
    if (DEMO) { DEMO_DONORS.forEach((d) => { by[d.blood_group] = (by[d.blood_group] || 0) + 1; total++; }); return { total, by }; }
    const { data, error } = await sb.rpc('donor_stats');
    if (error) throw error;
    (data || []).forEach((r) => { by[r.blood_group] = Number(r.total); total += Number(r.total); });
    return { total, by };
  },
  async search({ group, district, q, page }) {
    const from = page * PAGE;
    if (DEMO) {
      let rows = DEMO_DONORS.filter((d) => (!group || d.blood_group === group) && (!district || d.district === district) &&
        (!q || d.name.includes(q) || d.area.includes(q)));
      rows = rows.sort((a, b) => (a.last_donation || '') < (b.last_donation || '') ? -1 : 1);
      return { rows: rows.slice(from, from + PAGE), total: rows.length };
    }
    let query = sb.from('donors').select('id,name,blood_group,phone,district,area,last_donation', { count: 'exact' }).eq('status', 'approved');
    if (group) query = query.eq('blood_group', group);
    if (district) query = query.eq('district', district);
    const t = clean(q);
    if (t) query = query.or(`name.ilike.%${t}%,area.ilike.%${t}%`);
    const { data, error, count } = await query
      .order('last_donation', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    return { rows: data || [], total: count ?? (data || []).length };
  },
  async adminList({ status, q, page, size = 20 }) {
    if (DEMO) demoOnly();
    let query = sb.from('donors').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    const t = clean(q);
    if (t) query = query.or(`name.ilike.%${t}%,area.ilike.%${t}%,phone.ilike.%${t}%`);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(page * size, page * size + size - 1);
    if (error) throw error;
    return { rows: data || [], total: count ?? 0 };
  },
  async pendingCount() {
    if (DEMO) return 0;
    const { count, error } = await sb.from('donors').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    return error ? 0 : (count || 0);
  },
  async myDonor(uid) {
    const { data, error } = await sb.from('donors').select('*').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    return data;
  },
  async createDonor(row) {
    if (DEMO) demoOnly();
    const { data, error } = await sb.from('donors').insert(row).select().single();
    if (error) throw error;
    return data;
  },
  async updateDonor(id, row) {
    if (DEMO) demoOnly();
    const { data, error } = await sb.from('donors').update(row).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteDonor(id) {
    if (DEMO) demoOnly();
    const { error } = await sb.from('donors').delete().eq('id', id);
    if (error) throw error;
  },
  async users() {
    if (DEMO) demoOnly();
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return data || [];
  },
  async setRole(id, role) {
    if (DEMO) demoOnly();
    const { error } = await sb.from('profiles').update({ role }).eq('id', id);
    if (error) throw error;
  }
};

/* ---------------------------------------------------------------- থিম */
function applyTheme(t, save = true) {
  document.documentElement.dataset.theme = t;
  if (save) store.set('theme', t);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = t === 'dark' ? '#091014' : '#f3efee';
  const b = $('#themeBtn');
  if (b) { b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', t === 'dark' ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'); }
}
const toggleTheme = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

/* ---------------------------------------------------------------- নেভিগেশন */
function navItems() {
  const items = [
    ['', 'হোম', 'home'], ['search', 'রক্তদাতা খুঁজুন', 'search'], ['register', 'রক্তদাতা হোন', 'user-plus'],
    ['notices', 'নোটিশ বোর্ড', 'bell'], ['donate', 'ডোনেশন', 'heart'], ['about', 'আমাদের সম্পর্কে', 'info'], ['developer', 'ডেভেলপার পরিচিতি', 'code']
  ];
  if (S.user) {
    items.push(['dashboard', PANEL_BN[S.role] || PANEL_BN.donor, 'user']);
  } else items.push(['login', 'লগইন', 'log-in']);
  return items;
}
function renderNav(active = currentPath()) {
  $('#drawerLinks').innerHTML = '<button class="install-row js-install" type="button" style="--i:0"></button>' + navItems().map(([p, l, ic], i) =>
    `<a href="#/${p}" style="--i:${i}" class="${p === active ? 'on' : ''}">${icon(ic)}<span>${l}</span></a>`).join('') +
    (S.user ? `<a href="#/" data-logout style="--i:9">${icon('log-out')}<span>লগআউট</span></a>` : '');
  const bottom = [['', 'হোম', 'home'], ['search', 'খুঁজুন', 'search'], ['register', 'রক্তদাতা হোন', 'user-plus'], ['notices', 'নোটিশ', 'bell'], ['donate', 'ডোনেশন', 'heart']];
  $('#bottomNav').innerHTML = bottom.map(([p, l, ic]) => `<a href="#/${p}" class="${p === active ? 'on' : ''}">${icon(ic)}<span>${l}</span></a>`).join('');
  updateInstallUI();
}
const setDrawer = (open) => {
  document.body.classList.toggle('drawer-open', open);
  $('#menuBtn').setAttribute('aria-expanded', String(open));
  $('#drawer').setAttribute('aria-hidden', String(!open));
};

/* ---------------------------------------------------------------- সেটিংস প্রয়োগ */
function applySettings() {
  $$('[data-org-name]').forEach((el) => { el.textContent = S.settings.org_name; });
}

/* ---------------------------------------------------------------- ইনস্টল (PWA) */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function updateInstallUI() {
  const done = isStandalone();
  $$('.js-install').forEach((b) => {
    b.hidden = false;
    b.classList.toggle('is-done', done);
    b.innerHTML = done ? `${icon('check')}<span>অ্যাপ ইনস্টল করা আছে</span>` : `${icon('download')}<span>অ্যাপ হিসেবে ইনস্টল করুন</span>`;
  });
}
async function doInstall() {
  if (isStandalone()) { toast('অ্যাপটি আগেই ইনস্টল করা আছে।', 'success'); return; }
  if (S.installEvt) {
    S.installEvt.prompt();
    await S.installEvt.userChoice.catch(() => {});
    S.installEvt = null;
    return;
  }
  const sheet = openModal(`<h2>অ্যাপ হিসেবে ইনস্টল করুন</h2>
    <p><b>অ্যান্ড্রয়েড (Chrome):</b> ডানদিকের উপরের তিন-ফোঁটা মেনু থেকে <b>“হোম স্ক্রিনে যোগ করুন”</b> বা <b>“Install app”</b> চাপুন।</p>
    <p><b>আইফোন (Safari):</b> নিচের <b>Share</b> বাটন চেপে <b>“Add to Home Screen”</b> বেছে নিন।</p>
    <p class="muted">ইনস্টল করলে হোম স্ক্রিনে আইকন বসবে এবং সাইটটি পুরো স্ক্রিনে অ্যাপের মতো খুলবে।</p>
    <div class="actions"><button class="btn btn-primary" data-close type="button">বুঝেছি</button></div>`);
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
}

/* ---------------------------------------------------------------- অথ */
async function fetchRole() {
  if (!S.user) return;
  const { data, error } = await sb.from('profiles').select('role').eq('id', S.user.id).maybeSingle();
  if (error) { S.roleError = error.message || String(error); return; }
  S.roleError = '';
  S.role = (data && data.role) || 'donor';
}
async function setSession(session) {
  S.user = session ? session.user : null;
  S.role = 'anon'; S.donor = null; S.roleError = '';
  if (!S.user) return;
  S.role = 'donor';
  try { await fetchRole(); } catch (e) { S.roleError = String(e && e.message || e); }
  try { S.donor = await API.myDonor(S.user.id); } catch { S.donor = null; }
}
async function loadMine() {
  if (!S.user) return;
  try { S.donor = await API.myDonor(S.user.id); } catch { /* ignore */ }
}
async function flushPending() {
  const raw = store.get('pendingDonor');
  if (!raw || !S.user) return;
  store.del('pendingDonor');
  if (S.donor) return;
  try {
    const v = JSON.parse(raw);
    S.donor = await API.createDonor(pickDonor(v, S.user.id));
    toast('আপনার রক্তদাতা তথ্য জমা হয়েছে।', 'success');
  } catch (e) { toast('তথ্য জমা দেওয়া যায়নি: ' + errMsg(e), 'error'); }
}
async function initAuth() {
  if (DEMO) return;
  try {
    const { data } = await sb.auth.getSession();
    await setSession(data.session);
    await flushPending();
  } catch { /* ignore */ }
  sb.auth.onAuthStateChange((evt, session) => {
    setTimeout(async () => {
      if (evt === 'PASSWORD_RECOVERY') { if (currentPath() !== 'reset') location.hash = '#/reset'; return; }
      if (evt === 'INITIAL_SESSION') return;
      const had = S.user && S.user.id;
      await setSession(session);
      if (evt === 'SIGNED_IN' && !had) await flushPending();
      renderNav();
      if (evt === 'SIGNED_OUT' && currentPath() === 'dashboard') location.hash = '#/login';
    }, 0);
  });
}
/* ---------------------------------------------------------------- রাউটার */
const routes = {};
let rt = 0;
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (/access_token=|refresh_token=|type=(recovery|signup|magiclink|invite)|error_description=/.test(h)) return { path: '', params: new URLSearchParams() };
  const [path, qs = ''] = h.split('?');
  return { path, params: new URLSearchParams(qs) };
}
const currentPath = () => parseHash().path;

async function route() {
  const my = ++rt;
  const alive = () => my === rt;
  const { path, params } = parseHash();
  const app = $('#app');
  const view = routes[path] || viewNotFound;
  setDrawer(false);
  renderNav(path);
  try { await view(app, params, alive); }
  catch (e) { if (alive()) app.innerHTML = `<section class="container narrow"><div class="glass form-card"><h1 class="page-title">কিছু একটা ভুল হয়েছে</h1><p class="muted">${esc(errMsg(e))}</p><a class="btn btn-primary" href="#/">হোমে ফিরুন</a></div></section>`; }
  if (!alive()) return;
  app.classList.remove('page-in'); void app.offsetWidth; app.classList.add('page-in');
  window.scrollTo(0, 0);
  updateInstallUI();
  const titles = { verified: 'ইমেইল যাচাই', reset: 'নতুন পাসওয়ার্ড', 'auth-error': 'লিংকে সমস্যা', notices: 'নোটিশ বোর্ড', search: 'রক্তদাতা খুঁজুন', register: 'রক্তদাতা হোন', donate: 'ডোনেশন', about: 'আমাদের সম্পর্কে', developer: 'ডেভেলপার পরিচিতি', login: 'লগইন', dashboard: 'ড্যাশবোর্ড' };
  document.title = (titles[path] ? titles[path] + ' · ' : '') + S.settings.org_name;
}

const bigIcon = (n, c) => `<div class="big-ic ${c || ''}">${icon(n)}</div>`;

routes.verified = async (app) => {
  app.innerHTML = '<section class="container narrow"><div class="glass form-card"><div class="skel" style="height:120px"></div></div></section>';
  try { await S.authReady; } catch { /* ignore */ }
  const extra = S.donor ? `<div class="note ok">${icon('check')}<span>আপনার রক্তদাতা তথ্যও জমা হয়েছে${S.donor.status === 'pending' ? ', মডারেটরের অনুমোদনের পর তালিকায় আসবে' : ''}।</span></div>` : '';
  app.innerHTML = `<section class="container narrow"><div class="glass form-card" style="text-align:center;justify-items:center">
    ${bigIcon('check', 'ok')}<h1 class="page-title" style="margin:0">ইমেইল যাচাই সফল হয়েছে</h1>
    <p class="muted">ধন্যবাদ! আপনার অ্যাকাউন্ট এখন চালু হয়ে গেছে।</p>${extra}
    <div class="cta">${S.user ? `<a class="btn btn-primary" href="#/dashboard">${icon('user')} আমার প্রোফাইলে যান</a>` : `<a class="btn btn-primary" href="#/login">${icon('log-in')} লগইন করুন</a>`}<a class="btn btn-ghost" href="#/">${icon('home')} হোমে যান</a></div>
  </div></section>`;
};

routes.reset = async (app) => {
  if (DEMO) { app.innerHTML = demoCard('নতুন পাসওয়ার্ড'); return; }
  app.innerHTML = '<section class="container narrow"><div class="glass form-card"><div class="skel" style="height:160px"></div></div></section>';
  try { await S.authReady; } catch { /* ignore */ }
  if (!S.user) {
    app.innerHTML = `<section class="container narrow"><div class="glass form-card" style="text-align:center;justify-items:center">${bigIcon('alert', 'bad')}
      <h1 class="page-title" style="margin:0">লিংকটি আর কাজ করছে না</h1>
      <p class="muted">পাসওয়ার্ড বদলানোর লিংকের মেয়াদ শেষ হয়ে গেছে বা আগেই ব্যবহার করা হয়েছে। লগইন পেজে গিয়ে "পাসওয়ার্ড ভুলে গেছেন?" চেপে নতুন লিংক নিন।</p>
      <a class="btn btn-primary" href="#/login">${icon('log-in')} লগইন পেজে যান</a></div></section>`;
    return;
  }
  app.innerHTML = `<section class="container narrow"><div class="glass form-card">
    <div style="text-align:center;display:grid;justify-items:center;gap:6px">${bigIcon('shield')}<h1 class="page-title" style="margin:0">নতুন পাসওয়ার্ড দিন</h1>
    <p class="muted">${esc(S.user.email || '')}</p></div>
    <form id="resetForm" novalidate>
      <div class="field"><label for="np1">নতুন পাসওয়ার্ড <small>(কমপক্ষে ৬ অক্ষর)</small></label><input id="np1" type="password" minlength="6" autocomplete="new-password" required></div>
      <div class="field"><label for="np2">আবার একই পাসওয়ার্ড লিখুন</label><input id="np2" type="password" minlength="6" autocomplete="new-password" required></div>
      <p class="form-msg" id="resetMsg" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit">${icon('check')} পাসওয়ার্ড বদলান</button>
    </form></div></section>`;
  $('#resetForm', app).addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = $('#np1', app).value, b = $('#np2', app).value, msg = $('#resetMsg', app);
    if (a.length < 6) { msg.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।'; return; }
    if (a !== b) { msg.textContent = 'দুটি পাসওয়ার্ড মিলছে না। আবার লিখুন।'; return; }
    const btn = $('button[type="submit"]', e.target); setBusy(btn, true);
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { msg.textContent = errMsg(error); setBusy(btn, false); return; }
    app.innerHTML = `<section class="container narrow"><div class="glass form-card" style="text-align:center;justify-items:center">${bigIcon('check', 'ok')}
      <h1 class="page-title" style="margin:0">পাসওয়ার্ড বদলানো হয়েছে</h1><p class="muted">এখন থেকে নতুন পাসওয়ার্ড দিয়ে লগইন করবেন।</p>
      <a class="btn btn-primary" href="#/dashboard">${icon('user')} আমার প্রোফাইলে যান</a></div></section>`;
  });
};

routes['auth-error'] = async (app, params) => {
  const code = params.get('c') || '';
  const expired = /otp_expired|expired|invalid/i.test(code);
  app.innerHTML = `<section class="container narrow"><div class="glass form-card" style="text-align:center;justify-items:center">${bigIcon('alert', 'bad')}
    <h1 class="page-title" style="margin:0">${expired ? 'লিংকটির মেয়াদ শেষ' : 'যাচাই করা যায়নি'}</h1>
    <p class="muted">${expired ? 'এই লিংকটির মেয়াদ শেষ হয়ে গেছে বা আগেই ব্যবহার করা হয়েছে।' : 'লিংকে কোনো সমস্যা হয়েছে।'}</p>
    <div class="note">${icon('info')}<span>অনেক ইমেইল অ্যাপ লিংক আগেই একবার খুলে দেখে, তাই আপনার ইমেইল ইতিমধ্যে যাচাই হয়ে থাকতে পারে। আগে লগইন করে দেখুন। না হলে "পাসওয়ার্ড ভুলে গেছেন?" দিয়ে নতুন লিংক নিন।</span></div>
    <a class="btn btn-primary" href="#/login">${icon('log-in')} লগইন পেজে যান</a></div></section>`;
};

function viewNotFound(app) {
  app.innerHTML = `<section class="container narrow"><div class="glass form-card" style="text-align:center"><h1 class="page-title">পেজটি পাওয়া যায়নি</h1><a class="btn btn-primary" href="#/">${icon('home')} হোমে ফিরুন</a></div></section>`;
}
function demoCard(title) {
  return `<section class="container narrow"><div class="glass form-card"><h1 class="page-title">${esc(title)}</h1>
    <div class="note warn">${icon('alert')}<span>${DEMO_MSG}</span></div><a class="btn btn-primary" href="#/">${icon('home')} হোমে ফিরুন</a></div></section>`;
}

/* ---------------------------------------------------------------- হোম */
routes[''] = async (app, p, alive) => {
  const s = S.settings;
  app.innerHTML = `
  <section class="container hero"><div class="hero-card glass">
    <div class="hero-mark"><img class="logo-light" src="assets/logo-mark.png" alt="${esc(s.org_name)} লোগো"><img class="logo-dark" src="assets/logo-mark-dark.png" alt="${esc(s.org_name)} লোগো"></div>
    <span class="eyebrow">${esc(s.org_name)}</span>
    <h1>রক্ত দিন, <span class="grad">জীবন বাঁচান</span></h1>
    <p class="lead">${esc(s.tagline)}</p>
    <div class="cta">
      <a class="btn btn-primary" href="#/search">${icon('search')} রক্তদাতা খুঁজুন</a>
      <a class="btn btn-ghost" href="#/register">${icon('user-plus')} রক্তদাতা হোন</a>
    </div>
  </div></section>

  <section class="container" id="homeNotices" hidden><div class="between"><h2 class="sec-title" style="margin-bottom:0">${icon('bell')} নোটিশ বোর্ড</h2><a href="#/notices" class="btn btn-ghost btn-sm">সব দেখুন ${icon('arrow')}</a></div>
    <div class="cards cards-notice" id="hnList" style="margin-top:14px"></div></section>

  <section class="container"><h2 class="sec-title">কোন গ্রুপের রক্ত প্রয়োজন?</h2>
    <div class="group-grid">${BLOOD.map((g) => `<a class="group-tile" href="#/search?group=${encodeURIComponent(g)}"><span class="drop"><span>${g}</span></span><small data-count="${esc(g)}">${BLOOD_BN[g]}</small></a>`).join('')}</div>
    <div class="stats">
      <div class="stat glass"><b id="statTotal">—</b><span>মোট রক্তদাতা</span></div>
      <div class="stat glass"><b>${bn(8)}</b><span>রক্তের গ্রুপ</span></div>
      <div class="stat glass"><b>ফ্রি</b><span>সম্পূর্ণ বিনামূল্যে</span></div>
    </div>
  </section>

  <section class="container"><h2 class="sec-title">কীভাবে কাজ করে</h2>
    <div class="steps">
      <div class="step glass"><b>গ্রুপ বেছে নিন</b><p>যে ব্লাড গ্রুপ দরকার সেটি নির্বাচন করুন, চাইলে জেলা ও এলাকাও দিন।</p></div>
      <div class="step glass"><b>যোগাযোগ করুন</b><p>তালিকার কার্ড থেকে সরাসরি কল বা মেসেজ করে রক্তদাতার সাথে কথা বলুন।</p></div>
      <div class="step glass"><b>জীবন বাঁচান</b><p>প্রয়োজনের সময় একটি ব্যাগ রক্ত বাঁচিয়ে দিতে পারে একটি প্রাণ।</p></div>
    </div>
  </section>

  <section class="container"><h2 class="sec-title">জেনে রাখুন</h2>
    <div class="grid-2">
      <div class="note ok">${icon('shield')}<span>সাধারণত ১৮ বছরের বেশি বয়সী, সুস্থ ও ন্যূনতম ৫০ কেজি ওজনের ব্যক্তি রক্ত দিতে পারেন। কোনো সন্দেহ থাকলে চিকিৎসকের পরামর্শ নিন। এক দান থেকে আরেক দানের মধ্যে অন্তত ${bn(Math.round(GAP_DAYS / 30))} মাস বিরতি দেওয়া ভালো।</span></div>
      <div class="note warn">${icon('alert')}<span>এখানকার সবাই স্বেচ্ছায় রক্ত দেন। রক্তের বিনিময়ে অর্থ চাওয়া বা দেওয়া থেকে বিরত থাকুন। যোগাযোগের সময় রোগীর হাসপাতাল ও প্রয়োজনের সময় স্পষ্ট জানান।</span></div>
    </div>
  </section>`;
  updateInstallUI();
  API.notices(false).then((list) => {
    if (!alive() || !list.length) return;
    const box = $('#homeNotices', app); if (!box) return;
    API.recordNoticeViews(list.slice(0, 3)).catch(() => {});
    $('#hnList', box).innerHTML = list.slice(0, 3).map((n) => noticeCard(n)).join('');
    box.hidden = false;
  }).catch(() => {});
  try {
    const st = await API.stats();
    if (!alive()) return;
    BLOOD.forEach((g) => { const el = $(`[data-count="${g}"]`, app); if (el) el.textContent = `${bn(st.by[g] || 0)} জন`; });
    const t = $('#statTotal', app);
    if (t) { const t0 = performance.now(); const step = (now) => { const k = Math.min(1, (now - t0) / 900); t.textContent = bn(Math.round(st.total * (1 - Math.pow(1 - k, 3)))); if (k < 1 && alive()) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  } catch { const t = $('#statTotal', app); if (t) t.textContent = '—'; }
};

/* ---------------------------------------------------------------- খোঁজা */
function donorCard(d, i) {
  const ready = isReady(d.last_donation);
  const next = d.last_donation && !ready ? fmtD(addDays(d.last_donation, GAP_DAYS)) : '';
  const last = d.last_donation ? `শেষ রক্তদান: ${fmtDate(d.last_donation)}` : 'শেষ রক্তদানের তথ্য নেই';
  const phone = esc(d.phone);
  return `<article class="donor-card glass" style="--i:${i}">
    <div class="dc-top">
      <div class="drop"><span>${esc(d.blood_group)}</span></div>
      <div class="dc-id"><h3>${esc(d.name)}</h3><p>${icon('pin')} ${esc(d.area)}, ${esc(d.district)}</p></div>
    </div>
    <div><span class="tag ${ready ? 'ready' : 'rest'}">${ready ? 'রক্ত দিতে প্রস্তুত' : 'সম্প্রতি রক্ত দিয়েছেন'}</span></div>
    <p class="dc-last">${icon('calendar')}<span>${last}${next ? `<br>আবার দিতে পারবেন: ${next}` : ''}</span></p>
    <div class="dc-phone"><span>${icon('phone')} ${esc(bn(d.phone))}</span></div>
    <div class="dc-actions">
      <a class="btn btn-primary btn-sm" href="tel:${phone}">${icon('phone')} কল করুন</a>
      <a class="btn btn-ghost btn-sm" href="https://wa.me/88${phone}" target="_blank" rel="noopener">${icon('chat')} মেসেজ</a>
      <button class="btn btn-ghost btn-sm btn-icon" type="button" data-copy="${phone}" aria-label="নম্বর কপি করুন">${icon('copy')}</button>
    </div>
  </article>`;
}

function noticeCard(n, o = {}) {
  const expired = new Date(n.expires_at) <= Date.now();
  return `<article class="notice glass ${expired ? 'expired' : ''}">
    <div class="n-head"><span class="n-ico">${icon('bell')}</span>
      <div class="n-meta"><h3>${esc(n.title)}</h3>
        <p><b>${esc(n.author_name || ROLE_BN[n.author_role] || '')}</b>${badge(n.author_role)} <span class="muted">· ${relPast(n.created_at)}</span></p></div></div>
    <div class="n-body">${paragraphs(n.body)}</div>
    <div class="n-foot"><span class="tag ${expired ? 'rest' : 'ready'}">${expired ? 'মেয়াদ শেষ' : relLeft(n.expires_at)}</span>
      ${o.views != null ? `<span class="muted views">${icon('eye')} ${bn(o.views)} জন দেখেছেন</span>` : ''}
      ${o.del ? `<button class="btn btn-danger btn-sm" data-del="${esc(n.id)}" type="button">${icon('trash')} মুছুন</button>` : ''}</div>
  </article>`;
}

routes.notices = async (app, p, alive) => {
  app.innerHTML = `<section class="container"><h1 class="page-title">নোটিশ বোর্ড</h1>
    <p class="muted" style="max-width:640px">সংগঠনের গুরুত্বপূর্ণ ঘোষণা ও জরুরি বার্তা এখানে প্রকাশিত হয়। প্রতিটি নোটিশ নির্দিষ্ট সময় পর নিজে থেকে সরে যায়।</p>
    <div class="cards cards-notice" id="nBoard" style="margin-top:18px"><div class="skel"></div><div class="skel"></div></div></section>`;
  let list = [];
  try { list = await API.notices(false); } catch (e) { if (alive()) $('#nBoard', app).innerHTML = `<div class="empty glass">${icon('alert')}<b>${esc(errMsg(e))}</b></div>`; return; }
  if (!alive()) return;
  API.recordNoticeViews(list).catch(() => {});
  $('#nBoard', app).innerHTML = list.length ? list.map((n) => noticeCard(n)).join('')
    : `<div class="empty glass">${icon('bell')}<b>এখন কোনো নোটিশ নেই</b><p class="muted">নতুন নোটিশ এলে এখানে দেখা যাবে।</p></div>`;
};

routes.search = async (app, params) => {
  const st = { group: BLOOD.includes(params.get('group')) ? params.get('group') : '', district: params.get('district') || '', q: params.get('q') || '', page: 0 };
  let req = 0;
  app.innerHTML = `<section class="container"><h1 class="page-title">রক্তদাতা খুঁজুন</h1>
    <div class="filters glass">
      <div class="chips" id="chips">${['', ...BLOOD].map((g) => `<button type="button" class="chip ${st.group === g ? 'on' : ''}" data-g="${esc(g)}">${g || 'সব গ্রুপ'}</button>`).join('')}</div>
      <div class="filter-row">
        <select id="fDistrict" aria-label="জেলা"><option value="">সব জেলা</option>${DISTRICTS.map((d) => `<option ${d === st.district ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <div class="input-wrap">${icon('search')}<input id="fQ" type="search" placeholder="নাম বা এলাকা লিখে খুঁজুন" value="${esc(st.q)}" maxlength="40"></div>
      </div>
    </div>
    <div class="result-meta" id="rmeta"></div>
    <div class="cards" id="cards"></div>
    <div class="more-wrap"><button class="btn btn-ghost" id="moreBtn" type="button" hidden>আরও দেখুন</button></div>
  </section>`;
  const cards = $('#cards', app), meta = $('#rmeta', app), more = $('#moreBtn', app);

  const syncUrl = () => {
    const u = new URLSearchParams();
    if (st.group) u.set('group', st.group); if (st.district) u.set('district', st.district); if (st.q) u.set('q', st.q);
    history.replaceState(null, '', '#/search' + (u.toString() ? '?' + u : ''));
  };
  async function run(reset) {
    const my = ++req;
    if (reset) { st.page = 0; cards.innerHTML = Array.from({ length: 6 }, () => '<div class="skel"></div>').join(''); more.hidden = true; meta.textContent = 'খোঁজা হচ্ছে…'; }
    try {
      const { rows, total } = await API.search(st);
      if (my !== req) return;
      if (reset) cards.innerHTML = '';
      if (reset && !rows.length) {
        cards.innerHTML = `<div class="empty glass">${icon('droplet')}<b>কোনো রক্তদাতা পাওয়া যায়নি</b><p class="muted">অন্য জেলা বা “সব গ্রুপ” দিয়ে আবার চেষ্টা করুন। আপনি নিজেও রক্তদাতা হিসেবে যুক্ত হতে পারেন।</p><a class="btn btn-primary" href="#/register">${icon('user-plus')} রক্তদাতা হোন</a></div>`;
        meta.textContent = '';
      } else {
        const start = st.page * PAGE;
        cards.insertAdjacentHTML('beforeend', rows.map((d, i) => donorCard(d, i)).join(''));
        meta.innerHTML = `মোট <b>${bn(total)}</b> জন রক্তদাতা পাওয়া গেছে${st.group ? ' (' + esc(st.group) + ')' : ''}`;
        more.hidden = start + rows.length >= total;
      }
    } catch (e) {
      if (my !== req) return;
      cards.innerHTML = `<div class="empty glass">${icon('alert')}<b>তালিকা আনা যায়নি</b><p class="muted">${esc(errMsg(e))}</p></div>`;
      meta.textContent = '';
    }
  }
  $('#chips', app).addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    st.group = b.dataset.g; $$('.chip', app).forEach((c) => c.classList.toggle('on', c === b)); syncUrl(); run(true);
  });
  $('#fDistrict', app).addEventListener('change', (e) => { st.district = e.target.value; syncUrl(); run(true); });
  $('#fQ', app).addEventListener('input', debounce((e) => { st.q = e.target.value.trim(); syncUrl(); run(true); }));
  more.addEventListener('click', async () => { st.page++; setBusy(more, true); await run(false); setBusy(more, false, 'আরও দেখুন'); });
  run(true);
};

/* ---------------------------------------------------------------- ডোনার ফর্ম */
function donorFormHTML(v = {}, o = {}) {
  const consent = o.mod ? 'ডোনারের কাছ থেকে নাম, ফোন নম্বর ও এলাকা প্রকাশের সম্মতি নেওয়া হয়েছে।' : 'আমি আমার নাম, ফোন নম্বর ও এলাকা রক্তদাতা তালিকায় সবার জন্য প্রকাশে সম্মতি দিচ্ছি। চাইলে যেকোনো সময় নিজের নাম তালিকা থেকে সরিয়ে নিতে পারব।';
  return `
  <div class="field"><label for="d-name">পূর্ণ নাম</label><input id="d-name" name="name" required maxlength="80" autocomplete="name" value="${esc(v.name)}" placeholder="আপনার নাম"></div>
  <div class="field"><span class="label">রক্তের গ্রুপ</span><div class="bg-pills">${BLOOD.map((g) => `<label class="pill"><input type="radio" name="blood_group" value="${esc(g)}" ${v.blood_group === g ? 'checked' : ''}><span>${g}</span></label>`).join('')}</div></div>
  <div class="field"><label for="d-phone">মোবাইল নম্বর</label><input id="d-phone" name="phone" type="tel" inputmode="tel" required maxlength="20" autocomplete="tel" value="${esc(v.phone)}" placeholder="01XXXXXXXXX"></div>
  <div class="grid-2">
    <div class="field"><label for="d-dist">জেলা</label><select id="d-dist" name="district" required><option value="">বেছে নিন</option>${DISTRICTS.map((d) => `<option ${d === v.district ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
    <div class="field"><label for="d-area">উপজেলা / এলাকা</label><input id="d-area" name="area" required maxlength="80" value="${esc(v.area)}" placeholder="যেমন: সদর, মিরপুর"></div>
  </div>
  <div class="field"><label for="d-last">শেষ রক্তদানের তারিখ <small>(ঐচ্ছিক)</small></label><input id="d-last" name="last_donation" type="date" max="${todayISO()}" value="${esc(v.last_donation || '')}"></div>
  ${o.status ? `<div class="field"><label for="d-status">স্ট্যাটাস</label><select id="d-status" name="status">${Object.entries(STATUS_BN).map(([k, l]) => `<option value="${k}" ${(v.status || 'approved') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
  <label class="check"><input type="checkbox" name="consent" ${v.consent ? 'checked' : ''}><span>${consent}</span></label>`;
}
function readDonorForm(form) {
  const f = new FormData(form);
  const v = {
    name: String(f.get('name') || '').trim().replace(/\s+/g, ' '),
    blood_group: f.get('blood_group') || '',
    phone: normPhone(String(f.get('phone') || '')),
    district: f.get('district') || '',
    area: String(f.get('area') || '').trim(),
    last_donation: f.get('last_donation') || null,
    consent: f.get('consent') === 'on'
  };
  if (f.has('status')) v.status = f.get('status');
  let err = '';
  if (v.name.length < 2) err = 'আপনার নাম লিখুন।';
  else if (!BLOOD.includes(v.blood_group)) err = 'রক্তের গ্রুপ বেছে নিন।';
  else if (!isPhone(v.phone)) err = 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01XXXXXXXXX)।';
  else if (!v.district) err = 'জেলা বেছে নিন।';
  else if (v.area.length < 2) err = 'উপজেলা বা এলাকার নাম লিখুন।';
  else if (v.last_donation && v.last_donation > todayISO()) err = 'শেষ রক্তদানের তারিখ ভবিষ্যতের হতে পারে না।';
  else if (!v.consent) err = 'চালিয়ে যেতে সম্মতির বক্সে টিক দিন।';
  return { v, err };
}
const pickDonor = (v, uid) => ({ name: v.name, blood_group: v.blood_group, phone: v.phone, district: v.district, area: v.area, last_donation: v.last_donation || null, consent: true, user_id: uid });

/* ---------------------------------------------------------------- রেজিস্ট্রেশন */
routes.register = async (app) => {
  if (S.user && S.donor) { location.hash = '#/dashboard'; return; }
  const needAccount = !S.user;
  app.innerHTML = `<section class="container narrow"><div class="glass form-card">
    <h1 class="page-title" style="margin:0">রক্তদাতা হিসেবে যুক্ত হোন</h1>
    <p class="muted">আপনার তথ্য দিলে প্রয়োজনের সময় মানুষ আপনার সাথে যোগাযোগ করতে পারবে। নম্বর তালিকায় সবার জন্য দেখা যাবে।</p>
    ${DEMO ? `<div class="note warn">${icon('alert')}<span>${DEMO_MSG}</span></div>` : ''}
    <form id="regForm" novalidate>
      ${needAccount ? `<fieldset><legend>অ্যাকাউন্ট</legend>
        <div class="field"><label for="r-mail">ইমেইল</label><input id="r-mail" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>
        <div class="field"><label for="r-pass">পাসওয়ার্ড <small>(কমপক্ষে ৬ অক্ষর)</small></label><input id="r-pass" name="password" type="password" minlength="6" autocomplete="new-password" required></div>
      </fieldset>` : ''}
      <fieldset><legend>রক্তদাতার তথ্য</legend>${donorFormHTML({}, {})}</fieldset>
      <p class="form-msg" id="regMsg" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit">${icon('check')} নিবন্ধন সম্পন্ন করুন</button>
      ${needAccount ? '<p class="muted" style="text-align:center">আগে থেকে অ্যাকাউন্ট আছে? <a href="#/login">লগইন করুন</a></p>' : ''}
    </form></div></section>`;
  const form = $('#regForm', app), msg = $('#regMsg', app);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.textContent = '';
    if (DEMO) { msg.textContent = DEMO_MSG; return; }
    const { v, err } = readDonorForm(form);
    if (err) { msg.textContent = err; return; }
    let email = '', pass = '';
    if (needAccount) {
      email = form.email.value.trim(); pass = form.password.value;
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'সঠিক ইমেইল দিন।'; return; }
      if (pass.length < 6) { msg.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।'; return; }
    }
    const btn = $('button[type="submit"]', form); setBusy(btn, true);
    try {
      if (needAccount) {
        const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: SITE_URL } });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('User already registered');
        if (!data.session) {
          store.set('pendingDonor', JSON.stringify(v));
          app.innerHTML = `<section class="container narrow"><div class="glass form-card" style="text-align:center">${icon('mail')}<h1 class="page-title" style="margin:0">ইমেইল যাচাই করুন</h1>
            <p>আমরা <b>${esc(email)}</b> ঠিকানায় একটি লিংক পাঠিয়েছি। লিংকে চাপ দিয়ে ইমেইল যাচাই করুন, তারপর লগইন করলেই আপনার রক্তদাতা তথ্য স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে।</p><a class="btn btn-primary" href="#/login">${icon('log-in')} লগইন পেজে যান</a></div></section>`;
          return;
        }
        await setSession(data.session);
      }
      S.donor = await API.createDonor(pickDonor(v, S.user.id));
      renderNav();
      toast(S.donor.status === 'approved' ? 'আপনি এখন রক্তদাতা তালিকায় আছেন। ধন্যবাদ!' : 'তথ্য জমা হয়েছে। মডারেটর অনুমোদনের পর তালিকায় আসবে।', 'success');
      location.hash = '#/dashboard';
    } catch (er) { msg.textContent = errMsg(er); }
    finally { setBusy(btn, false); }
  });
};

/* ---------------------------------------------------------------- লগইন / নতুন অ্যাকাউন্ট */
routes.login = async (app, params) => {
  if (DEMO) { app.innerHTML = demoCard('লগইন'); return; }
  if (S.user) { location.hash = '#/dashboard'; return; }
  const signup = params.get('mode') === 'signup';
  app.innerHTML = `<section class="container narrow"><div class="glass form-card">
    <div class="seg"><a class="${signup ? '' : 'on'}" href="#/login">লগইন</a><a class="${signup ? 'on' : ''}" href="#/login?mode=signup">নতুন অ্যাকাউন্ট</a></div>
    <form id="authForm" novalidate>
      <div class="field"><label for="a-mail">ইমেইল</label><input id="a-mail" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="a-pass">পাসওয়ার্ড</label><input id="a-pass" name="password" type="password" minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}" required></div>
      <p class="form-msg" id="authMsg" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit">${icon(signup ? 'user-plus' : 'log-in')} ${signup ? 'অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}</button>
      ${signup ? '' : '<p style="text-align:center"><button class="link-btn" type="button" id="forgot">পাসওয়ার্ড ভুলে গেছেন?</button></p>'}
    </form>
    ${signup ? '<p class="muted">রক্তদাতা হতে চাইলে সরাসরি <a href="#/register">রক্তদাতা নিবন্ধন</a> পেজে যান।</p>' : ''}
  </div></section>`;
  const form = $('#authForm', app), msg = $('#authMsg', app);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.textContent = '';
    const email = form.email.value.trim(), password = form.password.value;
    if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'সঠিক ইমেইল দিন।'; return; }
    if (password.length < 6) { msg.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।'; return; }
    const btn = $('button[type="submit"]', form); setBusy(btn, true);
    try {
      if (signup) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: SITE_URL } });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('User already registered');
        if (!data.session) { toast('ইমেইলে পাঠানো লিংকে চাপ দিয়ে অ্যাকাউন্ট যাচাই করুন, তারপর লগইন করুন।', 'success'); location.hash = '#/login'; return; }
        await setSession(data.session);
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await setSession(data.session);
        await flushPending();
      }
      renderNav(); toast('স্বাগতম!', 'success'); location.hash = '#/dashboard';
    } catch (er) { msg.textContent = errMsg(er); }
    finally { setBusy(btn, false); }
  });
  const forgot = $('#forgot', app);
  if (forgot) forgot.addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'আগে উপরে আপনার ইমেইল লিখুন।'; return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
    if (error) msg.textContent = errMsg(error); else toast('পাসওয়ার্ড বদলানোর লিংক ইমেইলে পাঠানো হয়েছে।', 'success');
  });
};

async function logout() {
  if (sb) await sb.auth.signOut();
  S.user = null; S.role = 'anon'; S.donor = null;
  renderNav(); toast('লগআউট হয়েছে।', 'success'); location.hash = '#/';
}

/* ---------------------------------------------------------------- ড্যাশবোর্ড */
routes.dashboard = async (app, params, alive) => {
  if (DEMO) { app.innerHTML = demoCard('ড্যাশবোর্ড'); return; }
  if (!S.user) { location.hash = '#/login'; return; }
  try { await fetchRole(); } catch (e) { S.roleError = String(e && e.message || e); }
  await loadMine(); if (!alive()) return;
  renderNav('dashboard');
  const isMod = isModRole(S.role), isAdm = isAdminRole(S.role), isDev = S.role === 'developer';
  const pending = isMod ? await API.pendingCount() : 0; if (!alive()) return;
  const tabs = [['mine', 'আমার তথ্য', 'user']];
  if (isMod) tabs.push(['donors', 'রক্তদাতা তালিকা', 'droplet'], ['payments', 'ডোনেশন নম্বর', 'heart']);
  if (isAdm) tabs.push(['notices', 'নোটিশ', 'bell'], ['stats', 'পরিসংখ্যান', 'chart'], ['settings', 'সাইটের লেখা', 'settings']);
  if (isDev) tabs.push(['users', 'ব্যবহারকারী', 'users']);
  const want = params.get('tab');
  const tab = tabs.some((t) => t[0] === want) ? want : (isMod ? 'donors' : 'mine');
  app.innerHTML = `<section class="container">
    <div class="dash-head"><div><h1>${PANEL_BN[S.role] || PANEL_BN.donor}</h1>
      <p>${esc(S.user.email || '')} · ${badge(S.role)} <span class="tag role">${ROLE_BN[S.role] || ''}</span></p></div>
      <button class="btn btn-ghost btn-sm" type="button" id="logoutBtn">${icon('log-out')} লগআউট</button></div>
    ${S.roleError ? `<div class="note bad">${icon('alert')}<span>ভূমিকা পড়া যায়নি: ${esc(S.roleError)}</span></div>` : ''}
    <nav class="tabs">${tabs.map(([k, l, ic]) => `<a class="${k === tab ? 'on' : ''}" href="#/dashboard?tab=${k}">${icon(ic)} ${l}${k === 'donors' && pending ? `<span class="count-dot">${bn(pending)}</span>` : ''}</a>`).join('')}</nav>
    <div id="tabBody"></div></section>`;
  $('#logoutBtn', app).addEventListener('click', logout);
  const body = $('#tabBody', app);
  if (tab === 'mine') tabMine(body);
  else if (tab === 'donors') tabDonors(body);
  else if (tab === 'payments') await tabPayments(body);
  else if (tab === 'notices') await tabNotices(body);
  else if (tab === 'stats') await tabStats(body);
  else if (tab === 'users') await tabUsers(body);
  else if (tab === 'settings') await tabSettings(body);
};

const statusTag = (s) => `<span class="tag ${s}">${STATUS_BN[s] || s}</span>`;

function tabMine(el) {
  const d = S.donor;
  const note = !d ? '<p class="muted">আপনি এখনও রক্তদাতা তালিকায় নেই। নিচের ফর্ম পূরণ করে যুক্ত হোন।</p>'
    : d.status === 'pending' ? `<div class="note warn">${icon('clock')}<span>আপনার তথ্য মডারেটরের অনুমোদনের অপেক্ষায় আছে। অনুমোদনের পর তালিকায় দেখা যাবে।</span></div>`
    : d.status === 'rejected' ? `<div class="note bad">${icon('alert')}<span>আপনার তথ্য তালিকায় অনুমোদন পায়নি। প্রয়োজনে সংগঠনের সাথে যোগাযোগ করুন।</span></div>`
    : `<div class="note ok">${icon('check')}<span>আপনি রক্তদাতা তালিকায় আছেন। রক্ত দিলে নিচে শেষ রক্তদানের তারিখ হালনাগাদ করে নিন।</span></div>`;
  el.innerHTML = `<div class="glass form-card"><div class="between"><h2>আমার রক্তদাতা তথ্য</h2>${d ? statusTag(d.status) : ''}</div>${note}
    <form id="mineForm" novalidate>${donorFormHTML(d || {}, {})}<p class="form-msg" id="mineMsg" role="alert"></p>
      <div class="actions"><button class="btn btn-primary" type="submit">${d ? 'তথ্য হালনাগাদ করুন' : 'তালিকায় যুক্ত হোন'}</button>
      ${d ? `<button class="btn btn-danger" type="button" id="delMine">${icon('trash')} তালিকা থেকে নাম সরান</button>` : ''}</div></form></div>`;
  const form = $('#mineForm', el), msg = $('#mineMsg', el);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.textContent = '';
    const { v, err } = readDonorForm(form);
    if (err) { msg.textContent = err; return; }
    const btn = $('button[type="submit"]', form); setBusy(btn, true);
    try {
      if (d) S.donor = await API.updateDonor(d.id, { name: v.name, blood_group: v.blood_group, phone: v.phone, district: v.district, area: v.area, last_donation: v.last_donation, consent: true });
      else S.donor = await API.createDonor(pickDonor(v, S.user.id));
      toast('তথ্য সংরক্ষিত হয়েছে।', 'success'); tabMine(el);
    } catch (er) { msg.textContent = errMsg(er); setBusy(btn, false); }
  });
  const del = $('#delMine', el);
  if (del) del.addEventListener('click', async () => {
    if (!(await confirmBox('আপনার নাম ও তথ্য রক্তদাতা তালিকা থেকে মুছে ফেলা হবে। নিশ্চিত?', 'হ্যাঁ, মুছুন'))) return;
    try { await API.deleteDonor(d.id); S.donor = null; toast('তালিকা থেকে সরানো হয়েছে।', 'success'); tabMine(el); }
    catch (er) { toast(errMsg(er), 'error'); }
  });
}

function tabDonors(el) {
  const st = { status: '', q: '', page: 0 };
  let rows = [], req = 0;
  el.innerHTML = `<div class="toolbar">
      <select id="aStatus" aria-label="স্ট্যাটাস"><option value="">সব স্ট্যাটাস</option>${Object.entries(STATUS_BN).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <div class="input-wrap">${icon('search')}<input id="aQ" type="search" placeholder="নাম, এলাকা বা নম্বর" maxlength="40"></div>
      <button class="btn btn-primary btn-sm" id="addDonor" type="button">${icon('plus')} নতুন রক্তদাতা</button></div>
    <div class="result-meta" id="aMeta"></div><div class="row-list" id="aList"></div>
    <div class="more-wrap"><button class="btn btn-ghost" id="aMore" type="button" hidden>আরও দেখুন</button></div>`;
  const list = $('#aList', el), meta = $('#aMeta', el), more = $('#aMore', el);
  const rowHTML = (d) => `<div class="row-card glass" data-id="${esc(d.id)}">
    <div class="drop sm"><span>${esc(d.blood_group)}</span></div>
    <div class="rc-main"><b>${esc(d.name)}</b><span>${esc(bn(d.phone))} · ${esc(d.area)}, ${esc(d.district)}</span></div>
    ${statusTag(d.status)}
    <div class="rc-act">
      ${d.status !== 'approved' ? `<button class="btn btn-ok btn-sm" data-act="approve" type="button">${icon('check')} অনুমোদন</button>` : ''}
      ${d.status !== 'rejected' ? `<button class="btn btn-ghost btn-sm" data-act="reject" type="button">${icon('x')} বাতিল</button>` : ''}
      <button class="btn btn-ghost btn-sm btn-icon" data-act="edit" type="button" aria-label="সম্পাদনা">${icon('edit')}</button>
      <button class="btn btn-danger btn-sm btn-icon" data-act="del" type="button" aria-label="মুছুন">${icon('trash')}</button></div></div>`;
  async function load(reset) {
    const my = ++req;
    if (reset) { st.page = 0; rows = []; list.innerHTML = '<div class="skel" style="height:80px"></div>'.repeat(3); }
    try {
      const r = await API.adminList(st);
      if (my !== req) return;
      rows = rows.concat(r.rows);
      list.innerHTML = rows.length ? rows.map(rowHTML).join('') : '<div class="empty glass"><b>কোনো রক্তদাতা নেই</b></div>';
      meta.innerHTML = `মোট <b>${bn(r.total)}</b> জন`;
      more.hidden = rows.length >= r.total;
    } catch (e) { if (my === req) list.innerHTML = `<div class="empty glass"><b>${esc(errMsg(e))}</b></div>`; }
  }
  $('#aStatus', el).addEventListener('change', (e) => { st.status = e.target.value; load(true); });
  $('#aQ', el).addEventListener('input', debounce((e) => { st.q = e.target.value.trim(); load(true); }));
  more.addEventListener('click', async () => { st.page++; setBusy(more, true); await load(false); setBusy(more, false, 'আরও দেখুন'); });

  function donorModal(d) {
    const sheet = openModal(`<h2>${d ? 'রক্তদাতার তথ্য সম্পাদনা' : 'নতুন রক্তদাতা যোগ করুন'}</h2>
      <form id="mForm" novalidate>${donorFormHTML(d || {}, { mod: true, status: !!d })}<p class="form-msg" id="mMsg" role="alert"></p>
      <div class="actions"><button class="btn btn-primary" type="submit">সংরক্ষণ করুন</button><button class="btn btn-ghost" type="button" data-close>বাতিল</button></div></form>`);
    sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
    $('#mForm', sheet).addEventListener('submit', async (e) => {
      e.preventDefault();
      const { v, err } = readDonorForm(e.target);
      if (err) { $('#mMsg').textContent = err; return; }
      const btn = $('button[type="submit"]', e.target); setBusy(btn, true);
      try {
        if (d) await API.updateDonor(d.id, v);
        else await API.createDonor({ name: v.name, blood_group: v.blood_group, phone: v.phone, district: v.district, area: v.area, last_donation: v.last_donation, consent: true, user_id: null });
        closeModal(); toast('সংরক্ষিত হয়েছে।', 'success'); load(true);
      } catch (er) { $('#mMsg').textContent = errMsg(er); setBusy(btn, false); }
    });
  }
  $('#addDonor', el).addEventListener('click', () => donorModal(null));
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const d = rows.find((r) => r.id === b.closest('.row-card').dataset.id); if (!d) return;
    try {
      if (b.dataset.act === 'edit') donorModal(d);
      else if (b.dataset.act === 'approve' || b.dataset.act === 'reject') {
        await API.updateDonor(d.id, { status: b.dataset.act === 'approve' ? 'approved' : 'rejected' });
        toast(b.dataset.act === 'approve' ? 'অনুমোদন করা হয়েছে।' : 'বাতিল করা হয়েছে।', 'success'); load(true);
      } else if (b.dataset.act === 'del') {
        if (await confirmBox(`“${d.name}”-এর তথ্য স্থায়ীভাবে মুছে ফেলা হবে। নিশ্চিত?`, 'মুছুন')) { await API.deleteDonor(d.id); toast('মুছে ফেলা হয়েছে।', 'success'); load(true); }
      }
    } catch (er) { toast(errMsg(er), 'error'); }
  });
  load(true);
}

async function tabUsers(el) {
  el.innerHTML = '<div class="skel" style="height:90px"></div>';
  let users;
  try { users = await API.users(); } catch (e) { el.innerHTML = `<div class="note bad">${icon('alert')}<span>${esc(errMsg(e))}</span></div>`; return; }
  el.innerHTML = `<div class="note">${icon('info')}<span><b>ভূমিকা:</b> <b>মডারেটর</b> রক্তদাতা তালিকা ও ডোনেশন নম্বর সামলায়। <b>অ্যাডমিন</b> তার ওপর নোটিশ প্রকাশ ও সাইটের লেখা বদলাতে পারে। <b>ডেভেলপারের</b> কোনো সীমা নেই: সবকিছু দেখা, বদলানো ও মোছা, এমনকি অন্যকে ডেভেলপার বানানোও। নিজের ভূমিকা এখান থেকে বদলানো যায় না, যাতে ভুল করে নিজের ক্ষমতা না হারান।</span></div>
    <div class="input-wrap" style="margin:14px 0">${icon('search')}<input id="uQ" type="search" placeholder="ইমেইল দিয়ে খুঁজুন"></div>
    <div class="row-list" id="uList"></div>`;
  const list = $('#uList', el);
  const draw = (q = '') => {
    const f = users.filter((u) => (u.email || '').toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = f.map((u) => {
      const fixed = u.id === S.user.id;
      return `<div class="row-card glass" data-id="${esc(u.id)}">
      <div class="rc-main"><b>${esc(u.email || '—')} ${badge(u.role)}</b><span>যোগ দিয়েছেন: ${esc(fmtD(new Date(u.created_at)))}</span></div>
      ${fixed ? `<span class="tag role">${ROLE_BN[u.role]}</span>`
        : `<select data-role aria-label="ভূমিকা" style="width:auto">${['donor', 'moderator', 'admin', 'developer'].map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r === 'donor' ? 'রক্তদাতা / সাধারণ' : ROLE_BN[r]}</option>`).join('')}</select>
           <button class="btn btn-danger btn-sm btn-icon" data-rm type="button" aria-label="অ্যাকাউন্ট মুছুন">${icon('trash')}</button>`}</div>`;
    }).join('') || '<div class="empty glass"><b>কেউ নেই</b></div>';
  };
  draw();
  $('#uQ', el).addEventListener('input', (e) => draw(e.target.value.trim()));
  list.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-role]'); if (!sel) return;
    const id = sel.closest('.row-card').dataset.id;
    try { await API.setRole(id, sel.value); const u = users.find((x) => x.id === id); if (u) u.role = sel.value; draw($('#uQ', el).value); toast(`ভূমিকা বদলে ${ROLE_BN[sel.value]} করা হয়েছে।`, 'success'); }
    catch (er) { toast(errMsg(er), 'error'); draw($('#uQ', el).value); }
  });
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    const id = b.closest('.row-card').dataset.id, u = users.find((x) => x.id === id); if (!u) return;
    if (!(await confirmBox(`“${u.email}” অ্যাকাউন্টটি এবং এর রক্তদাতা তথ্য স্থায়ীভাবে মুছে যাবে। এটি ফেরানো যায় না। নিশ্চিত?`, 'স্থায়ীভাবে মুছুন'))) return;
    try { await API.deleteUser(id); users = users.filter((x) => x.id !== id); draw($('#uQ', el).value); toast('অ্যাকাউন্ট মুছে ফেলা হয়েছে।', 'success'); }
    catch (er) { toast(errMsg(er), 'error'); }
  });
}

async function tabStats(el) {
  el.innerHTML = '<div class="skel" style="height:140px"></div>';
  let st, list = [], counts = {};
  try { [st, list, counts] = await Promise.all([API.visitStats(), API.notices(true), API.noticeViewCounts().catch(() => ({}))]); }
  catch (e) { el.innerHTML = `<div class="note bad">${icon('alert')}<span>${esc(errMsg(e))}${/function|schema cache|does not exist/i.test(String(e && e.message)) ? ' — update-4.sql চালানো হয়েছে কিনা দেখুন।' : ''}</span></div>`; return; }
  const dayKey = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const map = Object.fromEntries((st.daily || []).map((r) => [String(r.day).slice(0, 10), r]));
  const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); days.push({ k, d, v: map[k] ? Number(map[k].visitors) : 0 }); }
  const max = Math.max(1, ...days.map((x) => x.v));
  const num = (v) => bn(Number(v || 0));
  el.innerHTML = `<div class="stat-grid">
      <div class="stat glass"><b>${num(st.today_visitors)}</b><span>আজকের ভিজিটর</span></div>
      <div class="stat glass"><b>${num(st.week_visitors)}</b><span>গত ৭ দিন</span></div>
      <div class="stat glass"><b>${num(st.month_visitors)}</b><span>গত ৩০ দিন</span></div>
      <div class="stat glass"><b>${num(st.total_visitors)}</b><span>মোট ভিজিটর</span></div>
      <div class="stat glass"><b>${num(st.today_hits)}</b><span>আজকের পেজ-লোড</span></div>
      <div class="stat glass"><b>${num(st.total_hits)}</b><span>মোট পেজ-লোড</span></div></div>
    <div class="glass form-card" style="margin-top:16px"><h2>গত ১৪ দিনের ভিজিটর</h2>
      <div class="bars">${days.map((x) => `<div class="bar" title="${esc(fmtD(x.d))}: ${num(x.v)} জন"><em>${x.v ? num(x.v) : ''}</em><i style="height:${Math.max(x.v ? 8 : 2, Math.round(x.v / max * 100))}%"></i><small>${bn(x.d.getDate())}</small></div>`).join('')}</div></div>
    <div class="sec-block"><h2>নোটিশ কতজন দেখেছে</h2><div class="row-list">${list.length ? list.map((n) => `<div class="row-card glass"><div class="rc-main"><b>${esc(n.title)}</b><span>${new Date(n.expires_at) <= Date.now() ? 'মেয়াদ শেষ' : relLeft(n.expires_at)}</span></div><span class="tag role">${icon('eye')} ${num(counts[n.id])} জন</span></div>`).join('') : '<p class="muted">এখনও কোনো নোটিশ নেই।</p>'}</div></div>
    <div class="note" style="margin-top:14px">${icon('info')}<span>এখানে শুধু সংখ্যা গোনা হয়, কারও নাম বা ব্যক্তিগত তথ্য রাখা হয় না। প্রতিটি ফোন/ব্রাউজারকে একজন ধরা হয়, তাই এটি আনুমানিক সংখ্যা।</span></div>`;
}

async function tabNotices(el) {
  el.innerHTML = `<form id="nForm" class="glass form-card" novalidate>
    <h2>নতুন নোটিশ প্রকাশ করুন</h2>
    <div class="field"><label for="n-title">শিরোনাম</label><input id="n-title" name="title" maxlength="120" required placeholder="যেমন: রক্তদান কর্মসূচি"></div>
    <div class="field"><label for="n-body">বিস্তারিত</label><textarea id="n-body" name="body" maxlength="3000" required placeholder="নোটিশের লেখা"></textarea></div>
    <div class="field"><label for="n-dur">নোটিশ কতক্ষণ থাকবে</label><select id="n-dur" name="dur">${NOTICE_DURATIONS.map(([h, l]) => `<option value="${h}">${l}</option>`).join('')}</select></div>
    <p class="form-msg" id="nMsg" role="alert"></p>
    <div class="actions"><button class="btn btn-primary" type="submit">${icon('bell')} প্রকাশ করুন</button></div></form>
    <div class="sec-block"><h2>সব নোটিশ</h2><div id="nList" class="cards cards-notice"><div class="skel"></div></div></div>`;
  const box = $('#nList', el);
  async function load() {
    try {
      const [list, counts] = await Promise.all([API.notices(true), API.noticeViewCounts().catch(() => ({}))]);
      box.innerHTML = list.length ? list.map((n) => noticeCard(n, { del: true, views: counts[n.id] || 0 })).join('') : '<p class="muted">এখনও কোনো নোটিশ দেওয়া হয়নি।</p>';
    } catch (e) { box.innerHTML = `<div class="note bad">${icon('alert')}<span>${esc(errMsg(e))}</span></div>`; }
  }
  $('#nForm', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), title = String(f.get('title') || '').trim(), body = String(f.get('body') || '').trim();
    const msg = $('#nMsg', el); msg.textContent = '';
    if (title.length < 2) { msg.textContent = 'নোটিশের শিরোনাম লিখুন।'; return; }
    if (body.length < 2) { msg.textContent = 'নোটিশের বিস্তারিত লিখুন।'; return; }
    const hours = Number(f.get('dur')) || 24;
    const btn = $('button[type="submit"]', e.target); setBusy(btn, true);
    try {
      await API.createNotice({ title, body, expires_at: new Date(Date.now() + hours * 3600e3).toISOString(), author_name: (S.donor && S.donor.name) || ROLE_BN[S.role] });
      e.target.reset(); toast('নোটিশ প্রকাশিত হয়েছে।', 'success'); load();
    } catch (er) { msg.textContent = errMsg(er); }
    finally { setBusy(btn, false); }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    if (!(await confirmBox('এই নোটিশটি মুছে ফেলা হবে। নিশ্চিত?', 'মুছুন'))) return;
    try { await API.deleteNotice(b.dataset.del); toast('নোটিশ মুছে ফেলা হয়েছে।', 'success'); load(); }
    catch (er) { toast(errMsg(er), 'error'); }
  });
  load();
}

async function tabSettings(el) {
  el.innerHTML = '<div class="skel" style="height:120px"></div>';
  const s = S.settings;
  el.innerHTML = `<form id="setForm" class="glass form-card" novalidate>
    <h2>সাইটের লেখা ও তথ্য</h2>
    ${SETTING_FIELDS.map((g) => `<fieldset><legend>${g.group}</legend>${g.items.map(([k, label, type]) =>
      type === 'textarea' ? `<div class="field"><label for="s-${k}">${label}</label><textarea id="s-${k}" name="${k}">${esc(s[k])}</textarea></div>`
      : type === 'toggle' ? `<label class="check"><input type="checkbox" name="${k}" ${s[k] === 'true' ? 'checked' : ''}><span>${label}</span></label>`
      : `<div class="field"><label for="s-${k}">${label}</label><input id="s-${k}" name="${k}" value="${esc(s[k])}"></div>`).join('')}</fieldset>`).join('')}
    <p class="form-msg" id="setMsg" role="alert"></p>
    <div class="actions"><button class="btn btn-primary" type="submit">সেটিংস সংরক্ষণ করুন</button></div></form>`;
  $('#setForm', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), out = {};
    SETTING_FIELDS.forEach((g) => g.items.forEach(([k, , type]) => { out[k] = type === 'toggle' ? (f.get(k) === 'on' ? 'true' : 'false') : String(f.get(k) || '').trim(); }));
    if (!out.org_name) { $('#setMsg').textContent = 'সংগঠনের নাম খালি রাখা যাবে না।'; return; }
    const btn = $('button[type="submit"]', e.target); setBusy(btn, true);
    try { await API.saveSettings(out); Object.assign(S.settings, out); applySettings(); toast('সেটিংস সংরক্ষিত হয়েছে।', 'success'); $('#setMsg').textContent = ''; }
    catch (er) { $('#setMsg').textContent = errMsg(er); }
    finally { setBusy(btn, false); }
  });
}

async function tabPayments(el) {
  el.innerHTML = '<div class="skel" style="height:120px"></div>';
  let pays = [];
  try { pays = await API.payments(true); } catch { /* ignore */ }
  el.innerHTML = `<div class="sec-block" style="margin-top:0"><div class="between"><h2>ডোনেশন নম্বর</h2><button class="btn btn-ghost btn-sm" id="addPay" type="button">${icon('plus')} নতুন যোগ করুন</button></div>
    <p class="muted">এখানকার নম্বরগুলো ডোনেশন পেজে সবার সামনে দেখা যায়।</p><div id="payList" class="row-list"></div></div>`;
  const list = $('#payList', el);
  const payRow = (m) => `<div class="pay-edit glass" data-id="${esc(m.id || '')}">
    <div class="grid-2"><div class="field"><label>নাম</label><input name="name" value="${esc(m.name)}" maxlength="40"></div>
    <div class="field"><label>ধরন</label><select name="kind">${PAY_KINDS.map(([k, l]) => `<option value="${k}" ${m.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div class="grid-2"><div class="field"><label>নম্বর / অ্যাকাউন্ট</label><input name="number" value="${esc(m.number)}" maxlength="60"></div>
    <div class="field"><label>অ্যাকাউন্টের ধরন</label><input name="account_type" value="${esc(m.account_type)}" maxlength="40" placeholder="পার্সোনাল / এজেন্ট"></div></div>
    <label class="check"><input type="checkbox" name="active" ${m.active !== false ? 'checked' : ''}><span>ডোনেশন পেজে দেখান</span></label>
    <div class="actions"><button class="btn btn-primary btn-sm" data-act="save" type="button">সংরক্ষণ</button>${m.id ? `<button class="btn btn-danger btn-sm" data-act="del" type="button">${icon('trash')} মুছুন</button>` : '<button class="btn btn-ghost btn-sm" data-act="cancel" type="button">বাতিল</button>'}</div></div>`;
  list.innerHTML = pays.map(payRow).join('') || '<p class="muted">এখনও কোনো নম্বর যোগ করা হয়নি।</p>';
  $('#addPay', el).addEventListener('click', () => { list.insertAdjacentHTML('afterbegin', payRow({ kind: 'bkash', name: 'বিকাশ', account_type: 'পার্সোনাল' })); });
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const box = b.closest('.pay-edit'), id = box.dataset.id;
    if (b.dataset.act === 'cancel') { box.remove(); return; }
    try {
      if (b.dataset.act === 'del') {
        if (!(await confirmBox('এই ডোনেশন নম্বরটি মুছে ফেলা হবে। নিশ্চিত?', 'মুছুন'))) return;
        await API.deletePayment(id); box.remove(); toast('মুছে ফেলা হয়েছে।', 'success'); return;
      }
      const q = (n) => box.querySelector(`[name="${n}"]`);
      const m = { id: id || undefined, name: q('name').value.trim(), kind: q('kind').value, number: q('number').value.trim(), account_type: q('account_type').value.trim(), active: q('active').checked, sort_order: id ? (pays.find((p) => p.id === id) || {}).sort_order || 0 : pays.length + 1 };
      if (!m.name || !m.number) { toast('নাম ও নম্বর দিন।', 'warn'); return; }
      setBusy(b, true);
      const saved = await API.savePayment(m);
      box.outerHTML = payRow(saved);
      const i = pays.findIndex((p) => p.id === saved.id); if (i >= 0) pays[i] = saved; else pays.push(saved);
      toast('সংরক্ষিত হয়েছে।', 'success');
    } catch (er) { toast(errMsg(er), 'error'); setBusy(b, false); }
  });
}

/* ---------------------------------------------------------------- ডোনেশন */
routes.donate = async (app, p, alive) => {
  app.innerHTML = `<section class="container"><h1 class="page-title">ডোনেশন</h1>
    <p class="muted" style="max-width:640px">${esc(S.settings.donation_note)}</p>
    <div class="sec-block"><div class="pay-grid" id="payGrid"><div class="skel"></div><div class="skel"></div></div>
    <div class="note warn">${icon('alert')}<span>টাকা পাঠানোর আগে নম্বরটি ভালো করে মিলিয়ে নিন। সন্দেহ হলে সংগঠনের যোগাযোগ নম্বরে ফোন করে নিশ্চিত হয়ে নিন। রক্তের জন্য কোনো টাকা দিতে হয় না।</span></div></div></section>`;
  let pays = [];
  try { pays = await API.payments(false); } catch { /* ignore */ }
  if (!alive()) return;
  $('#payGrid', app).innerHTML = pays.length ? pays.map((m) => `<div class="pay-card glass pay-${esc(m.kind)}">
      <div class="pay-name"><i></i>${esc(m.name)}</div>
      <div class="pay-num">${esc(bn(m.number))}</div>
      ${m.account_type ? `<span class="muted">${esc(m.account_type)} অ্যাকাউন্ট</span>` : ''}
      <button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(m.number)}">${icon('copy')} নম্বর কপি করুন</button></div>`).join('')
    : '<div class="empty glass"><b>এখনও কোনো ডোনেশন নম্বর যোগ করা হয়নি।</b></div>';
};

/* ---------------------------------------------------------------- আমাদের সম্পর্কে */
function contactList(phone, email, fb, address) {
  const f = safeUrl(fb);
  return `<div class="contact-list">
    ${phone ? (isPhone(normPhone(phone)) ? `<a href="tel:${esc(normPhone(phone))}">${icon('phone')}${esc(bn(phone))}</a>` : `<div>${icon('phone')}${esc(phone)}</div>`) : ''}
    ${email ? `<a href="mailto:${esc(email)}">${icon('mail')}${esc(email)}</a>` : ''}
    ${f ? `<a href="${esc(f)}" target="_blank" rel="noopener">${icon('facebook')}ফেসবুক পেজ</a>` : ''}
    ${address ? `<div>${icon('pin')}${esc(address)}</div>` : ''}</div>`;
}
routes.about = async (app) => {
  const s = S.settings;
  app.innerHTML = `<section class="container"><h1 class="page-title">আমাদের সম্পর্কে</h1>
    <div class="prose glass">${paragraphs(s.about_text)}</div>
    <div class="values">
      <div class="value glass">${icon('heart')}<b>স্বেচ্ছাসেবা</b><p>কোনো লাভের আশা ছাড়াই মানুষের পাশে দাঁড়ানো।</p></div>
      <div class="value glass">${icon('shield')}<b>অরাজনৈতিক</b><p>এটি কোনো রাজনৈতিক সংগঠন নয়; শুধুই শিক্ষার্থীদের মানবিক উদ্যোগ।</p></div>
      <div class="value glass">${icon('users')}<b>তারুণ্যের শক্তি</b><p>শিক্ষার্থীরাই এর উদ্যোক্তা, পরিচালক ও স্বেচ্ছাসেবক।</p></div>
    </div>
    <h2 class="sec-title">যোগাযোগ</h2>${contactList(s.contact_phone, s.contact_email, s.contact_facebook, s.contact_address)}
    <div class="cta" style="justify-content:flex-start;margin-top:22px"><a class="btn btn-primary" href="#/register">${icon('user-plus')} রক্তদাতা হোন</a><a class="btn btn-ghost" href="#/donate">${icon('heart')} ডোনেশন দিন</a></div>
  </section>`;
};

/* ---------------------------------------------------------------- ডেভেলপার */
routes.developer = async (app) => {
  const s = S.settings;
  app.innerHTML = `<section class="container narrow"><h1 class="page-title">ডেভেলপার পরিচিতি</h1>
    <div class="dev-card glass"><div class="avatar">${esc((s.dev_name || '?').trim().charAt(0))}</div>
      <h2>${esc(s.dev_name)}</h2><span class="eyebrow" style="margin:0">${esc(s.dev_role)}</span>
      <p class="muted">${esc(s.dev_bio)}</p>
      <div style="width:100%;text-align:left">${contactList(s.dev_phone, s.dev_email, s.dev_facebook, '')}</div>
    </div>
    <div class="note" style="margin-top:16px">${icon('phone2')}<span>এই ওয়েবসাইটটি ফোনের হোম স্ক্রিনে অ্যাপের মতো ইনস্টল করে ব্যবহার করা যায়।</span></div>
  </section>`;
};

/* ---------------------------------------------------------------- গ্লোবাল ইভেন্ট */
function bindGlobal() {
  $('#themeBtn').addEventListener('click', toggleTheme);
  $('#menuBtn').addEventListener('click', () => setDrawer(!document.body.classList.contains('drawer-open')));
  $('#scrim').addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setDrawer(false); closeModal(); } });
  window.addEventListener('hashchange', route);

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-logout]')) { e.preventDefault(); setDrawer(false); logout(); return; }
    if (e.target.closest('.drawer-links a')) setDrawer(false);
    if (e.target.closest('.js-install')) { doInstall(); return; }
    if (e.target.closest('#modal [data-close]')) { closeModal(); return; }
    const c = e.target.closest('[data-copy]');
    if (c) {
      const text = c.dataset.copy;
      try { await navigator.clipboard.writeText(text); toast('নম্বর কপি হয়েছে।', 'success'); }
      catch { toast('কপি করা যায়নি, নম্বরটি চেপে ধরে কপি করুন।', 'warn'); }
    }
  });
  /* বাটনের রিপল অ্যানিমেশন */
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span'); s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s); setTimeout(() => s.remove(), 700);
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; updateInstallUI(); });
  window.addEventListener('appinstalled', () => { S.installEvt = null; updateInstallUI(); toast('অ্যাপ ইনস্টল হয়েছে!', 'success'); });
}

/* ---------------------------------------------------------------- চালু */
async function boot() {
  $('#year').textContent = bn(new Date().getFullYear());
  applyTheme(document.documentElement.dataset.theme || 'light', false);
  bindGlobal();
  renderNav();
  updateInstallUI();
  if (DEMO) {
    const bar = $('#demoBar');
    bar.hidden = false;
    bar.innerHTML = '<b>ডেমো মোড</b> — নমুনা তথ্য দেখানো হচ্ছে। js/config.js-এ Supabase-এর তথ্য বসালে আসল সাইট চালু হবে।';
  }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  const loadSettings = API.settings().then((r) => { Object.assign(S.settings, r); }).catch(() => {});
  const cap = new Promise((r) => setTimeout(r, 3000));
  const authDone = initAuth();
  S.authReady = authDone;
  API.recordVisit().catch(() => {});
  if (LANDING) {
    await Promise.race([authDone, new Promise((r) => setTimeout(r, 8000))]);
    const target = LANDING.error ? '#/auth-error?c=' + encodeURIComponent(LANDING.error) : LANDING.type === 'recovery' ? '#/reset' : '#/verified';
    history.replaceState(null, '', location.pathname + location.search + target);
  } else {
    await Promise.race([Promise.all([authDone, loadSettings]), cap]);
  }
  authDone.then(() => { renderNav(); if (['dashboard', 'login', 'register'].includes(currentPath())) route(); });
  loadSettings.then(() => { applySettings(); });
  applySettings();
  renderNav();
  route();
}
boot();
})();
