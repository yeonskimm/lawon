// 법ON 이용자 수 집계 — Cloudflare Worker(이름 lawon-stats) + D1(lawon-stats). 2026-09-26
// 이 파일은 보관용(배포 사이트에 올라가지 않음). Cloudflare 워커 편집 화면에 붙여 넣어 씀
// 바인딩: D1 → 변수 이름 DB / 비밀값: STATS_KEY(통계 보기 비밀번호)
// D1 표(콘솔에서 한 번 실행):
//   CREATE TABLE users(uid TEXT PRIMARY KEY, first_day TEXT, device TEXT) WITHOUT ROWID;
//   CREATE TABLE visits(day TEXT, uid TEXT, device TEXT, PRIMARY KEY(day,uid)) WITHOUT ROWID;
// 앱(index.html)은 하루 한 번 무작위 번호만 POST /ping. 같은 날 두 번째부터는 INSERT OR IGNORE라 쓰기 없음 → 하루 쓰기 ≈ 이용자 수 × 2
// 통계: 앱 첫 화면 책자·앱 이름 5번 누르기(관리자 모드, POST /admin) 또는 https://lawon-stats.darksky166.workers.dev/stats?key=<STATS_KEY>
// 의견 보내기(2026-11-17): 앱 설정 → 의견 보내기가 POST /feedback {uid,cat,text,tab,ver}. 목록은 관리자 모드(POST /admin 응답의 fb, 최근 200건)
//   표 feedback은 처음 쓸 때 워커가 만듦(FB_SQL). 안 만들어지면 D1 콘솔에서 FB_SQL 한 줄을 실행
//   제한: 같은 기기(무작위 번호) 10분에 3건, 같은 IP 1시간에 30건(청 내부망은 여러 사람이 같은 IP라 넉넉하게) → 넘으면 429
//   IP는 저장하지 않고 STATS_KEY를 섞은 해시 앞 16자리만 저장(제한 세는 용도). 접수 후 180일 지난 줄은 다음 접수 때 지움
const OK = 'https://yeonskimm.github.io';
const FAIL = new Map();   // 관리자 비밀번호 틀린 횟수(IP별, 서버 메모리 — 재시작되면 초기화)
const FB_SQL = 'CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, cat TEXT, body TEXT, dev TEXT, tab TEXT, ver TEXT, uid TEXT, iph TEXT)';
const FB_KEEP = 180 * 86400e3, FB_UID_MS = 600e3, FB_UID_MAX = 3, FB_IP_MS = 3600e3, FB_IP_MAX = 30, FB_LEN = 500, FB_LIST = 200;
let fbReady = false;   // 표 확인은 서버가 새로 뜰 때 한 번만
async function fbTable(env) { if (fbReady) return; await env.DB.prepare(FB_SQL).run(); fbReady = true; }
async function fbIpHash(ip, salt) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + salt));
  return Array.from(new Uint8Array(d)).slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
}
function fbShort(v) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 30); }
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
    if (url.pathname === '/feedback' && req.method === 'POST') {   // 의견 보내기(2026-11-17)
      if (origin !== OK) return new Response('', { status: 403 });
      const raw = await req.text();
      if (raw.length > 4000) return new Response('', { status: 413, headers: cors });
      let b = {}; try { b = JSON.parse(raw); } catch (e) {}
      if (!b || typeof b !== 'object') b = {};
      const uid = String(b.uid || ''), text = String(b.text == null ? '' : b.text).trim().slice(0, FB_LEN);
      if (!/^[0-9a-f-]{32,40}$/i.test(uid) || !text) return new Response('', { status: 400, headers: cors });
      const cat = ['law', 'app', 'sug'].indexOf(b.cat) >= 0 ? b.cat : 'etc';
      const ua = req.headers.get('User-Agent') || '';
      const dev = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : 'PC';
      const now = Date.now();
      try {
        const iph = await fbIpHash(req.headers.get('CF-Connecting-IP') || '', env.STATS_KEY || '');
        await fbTable(env);
        const [u, i] = await env.DB.batch([
          env.DB.prepare('SELECT count(*) n FROM feedback WHERE uid = ?1 AND ts > ?2').bind(uid, now - FB_UID_MS),
          env.DB.prepare('SELECT count(*) n FROM feedback WHERE iph = ?1 AND ts > ?2').bind(iph, now - FB_IP_MS)]);
        if (u.results[0].n >= FB_UID_MAX || i.results[0].n >= FB_IP_MAX) return new Response('', { status: 429, headers: cors });
        await env.DB.batch([
          env.DB.prepare('INSERT INTO feedback(ts,cat,body,dev,tab,ver,uid,iph) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)').bind(now, cat, text, dev, fbShort(b.tab), fbShort(b.ver), uid, iph),
          env.DB.prepare('DELETE FROM feedback WHERE ts < ?1').bind(now - FB_KEEP)]);
      } catch (e) { fbReady = false; return new Response('', { status: 500, headers: cors }); }
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
      const [t, vt, v, nw] = await Promise.all([
        q('SELECT count(*) n FROM users'),
        q('SELECT count(*) n FROM visits'),   // 연인원(날마다 이용자 합계) — 2026-09-28 추가
        q('SELECT day, count(*) n FROM visits WHERE day >= ?1 GROUP BY day', from),
        q('SELECT first_day day, count(*) n FROM users WHERE first_day >= ?1 GROUP BY first_day', from)]);
      const m = {}; v.forEach(x => { m[x.day] = { day: x.day, n: x.n, nw: 0 }; }); nw.forEach(x => { (m[x.day] = m[x.day] || { day: x.day, n: 0, nw: 0 }).nw = x.n; });
      let fb = null;   // 의견 목록(2026-11-17) — 표를 못 읽어도 이용 통계는 그대로 보냄(null이면 앱이 '불러오지 못함'으로 표시)
      try { await fbTable(env); fb = await q('SELECT ts, cat, body, dev, tab, ver FROM feedback WHERE ts >= ?1 ORDER BY ts DESC, id DESC LIMIT ' + FB_LIST, Date.now() - FB_KEEP); } catch (e) { fbReady = false; }
      return new Response(JSON.stringify({ total: t[0].n, vt: vt[0].n, days: Object.values(m), fb }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/stats') {
      if (!env.STATS_KEY || url.searchParams.get('key') !== env.STATS_KEY) return new Response('forbidden', { status: 403 });
      const q = s => env.DB.prepare(s).all().then(r => r.results);
      const [t, vt, d, v] = await Promise.all([
        q('SELECT count(*) n FROM users'),
        q('SELECT count(*) n FROM visits'),
        q('SELECT device, count(*) n FROM users GROUP BY device'),
        q('SELECT day, count(*) n FROM visits GROUP BY day ORDER BY day DESC LIMIT 30')]);
      const row = a => a.map(x => `<tr><td>${x.day || x.device}</td><td>${x.n}</td></tr>`).join('');
      return new Response(`<meta charset="utf-8"><meta name="viewport" content="width=device-width">
<h2>법ON 누적 이용 기기 ${t[0].n}대 · 연인원 ${vt[0].n}명</h2><h3>기기별</h3><table>${row(d)}</table>
<h3>날짜별 이용자(최근 30일)</h3><table>${row(v)}</table>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return new Response('not found', { status: 404 });
  }
};
