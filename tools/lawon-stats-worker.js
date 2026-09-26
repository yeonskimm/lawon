// 법ON 이용자 수 집계 — Cloudflare Worker(이름 lawon-stats) + D1(lawon-stats). 2026-09-26
// 이 파일은 보관용(배포 사이트에 올라가지 않음). Cloudflare 워커 편집 화면에 붙여 넣어 씀
// 바인딩: D1 → 변수 이름 DB / 비밀값: STATS_KEY(통계 보기 비밀번호)
// D1 표(콘솔에서 한 번 실행):
//   CREATE TABLE users(uid TEXT PRIMARY KEY, first_day TEXT, device TEXT) WITHOUT ROWID;
//   CREATE TABLE visits(day TEXT, uid TEXT, device TEXT, PRIMARY KEY(day,uid)) WITHOUT ROWID;
// 앱(index.html)은 하루 한 번 무작위 번호만 POST /ping. 같은 날 두 번째부터는 INSERT OR IGNORE라 쓰기 없음 → 하루 쓰기 ≈ 이용자 수 × 2
// 통계: 앱 첫 화면 책자·앱 이름 5번 누르기(관리자 모드, POST /admin) 또는 https://lawon-stats.darksky166.workers.dev/stats?key=<STATS_KEY>
const OK = 'https://yeonskimm.github.io';
const FAIL = new Map();   // 관리자 비밀번호 틀린 횟수(IP별, 서버 메모리 — 재시작되면 초기화)
export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': OK, 'Vary': 'Origin' };
    if (url.pathname === '/ping' && req.method === 'POST') {
      if (origin !== OK) return new Response('', { status: 403 });
      let b = {}; try { b = JSON.parse(await req.text()); } catch (e) {}
      const uid = String(b.uid || '');
      if (!/^[0-9a-f-]{32,40}$/i.test(uid)) return new Response('', { status: 400, headers: cors });
      const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
      const ua = req.headers.get('User-Agent') || '';
      const dev = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : 'PC';
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO users VALUES(?1,?2,?3)').bind(uid, day, dev),
        env.DB.prepare('INSERT OR IGNORE INTO visits VALUES(?1,?2,?3)').bind(day, uid, dev)]);
      return new Response('{"ok":true}', { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/admin' && req.method === 'POST') {   // 앱 관리자 모드(첫 화면 5번 누르기): 날짜별 이용자·신규
      if (origin !== OK) return new Response('', { status: 403 });
      const ip = req.headers.get('CF-Connecting-IP') || '', now = Date.now(), f = FAIL.get(ip);
      if (f && f.n >= 5 && now - f.t < 600e3) return new Response('', { status: 429, headers: cors });   // 5번 틀리면 10분 잠금(같은 서버 안에서)
      let b = {}; try { b = JSON.parse(await req.text()); } catch (e) {}
      if (!env.STATS_KEY || String(b.key || '') !== env.STATS_KEY) {
        FAIL.set(ip, { n: (f && now - f.t < 600e3 ? f.n : 0) + 1, t: now }); if (FAIL.size > 500) FAIL.clear();
        return new Response('', { status: 403, headers: cors });
      }
      FAIL.delete(ip);
      const from = new Date(Date.now() + 9 * 3600e3 - 40 * 86400e3).toISOString().slice(0, 10);
      const q = (s, ...a) => env.DB.prepare(s).bind(...a).all().then(r => r.results);
      const [t, v, nw] = await Promise.all([
        q('SELECT count(*) n FROM users'),
        q('SELECT day, count(*) n FROM visits WHERE day >= ?1 GROUP BY day', from),
        q('SELECT first_day day, count(*) n FROM users WHERE first_day >= ?1 GROUP BY first_day', from)]);
      const m = {}; v.forEach(x => { m[x.day] = { day: x.day, n: x.n, nw: 0 }; }); nw.forEach(x => { (m[x.day] = m[x.day] || { day: x.day, n: 0, nw: 0 }).nw = x.n; });
      return new Response(JSON.stringify({ total: t[0].n, days: Object.values(m) }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/stats') {
      if (!env.STATS_KEY || url.searchParams.get('key') !== env.STATS_KEY) return new Response('forbidden', { status: 403 });
      const q = s => env.DB.prepare(s).all().then(r => r.results);
      const [t, d, v] = await Promise.all([
        q('SELECT count(*) n FROM users'),
        q('SELECT device, count(*) n FROM users GROUP BY device'),
        q('SELECT day, count(*) n FROM visits GROUP BY day ORDER BY day DESC LIMIT 30')]);
      const row = a => a.map(x => `<tr><td>${x.day || x.device}</td><td>${x.n}</td></tr>`).join('');
      return new Response(`<meta charset="utf-8"><meta name="viewport" content="width=device-width">
<h2>법ON 누적 이용자 ${t[0].n}명</h2><h3>기기별</h3><table>${row(d)}</table>
<h3>날짜별 이용자(최근 30일)</h3><table>${row(v)}</table>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return new Response('not found', { status: 404 });
  }
};
