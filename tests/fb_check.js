// 의견 보내기(2026-11-17, 홈 화면 맨 아래 문의 줄 → 아래 창 → 워커 POST /feedback → 관리자 화면 의견 목록) 확인
// 사용: node tests/fb_check.js index.html [워커 파일]   (워커 파일 기본값 tools/lawon-stats-worker.js)
// ① 앱 화면·문구·전송 항목 ② 예시 문구가 법령과 맞는지(산업안전보건법 제29조 = 과태료, 시행령 별표 35 = 과태료의 부과기준)
// ③ 워커를 가짜 D1(node:sqlite) 위에서 실제로 돌려 접수·제한(기기 10분 3건, IP 1시간 30건)·180일 삭제·관리자 목록 확인
const fs = require('fs'), path = require('path'), os = require('os'), url = require('url');
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const WORKER = process.argv[3] || path.join(__dirname, '..', 'tools', 'lawon-stats-worker.js');
let f = 0, n = 0; const ok = (name, c, info) => { n++; if (!c) f++; console.log((c ? 'PASS ' : 'FAIL ') + name + (c || info === undefined ? '' : '  → ' + JSON.stringify(info))); };
const cnt = (s, x) => s.split(x).length - 1;

// ── ① 앱 ──
const sheet = (/<div class="sheet" id="sheet"[\s\S]*?\n<\/div>\n/.exec(html) || [''])[0];
const fsheet = (/<div class="sheet" id="fsheet"[\s\S]*?\n<\/div>\n/.exec(html) || [''])[0];
ok('설정 창에는 의견 보내기 없음(5-93 — 홈 화면 한 곳)', !!sheet && !/data-fbopen|의견 보내기|문의 · 오류 신고/.test(sheet) && /<\/details>\s*<\/div>\s*<\/div>\n$/.test(sheet));
const vStart = (/<section[^>]*id="vStart"[\s\S]*?<\/section>/.exec(html) || [''])[0];
ok('홈 화면 맨 아래 문의 줄(5-92) — 계산 도구 뒤 마지막 칸, 같은 창을 엶', cnt(vStart, 'data-fbopen') === 1 && /<button type="button" class="sfb" data-fbopen="1" aria-label="문의 · 오류 신고 — 의견 보내기">[\s\S]*?<span>문의 · 오류 신고<\/span><em>의견 보내기<\/em>[\s\S]*?<\/button>\s*<\/div>\s*<\/section>/.test(vStart) && vStart.indexOf('data-fbopen') > vStart.indexOf('id="instStart"') && cnt(html, 'data-fbopen=') === 1);
ok('설정 창 기존 고지 그대로(이름·연락처 받지 않음, 검색어·조건 전송 안 함)', /이름·연락처 등을 받지 않습니다\./.test(sheet) && /검색어와 입력한 조건은 전송하지 않습니다\./.test(sheet) && /제작 연쓰/.test(sheet));
ok('의견 보내기 창 있음(창 목록·Esc 닫기 포함)', !!fsheet && /var SHEETS=\[[^\]]*'fsheet'[^\]]*\];/.test(html) && /else if\(!\$\('fsheet'\)\.hidden\)fbClose\(\);/.test(html));
ok('입력칸은 글 칸 하나뿐(연락처·이름 칸 없음)', cnt(fsheet, '<textarea') === 1 && cnt(fsheet, '<input') === 0 && /maxlength="500"/.test(fsheet));
ok('분류 3개(법령 오류·앱 오류·개선 제안), 처음 선택은 법령 오류', /data-fbcat="law" aria-pressed="true">법령 오류</.test(fsheet) && /data-fbcat="app" aria-pressed="false">앱 오류</.test(fsheet) && /data-fbcat="sug" aria-pressed="false">개선 제안</.test(fsheet) && cnt(fsheet, 'data-fbcat=') === 3);
ok('안내·예시·완료 문구', /법령 내용이나 앱 사용 중 발견한 오류를 알려 주세요\./.test(fsheet) && /placeholder="예\) 산업안전보건법 제29조 과태료 금액이 시행령 별표 35와 다릅니다\."/.test(fsheet) && />접수되었습니다</.test(fsheet) && />검토 후 반영하겠습니다\.</.test(fsheet));
ok('오류 안내 문구 3종', /'내용을 입력해 주세요\.'/.test(html) && /FB_FAIL='전송하지 못했습니다\. 잠시 후 다시 시도해 주세요\.'/.test(html) && /FB_RATE='짧은 시간에 여러 번 보냈습니다\. 잠시 후 다시 시도해 주세요\.'/.test(html));
ok("'주십시오' 문구 없음(의견 보내기 창)", !/주십시오/.test(fsheet));
const send = (/function fbSend\(\)\{[\s\S]*?\n  document\.addEventListener/.exec(html) || [''])[0];
const body = (/body:JSON\.stringify\(\{([^}]*)\}\)/.exec(send) || ['', ''])[1];
ok('보내는 항목은 uid·cat·text·tab·ver뿐(검색어·입력 조건 없음)', (body.match(/(?:^|,)\s*\w+(?=:)/g) || []).map(x => x.replace(/[,\s]/g, '')).join(',') === 'uid,cat,text,tab,ver' && !/st\.q|pf\.|profKey|\$\('q'\)/.test(send), body);
ok('미리 확인 없는 전송(text/plain — 워커에 OPTIONS 처리 없음)', /headers:\{'Content-Type':'text\/plain'\}/.test(send) && /STATS_URL\+'\/feedback'/.test(send));
ok('무작위 번호 만들기는 한 곳(statUid)', cnt(html, "localStorage.setItem('lawon.uid'") === 1 && /var u=statUid\(\);\s*\n\s*fetch\(STATS_URL\+'\/ping'/.test(html));
ok('관리자 화면 두 칸(이용 현황·의견)', /data-atab="st">이용 현황</.test(html) && /data-atab="fb">의견'/.test(html) && /id="admSt"/.test(html) && /id="admFb" hidden/.test(html));
ok('의견 글은 글자 그대로 표시(escRaw)', /<p class="fbx">'\+escRaw\(x\.body\)\+'<\/p>/.test(html));

// ── ② 예시 문구 ↔ 법령 데이터 ──
const D = JSON.parse(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g, '</'));
const a29 = D.arts.filter(e => e.l === 'OSH' && e.no === '제29조')[0], t35 = D.bt.tabs.filter(t => t.law === 'SD' && String(t.n) === '35')[0];
ok('예시: 산업안전보건법 제29조는 과태료 조문', !!a29 && (a29.s || []).length > 0 && a29.s.every(s => s.kind === '과태료') && (a29.fn || []).length > 0);
ok('예시: 시행령 별표 35 = 과태료의 부과기준', !!t35 && t35.t === '과태료의 부과기준' && D.meta.laws.SD.name === '산업안전보건법 시행령');

// ── ③ 워커 ──
(async () => {
  let DatabaseSync; try { ({ DatabaseSync } = require('node:sqlite')); } catch (e) { console.log('SKIP 워커 검사 — node:sqlite 없음(Node 22.13 이상에서 실행)'); return done(); }
  const src = fs.readFileSync(WORKER, 'utf8'), tmp = path.join(os.tmpdir(), 'lawon_fb_worker_' + process.pid + '.mjs'); fs.writeFileSync(tmp, src);
  let seq = 0; const load = async () => (await import(url.pathToFileURL(tmp).href + '?v=' + (++seq))).default;   // 새로 불러오면 서버가 새로 뜬 것과 같음(fbReady·FAIL 초기화)
  const mkDB = (opt = {}) => {   // D1 흉내: prepare().bind().all()/run(), batch()
    const db = new DatabaseSync(':memory:'); const log = [];
    db.exec('CREATE TABLE users(uid TEXT PRIMARY KEY, first_day TEXT, device TEXT) WITHOUT ROWID; CREATE TABLE visits(day TEXT, uid TEXT, device TEXT, PRIMARY KEY(day,uid)) WITHOUT ROWID;');
    const stmt = (sql, args) => ({ bind: (...a) => stmt(sql, a),
      all: async () => { log.push(sql); if (opt.failFb && /feedback/.test(sql)) throw new Error('D1 오류 흉내'); return { results: db.prepare(sql).all(...args), success: true }; },
      run: async function () { return this.all(); } });
    return { raw: db, log, prepare: sql => stmt(sql, []), batch: async L => { const R = []; for (const s of L) R.push(await s.all()); return R; } };
  };
  const OK = 'https://yeonskimm.github.io', U = i => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
  const post = (W, env, p, b, o = {}) => W.fetch(new Request('https://w.example' + p, { method: 'POST', headers: { Origin: o.origin === undefined ? OK : o.origin, 'CF-Connecting-IP': o.ip || '203.0.113.7', 'User-Agent': o.ua || 'Mozilla/5.0 (Linux; Android 14)', 'Content-Type': 'text/plain' }, body: typeof b === 'string' ? b : JSON.stringify(b) }), env);
  const rows = DB => DB.raw.prepare('SELECT * FROM feedback ORDER BY id').all();

  try {
    let W = await load(), DB = mkDB(), env = { DB, STATS_KEY: '1234' };
    ok('워커: 수정 전 표 없음 → 첫 접수 때 표를 만들고 저장', (await post(W, env, '/feedback', { uid: U(1), cat: 'law', text: '  제29조 과태료 금액이 다릅니다.\n둘째 줄  ', tab: '산업안전 · 적용 확인', ver: 'cf481c7' })).status === 200 && rows(DB).length === 1);
    let r = rows(DB)[0];
    ok('워커: 저장 내용(분류·글 앞뒤 공백 제거·줄바꿈 유지·기기·탭·반영 번호)', r.cat === 'law' && r.body === '제29조 과태료 금액이 다릅니다.\n둘째 줄' && r.dev === 'Android' && r.tab === '산업안전 · 적용 확인' && r.ver === 'cf481c7' && r.uid === U(1), r);
    ok('워커: IP는 저장하지 않고 16자리 해시만', /^[0-9a-f]{16}$/.test(r.iph) && !JSON.stringify(rows(DB)).includes('203.0.113'));
    ok('워커: 응답에 CORS 머리', (await post(W, env, '/feedback', { uid: U(1), cat: 'app', text: '둘' })).headers.get('Access-Control-Allow-Origin') === OK);
    ok('워커: 다른 출처는 403·저장 안 함', (await post(W, env, '/feedback', { uid: U(2), text: 'x' }, { origin: 'https://evil.example' })).status === 403 && rows(DB).length === 2);
    ok('워커: 번호 형식이 틀리면 400', (await post(W, env, '/feedback', { uid: 'abc', text: 'x' })).status === 400);
    ok('워커: 빈 글·공백뿐인 글은 400', (await post(W, env, '/feedback', { uid: U(2), text: '   \n ' })).status === 400 && (await post(W, env, '/feedback', { uid: U(2) })).status === 400);
    ok('워커: JSON이 아니거나 null이어도 400(오류로 죽지 않음)', (await post(W, env, '/feedback', 'null')).status === 400 && (await post(W, env, '/feedback', '{{')).status === 400 && (await post(W, env, '/feedback', '[1]')).status === 400);
    ok('워커: 지나치게 큰 본문 413', (await post(W, env, '/feedback', { uid: U(2), text: 'x'.repeat(5000) })).status === 413);
    await post(W, env, '/feedback', { uid: U(3), cat: '<b>', text: '가'.repeat(700), tab: 'T'.repeat(80), ver: 'a\u0000b\nc' }, { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' });
    r = rows(DB).pop();
    ok('워커: 글 500자·탭 30자로 자름, 모르는 분류는 etc, 제어문자 제거, 아이폰 = iOS', r.body.length === 500 && r.tab.length === 30 && r.cat === 'etc' && r.ver === 'a b c' && r.dev === 'iOS', { b: r.body.length, t: r.tab.length, c: r.cat, v: r.ver, d: r.dev });

    // 같은 기기 10분 3건
    DB = mkDB(); env = { DB, STATS_KEY: '1234' }; W = await load();
    const st = []; for (let i = 0; i < 4; i++) st.push((await post(W, env, '/feedback', { uid: U(9), text: 'n' + i })).status);
    ok('워커: 같은 기기 3건까지 접수, 4번째 429', st.join() === '200,200,200,429' && rows(DB).length === 3, st);
    ok('워커: 같은 IP의 다른 기기는 접수(사무실 공유 IP)', (await post(W, env, '/feedback', { uid: U(10), text: '동료' })).status === 200);
    DB.raw.prepare('UPDATE feedback SET ts = ts - ?1 WHERE uid = ?2').run(601e3, U(9));
    ok('워커: 10분 지나면 같은 기기 다시 접수', (await post(W, env, '/feedback', { uid: U(9), text: '다시' })).status === 200);

    // 같은 IP 1시간 30건
    DB = mkDB(); env = { DB, STATS_KEY: '1234' }; W = await load();
    const s2 = []; for (let i = 0; i < 31; i++) s2.push((await post(W, env, '/feedback', { uid: U(100 + i), text: 'ip' + i }, { ip: '198.51.100.9' })).status);
    ok('워커: 같은 IP 30건까지 접수, 31번째 429', s2.slice(0, 30).every(x => x === 200) && s2[30] === 429 && rows(DB).length === 30, s2.join());
    ok('워커: 다른 IP는 접수', (await post(W, env, '/feedback', { uid: U(200), text: '다른 곳' }, { ip: '198.51.100.10' })).status === 200);
    DB.raw.prepare('UPDATE feedback SET ts = ts - ?1').run(3601e3);
    ok('워커: 1시간 지나면 같은 IP 다시 접수', (await post(W, env, '/feedback', { uid: U(201), text: '한 시간 뒤' }, { ip: '198.51.100.9' })).status === 200);

    // 180일 삭제 · 관리자 목록
    DB = mkDB(); env = { DB, STATS_KEY: '1234' }; W = await load();
    await post(W, env, '/feedback', { uid: U(1), cat: 'sug', text: '오래된 의견' });
    DB.raw.prepare('UPDATE feedback SET ts = ts - ?1').run(181 * 86400e3);
    await post(W, env, '/feedback', { uid: U(2), cat: 'law', text: '첫째' }); await post(W, env, '/feedback', { uid: U(3), cat: 'app', text: '<script>alert(1)</script>' });
    ok('워커: 접수 후 180일 지난 줄은 다음 접수 때 삭제', rows(DB).length === 2 && !rows(DB).some(x => x.body === '오래된 의견'));
    await post(W, env, '/ping', { uid: U(1) });
    ok('워커: 관리자 비밀번호가 틀리면 403(목록 안 줌)', (await post(W, env, '/admin', { key: '0000' })).status === 403);
    let res = await post(W, env, '/admin', { key: '1234' }), d = await res.json();
    ok('워커: 관리자 응답 — 기존 통계 그대로 + fb', res.status === 200 && d.total === 1 && d.vt === 1 && Array.isArray(d.days) && d.days.length === 1 && Array.isArray(d.fb));
    ok('워커: 목록은 최신순, 번호·IP 해시는 내보내지 않음', d.fb.length === 2 && d.fb[0].body === '<script>alert(1)</script>' && d.fb[1].body === '첫째' && Object.keys(d.fb[0]).sort().join() === 'body,cat,dev,tab,ts,ver', d.fb);
    const ins = DB.raw.prepare('INSERT INTO feedback(ts,cat,body,dev,tab,ver,uid,iph) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)'); for (let i = 0; i < 230; i++) ins.run(Date.now() - 1000 - i, 'sug', 'm' + i, 'PC', '', '', U(500 + i), 'x');
    d = await (await post(W, env, '/admin', { key: '1234' })).json();
    ok('워커: 목록은 최근 200건까지', d.fb.length === 200 && d.fb[0].body === '<script>alert(1)</script>');

    // 표를 못 읽어도 이용 통계는 나옴 / 접수는 500
    DB = mkDB({ failFb: true }); env = { DB, STATS_KEY: '1234' }; W = await load(); await post(W, env, '/ping', { uid: U(1) });
    res = await post(W, env, '/admin', { key: '1234' }); d = await res.json();
    ok('워커: 의견 표 오류여도 이용 통계는 그대로(fb null)', res.status === 200 && d.total === 1 && d.fb === null);
    res = await post(W, env, '/feedback', { uid: U(1), text: 'x' });
    ok('워커: 저장 실패는 500(+CORS 머리 — 앱이 실패 안내를 띄움)', res.status === 500 && res.headers.get('Access-Control-Allow-Origin') === OK);

    // 표 확인은 서버가 뜰 때 한 번만 · 기존 경로
    DB = mkDB(); env = { DB, STATS_KEY: '1234' }; W = await load();
    await post(W, env, '/feedback', { uid: U(1), text: 'a' }); await post(W, env, '/feedback', { uid: U(2), text: 'b' }); await post(W, env, '/admin', { key: '1234' });
    ok('워커: 표 만들기 문장은 한 번만 실행', DB.log.filter(x => /^CREATE TABLE IF NOT EXISTS feedback/.test(x)).length === 1);
    ok('워커: /ping 그대로(하루 한 번·형식 검사)', (await post(W, env, '/ping', { uid: U(7) })).status === 200 && (await post(W, env, '/ping', { uid: 'x' })).status === 400 && DB.raw.prepare('SELECT count(*) n FROM users').all()[0].n === 1);
    ok('워커: 모르는 경로 404', (await W.fetch(new Request('https://w.example/feedback'), env)).status === 404);
  } catch (e) { ok('워커 검사 중 오류 없음', false, String(e && e.stack || e)); }
  finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  done();
})();
function done() { console.log(f ? '실패 ' + f + '건 / ' + n + '건' : '전체 통과 ' + n + '건'); process.exit(f ? 1 : 0); }
