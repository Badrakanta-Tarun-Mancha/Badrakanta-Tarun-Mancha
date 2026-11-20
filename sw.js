/* সার্ভিস ওয়ার্কার: সাইটকে অ্যাপের মতো ইনস্টলযোগ্য করে এবং অফলাইনে মূল পেজ খোলার সুবিধা দেয়।
   সাইটে বড় পরিবর্তন করলে নিচের VERSION সংখ্যাটা বাড়িয়ে দিন। */
const VERSION = 'v6';
const CACHE = 'btm-blood-' + VERSION;
const CORE = [
  './', 'index.html', 'css/style.css', 'css/theme.css', 'js/config.js', 'js/districts.js', 'js/app.js',
  'manifest.webmanifest', 'assets/logo-mark.png', 'assets/logo-mark-dark.png',
  'assets/icon-192.png', 'assets/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, ফন্ট, CDN — সরাসরি নেটওয়ার্কে

  const isAsset = url.pathname.includes('/assets/');
  if (isAsset) {
    // ছবি: আগে ক্যাশ
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // বাকি সব: আগে নেটওয়ার্ক (সবসময় নতুন কোড), না পেলে ক্যাশ
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
