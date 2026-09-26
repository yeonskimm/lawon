// 법ON 개정 시행 자동 전환 테스트(2026-09-26) — 사용: node tests/due_test.js index.html
// 시행일이 지나면 개정 후 조문·제재가 본문으로 올라가고 개정 전 내용은 e.old에 남는지, 시행일 전에는 그대로인지, 과태료 금액이 새 조항 번호에서도 나오는지
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue})',{});
const mk=d=>C.prepare(C.applyDue(JSON.parse(raw),d));
let fail=0; const ok=(n,c,x)=>{ if(!c)fail++; console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:'')); };
const nb=b=>(b||'').replace(/\s+/g,'');
const b7=mk('2026-10-07'), a8=mk('2026-10-08'), p0=C.prepare(JSON.parse(raw));
const g=(D,k)=>D.byKey[k];
// 1) 시행일 전날: 그대로
ok('10. 7.: 근기법 제36조 벌칙 제109조제1항 유지', g(b7,'GK:제36조').s[0].basis==='제109조제1항' && !g(b7,'GK:제36조').old);
ok('10. 7.: 날짜 없이 prepare만 한 것과 같음', JSON.stringify(g(b7,'GK:제109조').x)===JSON.stringify(g(p0,'GK:제109조').x));
// 2) 시행일: 체불 벌칙 이동
const e36=g(a8,'GK:제36조');
ok('10. 8.: 근기법 제36조 벌칙 → 제107조제1항(5년/5천)', e36.s[0].basis==='제107조제1항' && /5년/.test(e36.s[0].amt));
ok('10. 8.: 개정 전 제재(제109조제1항) 보관', e36.old && e36.old.s[0].basis==='제109조제1항' && e36.old.d==='2026-10-08');
const e109=g(a8,'GK:제109조');
ok('10. 8.: 제109조 본문이 개정 후(제2항 삭제)', /② 삭제/.test(e109.x) && e109.old && /제36조/.test(e109.old.x));
ok('10. 8.: 제107조 본문에 제36조 포함', /제36조/.test(g(a8,'GK:제107조').x));
// 3) 과태료 조항 번호 변경 → 금액 이어짐
const e76=g(a8,'GK:제76조의2'), z=e76.s[0];
ok('10. 8.: 괴롭힘 과태료 제116조제1항제1호', z.basis==='제116조제1항제1호');
ok('10. 8.: 새 조항 번호에도 부과금액', (e76.fn||[]).some(f=>nb(f.b)===nb(z.basis)&&f.rows.length));
// 4) 다른 날짜 개정은 아직
ok('10. 8.: 12. 8. 개정(근기법 제13조)은 아직 개정 예정', !!g(a8,'GK:제13조').chg && !g(a8,'GK:제13조').old);
// 5) 검색 색인이 개정 후 본문 기준
const r=C.search(a8,'근기법 107조','',['GK']); ok('10. 8.: 검색 결과 제107조 본문 개정 후', r.arts[0]&&r.arts[0].no==='제107조'&&/제44조의2/.test(r.arts[0].x));
// 6) 12. 8.: 삭제 조문·시행 전 새 조문
const d8=mk('2026-12-08'), e102=g(d8,'GK:제102조');
ok('12. 8.: 근기법 제102조 삭제 — 제재 비움, 삭제 전 제재 보관', e102.old&&e102.old.del&&e102.s.length===0);
ok('12. 8.: 노동감독관 직무집행법 조문 시행 전 표시 해제', D8fut(d8)===0, '남은 시행 전 '+D8fut(d8));
function D8fut(D){ return D.arts.filter(e=>e.l==='LIO'&&e.fut).length; }
ok('12. 7.: 직무집행법 조문은 아직 시행 전', mk('2026-12-07').arts.filter(e=>e.l==='LIO'&&e.fut).length>40);
ok('2027. 1. 1. 전: 근기법 제44조의4 시행 전 유지', !!g(d8,'GK:제44조의4').fut);
// 7) 위험성평가 과태료(별표35 머의2~머의6)
const r36=g(p0,'OSH:제36조').fn||[]; const amt=b=>r36.filter(f=>nb(f.b)===b).map(f=>f.rows.map(x=>x.a.join('/')).join(',')).join(' | ');
ok('산안법 제36조 미실시 500/700/1000', amt('제175조제4항제2호의2')==='500/700/1000');
ok('산안법 제36조 참여·주지 150/300/500 등', amt('제175조제5항제1호')==='150/300/500 | 150/300/500 | 150/300/500,100/200/300');
ok('산안법 제36조 기록·보존 50/150/300', amt('제175조제6항제2호의2')==='50/150/300');
const f32=g(p0,'OSH:제32조').fn; ok('산안법 제32조 제6항제1호 300 분리', f32.some(f=>f.b==='제175조제6항제1호'&&f.rows[0].a.join()==='300,300,300') && f32[0].rows.every(x=>x.d));
// 8) 같은 이름 함수 중복 금지 — 2026-09-26 임금 도구의 won()이 과태료 금액 표시 함수를 덮어써 '만원'이 빠졌던 오류 재발 방지
const js=html.slice(html.indexOf('/*CORE_START*/')); const body=js.slice(0,js.indexOf('</script>')); const cnt={};
(body.match(/function ([A-Za-z_$][\w$]*)\s*\(/g)||[]).forEach(m=>{const k=m.replace(/^function\s+|\s*\($/g,'');cnt[k]=(cnt[k]||0)+1;});
const dup=Object.keys(cnt).filter(k=>cnt[k]>1); ok('함수 이름 중복 없음', !dup.length, dup.join(', '));
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
