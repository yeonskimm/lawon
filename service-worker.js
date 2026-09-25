// 법ON 서비스워커 (https://yeonskimm.github.io/lawon/)
// - 앱 화면(index.html): 네트워크 우선. 3초 안에 응답이 없거나 오프라인이면 저장본을 띄우고, 새 화면은 뒤에서 받아 저장
//   저장본을 띄운 뒤 받은 새 화면이 저장본과 다르면 열려 있는 화면에 알림 → 화면 쪽에서 자동 업데이트
// - 아이콘·manifest: 저장본 우선, 뒤에서 새로 받아 둠
// - 그 밖의 요청(업데이트 확인, 국가법령정보센터 등)은 건드리지 않음
// index.html만 바꿀 때는 이 파일을 고칠 필요 없음. 이 파일·아이콘·manifest를 바꿀 때만 CACHE_NAME 숫자를 올림(lawon-v2 → lawon-v3)
const CACHE_NAME = 'lawon-v3';   // 2026-09-25 책자 아이콘 교체로 올림
const PAGE_KEY = './index.html';
const ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const ASSET_PATHS = ASSETS.map(a => new URL(a, self.registration.scope).pathname);
const TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled([PAGE_KEY].concat(ASSETS).map(f => cache.add(f)))));
  self.skipWaiting();   // 새 서비스워커는 바로 적용(쓰고 있는 화면을 강제로 새로고침하지는 않음)
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))   // 이전 캐시(beopon-v1 등) 삭제
      .then(() => self.clients.claim())
  );
});

const tagOf = r => r ? (r.headers.get('ETag') || r.headers.get('Last-Modified') || '') : '';
const offline = () => new Response('오프라인 상태입니다. 인터넷에 연결한 뒤 다시 열어 주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
const notifyUpdated = () => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage({ type: 'LAWON_UPDATED' })));

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    const cachedP = caches.open(CACHE_NAME).then(c => c.match(PAGE_KEY));
    let servedStale = false;
    const net = fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }));   // GitHub Pages의 10분 캐시를 건너뛰고 서버에 확인(바뀌지 않았으면 304로 가볍게)
    const saved = net.then(res => {
      if (!res || !res.ok) return;
      const copy = res.clone();
      return cachedP.then(old => caches.open(CACHE_NAME).then(c => c.put(PAGE_KEY, copy)).then(() => {
        if (servedStale && tagOf(old) && tagOf(res) && tagOf(old) !== tagOf(res)) return notifyUpdated();
      }));
    }).catch(() => {});
    event.waitUntil(saved);   // 저장본을 먼저 띄워도 새 화면 저장·알림은 끝까지
    event.respondWith(cachedP.then(cached => {
      if (!cached) return net.catch(offline);
      const late = new Promise(resolve => setTimeout(() => resolve(null), TIMEOUT_MS));
      return Promise.race([net.then(res => (res && res.ok) ? res : null, () => null), late])
        .then(res => { if (res) return res; servedStale = true; return cached; });
    }));
    return;
  }

  if (!url.search && ASSET_PATHS.indexOf(url.pathname) >= 0) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
