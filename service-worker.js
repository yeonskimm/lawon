// 법ON 서비스워커 (https://yeonskimm.github.io/lawon/)
// - 앱 화면(index.html): 저장본 우선(2026-10-23 — 현장 약한 신호에서 3초 기다림·전체 다시 받기 없애려고). 저장본을 바로 띄우고 새 화면은 뒤에서 받아 저장
//   받은 새 화면이 저장본과 다르면 열려 있는 화면에 알림 → 화면 쪽에서 업데이트(연 지 5초 안·첫 화면이면 새로고침, 아니면 안내 띠). 저장본이 없으면(첫 설치) 네트워크
// - 아이콘·manifest: 저장본 우선, 뒤에서 새로 받아 둠
// - 그 밖의 요청(업데이트 확인, 국가법령정보센터, 만화 보기 comic/ 등)은 건드리지 않음
//   2026-10-23(v9): 페이지 열기도 앱 화면 주소(/lawon/·/lawon/index.html)만 맡음 — v8은 같은 사이트의 다른 페이지(comic/ 등)를 열면 앱 화면을 대신 띄우고 그 페이지를 앱 저장본 자리에 덮어썼음
// index.html만 바꿀 때는 이 파일을 고칠 필요 없음. 이 파일·아이콘·manifest를 바꿀 때만 CACHE_NAME 숫자를 올림(lawon-v7 → lawon-v8)
// 캐시 저장소는 주소(yeonskimm.github.io) 단위로 「오늘의안전」(onul-safety-)과 공유됨 → 삭제는 반드시 내 접두어(lawon-·옛 이름 beopon-)만
const CACHE_NAME = 'lawon-v9';   // 2026-10-23 앱 화면 저장본 우선(v8) → 페이지 열기 범위를 앱 화면으로 한정(v9). 새 캐시에 앱 화면을 새로 받으므로 v8에서 덮어써진 저장본도 바로잡힘
const SW_VER = 9;   // 앱 화면이 물어보면 알려 줌(LAWON_VER) — 앱은 v9 이상일 때만 우리 사이트 만화 보기로 연결
const MY_CACHE = k => k.startsWith('lawon-') || k.startsWith('beopon-');
const PAGE_KEY = './index.html';
const ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const ASSET_PATHS = ASSETS.map(a => new URL(a, self.registration.scope).pathname);
const APP_PATHS = ['./', './index.html'].map(a => new URL(a, self.registration.scope).pathname);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled([PAGE_KEY].concat(ASSETS).map(f => cache.add(f)))));
  self.skipWaiting();   // 새 서비스워커는 바로 적용(쓰고 있는 화면을 강제로 새로고침하지는 않음)
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => MY_CACHE(k) && k !== CACHE_NAME).map(k => caches.delete(k))))   // 내 이전 캐시(lawon-v2, beopon-v1 등)만 삭제 — 오늘의안전 캐시는 건드리지 않음
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

  if (req.mode === 'navigate' && APP_PATHS.indexOf(url.pathname) >= 0) {
    const cachedP = caches.open(CACHE_NAME).then(c => c.match(PAGE_KEY));
    const net = fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }));   // GitHub Pages의 10분 캐시를 건너뛰고 서버에 확인(바뀌지 않았으면 304로 가볍게)
    const saved = net.then(res => {
      if (!res || !res.ok) return;
      const copy = res.clone();
      return cachedP.then(old => caches.open(CACHE_NAME).then(c => c.put(PAGE_KEY, copy)).then(() => {
        if (old && tagOf(old) && tagOf(res) && tagOf(old) !== tagOf(res)) return notifyUpdated();   // 저장본을 띄웠는데 서버 판이 다르면 알림
      }));
    }).catch(() => {});
    event.waitUntil(saved);   // 저장본을 먼저 띄워도 새 화면 저장·알림은 끝까지
    event.respondWith(cachedP.then(cached => cached || net.catch(offline)));
    return;
  }

  if (!url.search && ASSET_PATHS.indexOf(url.pathname) >= 0) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});

self.addEventListener('message', event => {   // 2026-10-23: 앱 화면의 버전 확인(만화 보기 연결 여부)
  if (event.data && event.data.type === 'LAWON_VER' && event.ports && event.ports[0]) event.ports[0].postMessage({ v: SW_VER });
});
