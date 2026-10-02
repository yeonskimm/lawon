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
// 9) 2026-10-02 여러 단계 개정(chg.nx): 시행일 전날·당일마다 그날 시행 본문만
const X=(d,k)=>g(mk(d),k).x;
const s116=d=>{ const e=g(mk(d),'GK:제116조'); return e; };
{ const e=s116('2026-10-07'); ok('116조 10. 7.: 개정 전 본문, 남은 단계 3', !/다음 각 호/.test(e.x.split('\n')[0]) && e.chg && e.chg.date==='2026-10-08' && (e.chg.nx||[]).length===2 && !e.old); }
{ const e=s116('2026-10-08'); ok('116조 10. 8.: 제1항 각 호, 제2항은 근로감독관·제4호 유지', /^① 다음 각 호/.test(e.x) && /근로감독관의 요구/.test(e.x) && /4\. 제102조에 따른/.test(e.x) && !/노동감독관/.test(e.x) && !/제44조의4제1항/.test(e.x));
  ok('116조 10. 8.: 개정 전 본문 보관, 다음 단계 12. 8.', e.old && e.old.d==='2026-10-08' && /괴롭힘을 한 경우에는 1천만원/.test(e.old.x) && e.chg && e.chg.date==='2026-12-08' && (e.chg.nx||[]).length===1);
  ok('116조 10. 8.: 제1항제2호 시행일 안내', /\[시행일\] 제116조제1항제2호/.test(e.x)); }
ok('116조 12. 7.: 10. 8. 본문 그대로', X('2026-12-07','GK:제116조')===X('2026-10-08','GK:제116조'));
{ const e=s116('2026-12-08'); ok('116조 12. 8.: 노동감독관·제4호 삭제, 제44조의4는 아직', /노동감독관의 요구/.test(e.x) && /4\. 삭제 <2026\.4\.7>/.test(e.x) && !/제44조의4제1항/.test(e.x) && /\[시행일\]/.test(e.x));
  ok('116조 12. 8.: 개정 전(10. 8. 본문)·그 전(처음 본문) 이어 둠', e.old && e.old.d==='2026-12-08' && /근로감독관의 요구/.test(e.old.x) && e.old.prev && e.old.prev.d==='2026-10-08' && e.chg && e.chg.date==='2027-01-01' && !e.chg.nx); }
ok('116조 12. 31.: 12. 8. 본문 그대로', X('2026-12-31','GK:제116조')===X('2026-12-08','GK:제116조'));
{ const e=s116('2027-01-01'); ok('116조 2027. 1. 1.: 제2항제2호에 제44조의4, 남은 개정 없음', /제44조의4제1항ㆍ제4항ㆍ제5항/.test(e.x) && !/\[시행일\]/.test(e.x) && !e.chg);
  ok('116조 2027. 1. 1.: 개정 전 3단계 모두 보관', e.old && e.old.prev && e.old.prev.prev && e.old.d==='2027-01-01' && e.old.prev.d==='2026-12-08' && e.old.prev.prev.d==='2026-10-08' && !e.old.prev.prev.prev); }
ok('110조 12. 7.: 제104조제2항', /제104조제2항을/.test(X('2026-12-07','GK:제110조')));
ok('110조 12. 8.: 제104조, 제60조는 제5항까지', /제104조을/.test(X('2026-12-08','GK:제110조')) && /제4항 및 제5항/.test(X('2026-12-08','GK:제110조')));
ok('110조 2027. 6. 9.: 12. 8. 본문 그대로', X('2027-06-09','GK:제110조')===X('2026-12-08','GK:제110조'));
ok('110조 2027. 6. 10.: 제60조 제6항까지', /제4항부터 제6항까지/.test(X('2027-06-10','GK:제110조')) && !g(mk('2027-06-10'),'GK:제110조').chg);
ok('114조 12. 8.: 제103조 빠짐, 제60조제9항 아직', !/제103조를/.test(X('2026-12-08','GK:제114조')) && !/제60조제9항/.test(X('2026-12-08','GK:제114조')));
ok('114조 2027. 6. 10.: 제60조제9항', /제60조제9항/.test(X('2027-06-10','GK:제114조')));
ok('산안법 175조 12. 7.: 근로감독관', /근로감독관의 검사/.test(X('2026-12-07','OSH:제175조')));
ok('산안법 175조 12. 8.: 노동감독관, 제31조의2 아직', /노동감독관의 검사/.test(X('2026-12-08','OSH:제175조')) && !/제31조의2제1항/.test(X('2026-12-08','OSH:제175조')));
ok('산안법 175조 2027. 1. 7.: 12. 8. 본문 그대로', X('2027-01-07','OSH:제175조')===X('2026-12-08','OSH:제175조'));
ok('산안법 175조 2027. 1. 8.: 제31조의2제1항·제33조제5항', /제31조의2제1항/.test(X('2027-01-08','OSH:제175조')) && /제33조제5항/.test(X('2027-01-08','OSH:제175조')));
{ const r8=C.search(mk('2026-12-08'),'근기법 116조','',['GK']); ok('12. 8.: 검색 결과 제116조도 그날 본문', r8.arts[0]&&r8.arts[0].no==='제116조'&&/노동감독관의 요구/.test(r8.arts[0].x)); }
// 데이터 형식: 단계는 날짜 순, 각 단계는 날짜와 본문(삭제는 본문 없음)
{ const raw0=JSON.parse(raw), bad=[];
  raw0.arts.forEach(e=>{ const c=e.chg; if(!c||!c.nx)return; let p=c.date; c.nx.forEach(x=>{ if(!x.date||x.date<=p||(!x.x&&x.kind!=='삭제'))bad.push(e.l+e.no); p=x.date; });
    if(!(raw0.meta.pending||[]).includes(c.date)||c.nx.some(x=>!(raw0.meta.pending||[]).includes(x.date)))bad.push(e.l+e.no+'(meta.pending)'); });
  ok('여러 단계 데이터 형식(날짜 순·본문·meta.pending)', !bad.length, bad.join(', ')); }
// 같은 데이터를 두 번 적용해도 그대로(원본 객체를 바꾸지 않음)
{ const o=JSON.parse(raw), a=C.applyDue(o,'2026-12-08'); const b=C.applyDue(a,'2026-12-08'); ok('applyDue 두 번 적용해도 같음', b.arts.find(e=>e.l==='GK'&&e.no==='제116조').old.d==='2026-12-08'); }
// 8) 같은 이름 함수 중복 금지 — 2026-09-26 임금 도구의 won()이 과태료 금액 표시 함수를 덮어써 '만원'이 빠졌던 오류 재발 방지
const js=html.slice(html.indexOf('/*CORE_START*/')); const body=js.slice(0,js.indexOf('</script>')); const cnt={};
(body.match(/function ([A-Za-z_$][\w$]*)\s*\(/g)||[]).forEach(m=>{const k=m.replace(/^function\s+|\s*\($/g,'');cnt[k]=(cnt[k]||0)+1;});
const dup=Object.keys(cnt).filter(k=>cnt[k]>1); ok('함수 이름 중복 없음', !dup.length, dup.join(', '));
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
