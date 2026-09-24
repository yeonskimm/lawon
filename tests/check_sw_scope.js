// 서비스워커 캐시 삭제 범위 검사 — 법ON은 자기 캐시(lawon-·beopon-)만 지워야 함
// 캐시 저장소를 같은 주소(yeonskimm.github.io)의 「오늘의안전」(onul-safety-)과 공유하므로,
// '내 이름이 아닌 캐시 전부 삭제'로 되돌아가면 오늘의안전 오프라인 저장본이 지워진다.
// 실행: node tests/check_sw_scope.js service-worker.js
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(process.argv[2] || 'service-worker.js', 'utf8');
const store = new Set(['lawon-v1', 'lawon-v2', 'beopon-v1', 'onul-safety-v96', 'onul-safety-v97', 'other-app-v1']);
const handlers = {};
const self = { addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting() {}, registration: { scope: 'https://yeonskimm.github.io/lawon/' },
  location: { origin: 'https://yeonskimm.github.io' }, clients: { claim: async () => {}, matchAll: async () => [] } };
const caches = { keys: async () => [...store], delete: async k => store.delete(k),
  open: async k => { store.add(k); return { add: async () => {}, match: async () => null, put: async () => {} }; } };
vm.runInNewContext(src, { self, caches, URL, Response, Request: function () {}, fetch: async () => null, setTimeout, Promise, console });
const name = (src.match(/CACHE_NAME = '([^']+)'/) || [])[1];
if (!name) { console.log('❌ CACHE_NAME을 찾지 못함'); process.exit(1); }
store.add(name);
let job; handlers.activate({ waitUntil: p => { job = p; } });
job.then(() => {
  const bad = [];
  if (!store.has(name)) bad.push(`내 현재 캐시(${name})가 지워짐`);
  ['onul-safety-v96', 'onul-safety-v97', 'other-app-v1'].forEach(k => { if (!store.has(k)) bad.push(`다른 앱 캐시(${k})를 지움`); });
  ['lawon-v1', 'lawon-v2', 'beopon-v1'].forEach(k => { if (k !== name && store.has(k)) bad.push(`내 이전 캐시(${k})가 안 지워짐`); });
  console.log('활성화 후 남은 캐시:', [...store].sort().join(', '));
  if (bad.length) { bad.forEach(b => console.log('❌', b)); process.exit(1); }
  console.log('✅ 자기 캐시만 삭제 — 다른 앱 저장본 보존');
}).catch(e => { console.log('❌ 실행 오류', e); process.exit(1); });
