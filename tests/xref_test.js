// 법ON 인용 조문(타법 조문 인용 목록) 회귀 테스트 — 사용: node tests/xref_test.js index.html  (2026-09-29)
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/<\\\//g,'</');
const core=h.slice(h.indexOf('/*CORE_START*/'),h.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,xrefs,XREF_SKIP,XREF_ALIAS})',{}); const D=C.prepare(JSON.parse(raw));
let fail=0; const ok=(n,c,i)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||i===undefined?'':'  → '+JSON.stringify(i).slice(0,300))); if(!c)fail++; };
const X=k=>D.byKey[k]?C.xrefs(D,D.byKey[k]):[], S=r=>r.map(x=>x.n+' '+x.no+(x.k?' @'+x.k:''));
let all=0, arts=0, inapp=0, err=null;
try{ D.arts.forEach(e=>{ const r=C.xrefs(D,e); if(r.length)arts++; all+=r.length; inapp+=r.filter(x=>x.k).length; }); }catch(x){ err=String(x); }
ok('전체 조문에서 오류 없이 추출',!err,err); console.log(`  인용 조문이 있는 조문 ${arts}개, 인용 ${all}건(앱 조문 ${inapp}건)`);
const SASU=['JPA','SPC','SPCR','ICR'], artsS=D.arts.filter(e=>SASU.includes(e.l)&&C.xrefs(D,e).length).length;   // 2026-10-21 수사 법령 4개(5-52)는 따로 셈
ok('인용 조문 수 범위(전수조사 2026-09-29: 약 300개 조문, 2026-10-18 고시 10종 수록 후 369개, 2026-10-22 질서위반행위규제법·임금채권보장법 수록 후 433개)',arts-artsS>250&&arts-artsS<480,arts-artsS);
ok('수사 법령 인용 조문 수 범위(2026-10-21 수록 때 127개 — 형사소송법 \'법 제N조\' 인용 포함)',artsS>100&&artsS<160,artsS);
let r=X('SD:제86조'); ok('산안법 시행령 제86조 → 16건, 첫째 건강기능식품법 제3조',r.length===16&&r[0].n==='건강기능식품에 관한 법률'&&r[0].no==='제3조',S(r));
r=X('FT:제4조'); ok('기간제법 제4조 옛 이름 「고령자고용촉진법」 → 현행 법령 제2조',S(r).includes('고용상 연령차별금지 및 고령자고용촉진에 관한 법률 제2조'),S(r));
r=X('SAPAD:제3조'); ok('중처법 시행령 제3조 「관광진흥법 시행령」 뒤 같은 법 제33조 → 관광진흥법 제33조',S(r).includes('관광진흥법 제33조')&&!S(r).includes('관광진흥법 시행령 제33조'),S(r));
r=X('SD:제117조'); ok('산안법 시행령 제117조 같은 법 시행령 → 같은 영 → 개인정보 보호법 시행령 제19조',S(r).includes('개인정보 보호법 시행령 제19조')&&S(r).includes('개인정보 보호법 시행령 제18조'),S(r));
r=X('GKD:제30조'); ok('근기법 시행령 제30조 같은 영 → 관공서의 공휴일에 관한 규정 제3조',S(r).includes('관공서의 공휴일에 관한 규정 제3조'),S(r));
const bad=[]; D.arts.forEach(e=>C.xrefs(D,e).forEach(x=>{ if(C.XREF_SKIP.includes(x.n)||C.XREF_ALIAS[x.n])bad.push(e.l+':'+e.no+' '+x.n); }));
ok('연결 제외 목록·옛 이름이 그대로 연결되지 않음',!bad.length,bad);
const self=[]; D.arts.forEach(e=>C.xrefs(D,e).forEach(x=>{ if(x.k&&(x.k===e.l+':'+e.no||(e.pa&&x.k===e.pa.l+':'+e.pa.no)))self.push(e.l+':'+e.no); }));
ok('자기 조문·근거 법 조문(이미 위에 보임)은 목록에서 제외',!self.length,self);
const miss=[]; D.arts.forEach(e=>C.xrefs(D,e).forEach(x=>{ if(x.k&&!D.byKey[x.k])miss.push(x.k); })); ok('앱 조문 연결은 모두 실제 조문',!miss.length,miss);
const dup=[]; D.arts.forEach(e=>{ const r=C.xrefs(D,e), s=new Set(r.map(x=>x.n+x.no)); if(s.size!==r.length)dup.push(e.l+':'+e.no); }); ok('같은 조문 중복 없음',!dup.length,dup);
r=X('GKD:제1조'); ok('목적 조문(「근로기준법」에서 위임된 사항)은 목록 없음',r.length===0,S(r));
// 2026-10-21(5-52): 수사 법령 — 본문에서 정한 약칭('법'=형사소송법, '수사준칙', '사법경찰직무법', '특별사법경찰관 협력규정') 인용, 집무규정의 옛 수사준칙 규칙 인용 → 같은 내용의 새 조문
const O=r=>r.map(x=>x.n+' '+x.no+(x.k?' @'+x.k:'')+(x.old?' ('+x.old+')':'')+(x.gone?' [없음]':''));
r=X('SPCR:제26조'); ok("협력규칙 제26조 '법 제244조의3' → 형사소송법 제244조의3(국가법령정보센터)",S(r).includes('형사소송법 제244조의3'),S(r));
r=X('SPCR:제6조'); ok("협력규칙 제6조 '특별사법경찰관 협력규정 제13조제1항' → 앱 협력규정 제13조",S(r).includes('검사와 특별사법경찰관의 상호협력에 관한 규정 제13조 @SPC:제13조'),S(r));
r=X('SPC:제4조'); ok("협력규정 제4조 「형사소송법」(이하 \"법\"이라 한다) 제197조의2 · '수사준칙 제11조' → 앱 수사준칙 제11조",S(r).includes('형사소송법 제197조의2')&&S(r).includes('검사와 사법경찰관의 상호협력과 일반적 수사준칙에 관한 규정 제11조 @ICR:제11조'),S(r));
r=X('SPC:제15조'); ok("협력규정 제15조 '사법경찰직무법 제3조' → 앱 사법경찰직무법 제3조, 근로기준법 제102조",S(r).includes('사법경찰관리의 직무를 수행할 자와 그 직무범위에 관한 법률 제3조 @JPA:제3조')&&S(r).includes('근로기준법 제102조 @GK:제102조'),S(r));
r=X('GAM:제36조'); ok('집무규정 제36조 옛 수사준칙 제14조(사건의 단위) → 협력규정 제9조',O(r).includes('검사와 특별사법경찰관의 상호협력에 관한 규정 제9조 @SPC:제9조 (옛 특별사법경찰관리 수사준칙 제14조)'),O(r));
r=X('GAM:제37조의2'); ok('집무규정 제37조의2 옛 수사준칙 제41조(신뢰관계인의 동석) → 협력규칙 제22조',O(r).includes('검사와 특별사법경찰관의 상호협력에 관한 규칙 제22조 @SPCR:제22조 (옛 특별사법경찰관리 수사준칙 제41조)'),O(r));
r=X('GAM:제46조'); ok('집무규정 제46조 옛 제10조(변호인 참여) → 협력규칙 제3조, 옛 제44조(피의자 조사사항) → 같은 내용 없음',O(r).includes('검사와 특별사법경찰관의 상호협력에 관한 규칙 제3조 @SPCR:제3조 (옛 특별사법경찰관리 수사준칙 제10조)')&&O(r).includes('특별사법경찰관리에 대한 검사의 수사지휘 및 특별사법경찰관리의 수사준칙에 관한 규칙 제44조 [없음]'),O(r));
r=X('GAM:제47조'); ok('집무규정 제47조 옛 제25조(수사개시 보고) → 협력규정 제15조(수사개시 통보)',O(r).includes('검사와 특별사법경찰관의 상호협력에 관한 규정 제15조 @SPC:제15조 (옛 특별사법경찰관리 수사준칙 제25조)'),O(r));
const oldLeft=[]; D.arts.forEach(e=>C.xrefs(D,e).forEach(x=>{ if(/수사지휘 및 특별사법경찰관리의 수사준칙에 관한 규칙/.test(x.n)&&!x.gone)oldLeft.push(e.l+':'+e.no+' '+x.no); })); ok('옛 수사준칙 규칙으로 바로 연결되는 인용 없음(새 조문 또는 같은 내용 없음 안내)',!oldLeft.length,oldLeft);
r=X('LIO:제2조'); ok('직무집행법 제2조 「사법경찰관리의 직무를…법률」 제6조의2 → 앱 사법경찰직무법 제6조의2',S(r).includes('사법경찰관리의 직무를 수행할 자와 그 직무범위에 관한 법률 제6조의2 @JPA:제6조의2'),S(r));
console.log(fail?`\n실패 ${fail}건`:'\n모두 통과'); process.exit(fail?1:0);
