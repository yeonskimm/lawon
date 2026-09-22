// 법ON 서비스워커
// - 앱 화면(index.html): 네트워크 우선. 3초 안에 응답이 없거나 오프라인이면 저장해 둔 화면을 띄우고, 새 화면은 뒤에서 받아 다음 실행 때 반영
// - 아이콘·manifest: 저장본 우선, 뒤에서 새로 받아 둠
// - 국가법령정보센터 등 바깥 주소는 건드리지 않음
// 아이콘·manifest·이 파일을 바꿔 올릴 때는 CACHE_NAME 숫자를 올린다(beopon-v1 → beopon-v2). index.html만 바꿀 때는 그대로 둔다
const CACHE_NAME = 'beopon-v1';
const APP_SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const PAGE_KEY = './index.html';
const TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled(APP_SHELL.map(f => cache.add(f)))));
  self.skipWaiting();   // 새 버전은 바로 적용하되, 쓰고 있는 화면을 강제로 새로고침하지는 않음
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isPage(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  if (isPage(req)) {
    let saving = Promise.resolve();
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); saving = caches.open(CACHE_NAME).then(c => c.put(PAGE_KEY, copy)); }
      return res;
    });
    event.waitUntil(net.then(() => saving).catch(() => {}));   // 저장본을 먼저 띄워도 새 화면 저장은 끝까지
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(PAGE_KEY)).then(cached => {
      if (!cached) return net.catch(() => new Response('오프라인 상태입니다. 인터넷에 연결한 뒤 다시 열어 주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
      const late = new Promise(resolve => setTimeout(() => resolve(cached), TIMEOUT_MS));
      return Promise.race([net.then(res => (res && res.ok) ? res : cached).catch(() => cached), late]);
    }));
    return;
  }

  event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
