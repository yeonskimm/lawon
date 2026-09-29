// 법ON 인용 법령(타법 조문 인용 목록) 회귀 테스트 — 사용: node tests/xref_test.js index.html  (2026-09-29)
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/<\\\//g,'</');
const core=h.slice(h.indexOf('/*CORE_START*/'),h.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,xrefs,XREF_SKIP,XREF_ALIAS})',{}); const D=C.prepare(JSON.parse(raw));
let fail=0; const ok=(n,c,i)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||i===undefined?'':'  → '+JSON.stringify(i).slice(0,300))); if(!c)fail++; };
const X=k=>C.xrefs(D,D.byKey[k]), S=r=>r.map(x=>x.n+' '+x.no+(x.k?' @'+x.k:''));
let all=0, arts=0, inapp=0, err=null;
try{ D.arts.forEach(e=>{ const r=C.xrefs(D,e); if(r.length)arts++; all+=r.length; inapp+=r.filter(x=>x.k).length; }); }catch(x){ err=String(x); }
ok('전체 조문에서 오류 없이 추출',!err,err); console.log(`  인용 법령이 있는 조문 ${arts}개, 인용 ${all}건(앱 조문 ${inapp}건)`);
ok('인용 조문 수 범위(전수조사 2026-09-29: 약 300개 조문)',arts>250&&arts<360,arts);
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
console.log(fail?`\n실패 ${fail}건`:'\n모두 통과'); process.exit(fail?1:0);
