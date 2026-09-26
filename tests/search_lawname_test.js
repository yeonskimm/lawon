// 법ON 법령 이름(시행령·시행규칙) 검색·별표 회귀 테스트 — 사용: node search_lawname_test.js 새판.html [이전판.html]
// 이전판을 주면: 법령 이름이 없는 검색은 조문·주요 의무·별표 결과가 이전판과 같은지 전수 비교
const fs=require('fs'),vm=require('vm');
function load(p){ const h=fs.readFileSync(p,'utf8'); const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/<\\\//g,'</');
  const core=h.slice(h.indexOf('/*CORE_START*/'),h.indexOf('/*CORE_END*/'));
  const C=vm.runInNewContext(core+'\n;({prepare,search,bsearch,splitQuery})',{}); return {C,D:C.prepare(JSON.parse(raw))}; }
const N=load(process.argv[2]||'index.html'), C=N.C, D=N.D, B=D.bt;
let fail=0; const ok=(n,c,i)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||i===undefined?'':'  → '+JSON.stringify(i).slice(0,300))); if(!c)fail++; };
const LAB=['GK','MW','RET','EQ','EQR','FT','DISP','LMC'], OSH=['OSH','RULE','SAPA','SAPAD'];
const S=(q,f)=>C.search(D,q,'',f==='osh'?OSH:LAB), bs=(q,f)=>C.bsearch(D,q,f||'labor');
const ids=r=>r.map(x=>x.tab?x.tab.id:x.r.id), arts=r=>r.arts.map(e=>e.l+':'+e.no), laws=r=>[...new Set(r.arts.map(e=>e.l))];
let r;
// 2026-09-25 기대값 갱신: 시행령·시행규칙 조문 수록(2026-09-24)·별표 26개 추가 이후 기준. 건수는 숫자로 박지 않고 수록 자료에서 계산(법령·별표를 더 넣어도 깨지지 않게)
const CNT=k=>D.arts.filter(e=>e.l===k).length, TABS=k=>B.tabs.filter(T=>T.law===k).map(T=>T.id), TYP=t=>Object.keys(B.laws).filter(k=>B.laws[k].typ===t);
const same=(a,b)=>[...a].sort().join()===[...b].sort().join();
// ── 1. 시행령·시행규칙 이름 검색 ──
for(const q of ['고평법 시행규칙','남녀고용평등법 시행규칙','고평법시행규칙']){ r=S(q); ok(q+' → 고평법 시행규칙 조문 전부 + 그 별표만',r.total===CNT('EQR')&&laws(r).join()==='EQR'&&same(ids(bs(q)),TABS('EQR')),[r.total,laws(r),ids(bs(q))]); }
r=S('고평법 시행규칙 성희롱'); ok('고평법 시행규칙 성희롱 → 시행규칙 조문만',r.total>0&&laws(r).join()==='EQR',arts(r));
r=S('고평법 성희롱'); ok('고평법 성희롱 → 법률 조문 먼저, 시행규칙 조문도 포함',arts(r)[0]==='EQ:제12조'&&laws(r).includes('EQR'),arts(r).slice(0,8));
r=S('고평법'); ok('고평법 → 법률·시행령·시행규칙 조문 전부(법률 제1조 먼저)',r.total===CNT('EQ')+CNT('EQD')+CNT('EQR')&&arts(r)[0]==='EQ:제1조'&&r.byLaw.EQR===CNT('EQR')&&r.byLaw.EQD===CNT('EQD'),[r.total,r.byLaw]);
for(const q of ['중처법 시행령','중대재해처벌법 시행령','중대법 시행령','중처법시행령']){ r=S(q,'osh'); ok(q+' → 중처법 시행령 조문 전부 + 그 별표만',r.total===CNT('SAPAD')&&laws(r).join()==='SAPAD'&&same(ids(bs(q,'osh')),TABS('SAPAD')),[r.total,laws(r),ids(bs(q,'osh'))]); }
ok('중처법 시행령 열사병 → 중처법 시행령 별표1 줄',ids(bs('중처법 시행령 열사병','osh')).some(x=>/^ZD1/.test(x)),ids(bs('중처법 시행령 열사병','osh')));
ok('중처법 열사병 → 중처법 시행령 별표1 줄(그대로)',ids(bs('중처법 열사병','osh')).some(x=>/^ZD1/.test(x)));
for(const [q,k] of [['근로기준법 시행령','GKD'],['근기법 시행령','GKD'],['근로기준법 시행규칙','GKR'],['근기법 시행규칙','GKR'],['산안법 시행령','SD'],['산업안전보건법 시행령','SD'],['산안법 시행규칙','SR'],['산업안전보건법 시행규칙','SR'],['기간제법 시행령','FTD'],['최저임금법 시행령','MWD']]){
  r=S(q); const b=ids(bs(q,'osh')); ok(q+' → '+k+' 조문 전부(다른 법령 없음) + 그 별표만',r.total===CNT(k)&&laws(r).join()===k&&same(b,TABS(k)),[r.total,laws(r),b]); }
r=S('산안법 시행령 안전관리자','osh'); ok('산안법 시행령 안전관리자 → 시행령 조문만 + 주요 의무에 안전관리자 포함',r.total>0&&laws(r).join()==='SD'&&r.items.some(x=>x.id==='o_safe'),[arts(r).slice(0,3),r.items.map(x=>x.id)]);
r=S('시행규칙 별표 5','osh'); ok('시행규칙 별표 5 → 시행규칙 조문만(안전보건규칙·취업제한규칙 없음)',r.total>0&&r.arts.every(e=>TYP('규').includes(e.l))&&!r.arts.some(e=>e.l==='RULE'||e.l==='LIC'),laws(r));
r=S('시행령','osh'); ok('시행령만 → 조문·별표 모두 시행령 것만',r.total>0&&r.arts.every(e=>TYP('영').includes(e.l))&&same(ids(bs('시행령','osh')),B.tabs.filter(T=>TYP('영').includes(T.law)).map(T=>T.id)),[laws(r),ids(bs('시행령','osh'))]);
r=S('근기법'); ok('근기법만 → 근로기준법·시행령·시행규칙 조문 전부 + 그 별표',r.total===CNT('GK')+CNT('GKD')+CNT('GKR')&&same(ids(bs('근기법')),TABS('GKD').concat(TABS('GKR'))),[r.total,ids(bs('근기법'))]);
r=S('산안법','osh'); ok('산안법만 → 법·시행령·시행규칙·안전보건규칙 조문 전부',r.total===CNT('OSH')+CNT('SD')+CNT('SR')+CNT('RULE'),r.total);
ok('별표만 입력 → 별표 결과 없음(그대로)',bs('별표').length===0,ids(bs('별표')));
r=S('산재보험법 시행령'); ok('앱에 없는 법령 이름(산재보험법 시행령) → 그 이름이 나오는 시행령 조문만',r.arts.every(e=>TYP('영').includes(e.l)&&/산업재해보상보험법|산재보험/.test(e.x+e.t)),arts(r).slice(0,5));
ok('검색어별 칩: 시행규칙 이름이 법령 조건으로 유지',C.splitQuery('고평법 시행규칙, 성희롱, 징계').lawToks.join()==='고평법시행규칙',C.splitQuery('고평법 시행규칙, 성희롱, 징계'));
// ── 2. 별표 검색 기대값 ──
r=ids(bs('굴착면 기울기','osh')); ok('굴착면 기울기 → 안전보건규칙 별표 11 먼저',/^R11/.test(r[0]),r.slice(0,5));
r=ids(bs('허용기준','osh')); ok('허용기준 → 산안법 시행규칙 별표 19(수치)가 2위 안 · 시행령 별표 26(대상 인자)도 함께',r.slice(0,2).includes('S19')&&r.includes('SD26'),r.slice(0,4));
r=ids(bs('별표 13의2','osh')); ok('별표 13의2(띄어 씀) → R13_2',r.join()==='R13_2',r);
r=ids(bs('별표1','labor')); ok('별표1 → 번호 1인 별표 전부(중복 없이)',same(r,B.tabs.filter(T=>T.n==='1').map(T=>T.id))&&new Set(r).size===r.length,r);
r=ids(bs('근로기준법 시행령 별표1','labor')); ok('근로기준법 시행령 별표1 → GD1만',r.join()==='GD1',r);
r=ids(bs('산안법 시행령 별표1','osh')); ok('산안법 시행령 별표1 → SD1만',r.join()==='SD1',r);
r=ids(bs('시행규칙 별표3','labor')); ok('시행규칙 별표3 → 시행규칙의 별표 3만(취업제한규칙 제외)',same(r,B.tabs.filter(T=>T.n==='3'&&TYP('규').includes(T.law)).map(T=>T.id))&&r.includes('GR3')&&!r.includes('LC3'),r);
r=ids(bs('규칙 별표 5','osh')); ok('규칙 별표 5 → 안전보건규칙 별표 5만',r.join()==='R5',r);
r=ids(bs('시행규칙 별표 5','osh')); ok('시행규칙 별표 5 → 산안법 시행규칙 별표 5만(취업제한규칙 별표5 제외)',r.join()==='S5',r);
r=ids(bs('취업제한규칙 별표 5','osh')); ok('취업제한규칙 별표 5 → LC5',r.join()==='LC5',r);
r=bs('회식','labor'); ok('회식 → 성희롱 예시 언어적 행위',r.length&&r[0].r&&r[0].r.id==='ER1.2',ids(r));
r=ids(bs('성희롱','labor')); ok('성희롱(근로기준) → 고평법 시행규칙 별표1 한 번만',r[0]==='ER1'&&r.filter(x=>/^E/.test(x)).length===1,r.slice(0,4));
r=ids(bs('변호사','labor')); ok('변호사 → 기간제법 시행령 별표 2 제6호',r.includes('FD2.6'),r);
// ── 3. 자료 무결성 ──
const dup=B.tabs.map(T=>T.law+':'+T.n).filter((k,i,a)=>a.indexOf(k)!==i); ok('같은 법령·번호의 별표 중복 없음',dup.length===0,dup);
ok('고평법 시행규칙 제2조 → 별표1(ER1) 연결, 별표1 근거 조문에 시행규칙 제2조',JSON.stringify(B.art['EQR:제2조'])==='[{"t":"ER1"}]'&&B.tabById.ER1.arts[0].join()==='EQR,제2조');
let bad=[]; B.tabs.forEach(T=>{ T.secs.forEach((Sx,si)=>Sx.rows.forEach(id=>{ const x=B.byId[id]; if(!x)bad.push('row '+id); else if(x.s!==si||x.tb!==T.id)bad.push('sec '+id); })); (T.arts||[]).forEach(a=>{ if(!D.byKey[a[0]+':'+a[1]])bad.push('art '+a); }); });
Object.keys(B.art).forEach(k=>B.art[k].forEach(v=>{ if(v.t&&!B.tabById[v.t])bad.push('art→'+v.t); if(v.r&&!B.byId[v.r])bad.push('art→'+v.r); if(!D.byKey[k])bad.push('artkey '+k); }));
Object.keys(B.item).forEach(k=>B.item[k].forEach(v=>{ if(v.t&&!B.tabById[v.t])bad.push('item→'+v.t); if(v.r&&!B.byId[v.r])bad.push('item→'+v.r); }));
B.rows.forEach(x=>{ (x.xr||[]).forEach(id=>{ const y=B.byId[id]; if(!y||!(y.xr||[]).includes(x.id))bad.push('xr '+x.id); }); (x.al||[]).forEach(a=>{ if(!D.byKey[a[0]+':'+a[1]])bad.push('al '+x.id); }); });
ok('별표 자료 연결 무결성(줄·묶음 번호·근거 조문·바로가기)',bad.length===0,bad.slice(0,20));
// ── 4. 이전판과 전수 비교: 법령 이름이 없는 검색은 그대로 ──
if(process.argv[3]){ const O=load(process.argv[3]); const qs=new Set(['지게차','크레인','굴착','비계','제어풍속','국소배기','체감온도','폭염','허용기준','톨루엔','5명 미만','해고','휴업수당','연차','임산부','유산','기간제','전문자격','변호사','과태료','배상','시정명령','적용 범위','안전보건교육','공시','관리감독자','밀폐공간','석면','벤젠','근로시간','임금명세서','취업규칙','직장 내 괴롭힘','도급','특수건강진단','별표 5','별표22','주휴, 휴일','지게차 헤드가드','휴게 30분']);
  D.arts.forEach(e=>(e.t||'').split(/\s+/).forEach(w=>{ if(w.length>=2)qs.add(w); })); B.rows.forEach((x,i)=>{ if(i%3===0&&x.t&&x.t.length<16)qs.add(x.t); });
  const lawy=q=>{ const sq=O.C.splitQuery(q), s2=C.splitQuery(q); return !!(sq.hint||s2.hint||s2.btl||s2.typ)||/시행령|시행규칙/.test(q); };
  let n=0, dS=[], dB=[], skip=0;
  for(const q of qs){ if(lawy(q)){ skip++; continue; }
    for(const [law,f,fl] of [['',LAB,'labor'],['',OSH,'osh'],['GK',LAB,'labor'],['OSH',OSH,'osh'],['EQ',LAB,'labor']]){ n++;
      const a=O.C.search(O.D,q,law,f), b=C.search(D,q,law,f), g=x=>JSON.stringify([x.items.map(y=>y.id),x.arts.map(e=>e.l+e.no),x.total,x.byLaw]);
      if(g(a)!==g(b))dS.push(q+' ['+law+']'); }
    for(const fl of ['labor','osh']){ const a=O.C.bsearch(O.D,q,fl).filter(x=>!(x.tab?x.tab.id:x.r.tb).startsWith('EQR1')).map(x=>(x.tab?x.tab.id+':'+x.s:x.r.id)+'/'+(x.also||[]).map(y=>y.id).join('+'));
      const b=C.bsearch(D,q,fl).map(x=>(x.tab?x.tab.id+':'+x.s:x.r.id)+'/'+(x.also||[]).map(y=>y.id).join('+')); if(JSON.stringify(a)!==JSON.stringify(b))dB.push(q+' ['+fl+']'); } }
  ok('법령 이름 없는 검색 '+n.toLocaleString()+'회: 조문·주요 의무 결과 이전판과 같음',dS.length===0,dS.slice(0,20));
  ok('법령 이름 없는 별표 검색 '+(qs.size-skip)*2+'회: 이전판과 같음(중복 별표 EQR1만 빠짐)',dB.length===0,dB.slice(0,20));
  console.log('   (법령 이름이 든 검색어 '+skip+'개는 비교에서 제외 — 위 1~2에서 따로 확인)'); }
console.log(fail?'실패 '+fail+'건':'전체 통과'); process.exit(fail?1:0);
