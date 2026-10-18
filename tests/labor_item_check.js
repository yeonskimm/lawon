// 법ON 항목별 기준(근로기준, 2026-10-18) 데이터 검사 — 사용: node tests/labor_item_check.js index.html
// 기대값: 항목 14개·조문 수는 2026-10-18 사용자와 정한 1차 구성(근로기준 '자주 찾는 말' 12개를 모두 받는 14개)
// 5명 미만 적용 여부 기대값은 근로기준법 시행령 별표1 원문(2018. 6. 29. 개정, 한국법MCP 현행 확인 2026-10-18) — 앱 판정 함수(judgeArt) 결과와 대조
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,prepareBT,judgeArt,workIdx:typeof workIdx==="function"?workIdx:null,workOf:typeof workOf==="function"?workOf:null,workGroups:typeof workGroups==="function"?workGroups:null,workLines})',{console});
let fail=0,cnt=0;
const chk=(name,c,info)=>{cnt++; if(!c)fail++; if(!c||process.env.VERBOSE)console.log((c?'PASS':'FAIL')+'  '+name+(c?'':'  → '+(info===undefined?'':JSON.stringify(info))));};
const D=C.prepare(JSON.parse(raw)); C.prepareBT(D);
const TB={}; D.bt.tabs.forEach(t=>TB[t.id]=t);
const L=(D.work||[]).filter(w=>w.f==='labor');

// 1. 항목 목록·순서·조문 수
const EXP={lb_contract:['근로계약',12],lb_rules:['취업규칙',8],lb_docs:['서류 보존',9],lb_mw:['최저임금',10],lb_wage:['임금 지급',21],lb_ret:['퇴직급여',9],
  lb_hours:['근로시간',19],lb_rest:['휴게·주휴',4],lb_leave:['연차',5],lb_dismiss:['해고',13],lb_ft:['기간제·단시간',10],lb_harass:['괴롭힘·성희롱',8],lb_mat:['모성·육아',18],lb_minor:['연소자·임산부',15]};
chk('근로기준 항목 14개',L.length===14,L.length);
chk('항목 순서(검색어 우선순위 — 최저임금이 임금 지급 앞)',L.map(w=>w.id).join()===Object.keys(EXP).join(),L.map(w=>w.id));
chk('산업안전 작업 뒤에 붙음(산업안전 34개 그대로)',(D.work||[]).slice(0,34).every(w=>!w.f)&&(D.work||[]).slice(34).every(w=>w.f==='labor'));
L.forEach(w=>{ const e=EXP[w.id], n=w.sec.reduce((a,s)=>a+(s.a||[]).length,0); chk(w.n+' 이름·조문 수',!!e&&e[0]===w.n&&e[1]===n,[w.n,n]); });

// 2. 조문·별표 실재, 같은 항목 안 중복 없음
L.forEach(w=>{ const seen={};
  w.sec.forEach(s=>{ chk(w.n+' · '+s.h+' 조문 있음',!!(s.a&&s.a.length));
    (s.a||[]).forEach(it=>{ const e=D.byKey[it.k];
      chk(w.n+' '+it.k+' 앱 조문 있음·본문 있음',!!e&&!!String(e.x||'').trim());
      chk(w.n+' '+it.k+' 중복 없음',!seen[it.k]); seen[it.k]=1;
      if(it.t)chk(w.n+' '+it.k+' 별표 '+it.t,!!TB[it.t]);
      if(it.ln)it.ln.forEach(p=>chk(w.n+' '+it.k+' 발췌 줄 "'+p+'" 1줄',C.workLines(e.x,[p]).length>=1&&String(e.x).split('\n').map(x=>x.trim()).filter(x=>x.indexOf(p)===0).length===1)); }); }); });

// 3. 5명 미만 적용 여부 — 근로기준법 시행령 별표1 원문 기준
const n4={n:4};
const J=(k)=>C.judgeArt(D.byKey[k],n4);
const AP=['GK:제17조','GK:제15조','GK:제20조','GK:제22조','GK:제26조','GK:제36조','GK:제41조','GK:제42조','GK:제43조','GK:제45조','GK:제48조','GK:제54조','GK:제63조','GK:제64조','GK:제67조','GK:제71조','GK:제72조','GK:제74조','GK:제18조'];
const NA=['GK:제27조','GK:제28조','GK:제24조','GK:제46조','GK:제50조','GK:제53조','GK:제56조','GK:제60조','GK:제61조','GK:제73조','GK:제75조','GK:제74조의2','GK:제76조의2','GK:제76조의3','GK:제94조','GK:제95조','GK:제14조'];
AP.forEach(k=>{ const j=J(k); chk(k+' 5명 미만 적용',j.st==='apply'&&!j.part,j); });
NA.forEach(k=>{ const j=J(k); chk(k+' 5명 미만 적용 제외',j.st==='na'&&!!j.ex,j); });
[['GK:제55조','제1항만'],['GK:제23조','제2항만'],['GK:제19조','제1항만'],['GK:제70조','제2항·제3항만']].forEach(([k,p])=>{ const j=J(k); chk(k+' 5명 미만 '+p,j.st==='apply'&&j.part===p,j); });
chk('GK:제65조 5명 미만 일부(제1항·제3항, 임산부·18세 미만)',J('GK:제65조').st==='apply'&&/제1항·제3항/.test(J('GK:제65조').part),J('GK:제65조'));
chk('GK:제93조 5명 미만 적용 제외(별표1에 없음), 10명부터 적용',J('GK:제93조').st==='na'&&J('GK:제93조').ex&&C.judgeArt(D.byKey['GK:제93조'],{n:9}).st==='na'&&C.judgeArt(D.byKey['GK:제93조'],{n:10}).st==='apply',J('GK:제93조'));
chk('시행령 제30조(휴일)는 법 제55조 판정을 따름(제1항만)',J('GKD:제30조').st==='apply'&&J('GKD:제30조').part==='제1항만',J('GKD:제30조'));
chk('시행규칙 제4조(해고예고 예외)는 법 제26조 판정을 따름(적용)',J('GKR:제4조').st==='apply',J('GKR:제4조'));
chk('시행령 제33조(휴가수당)는 법 제60조 판정을 따름(적용 제외)',J('GKD:제33조').st==='na'&&J('GKD:제33조').ex,J('GKD:제33조'));

// 4. 검색어 → 항목(근로기준 분야), 분야 구분
const Q=[['주휴','lb_rest'],['주휴수당','lb_rest'],['주휴 수당','lb_rest'],['휴게시간','lb_rest'],['임금체불','lb_wage'],['퇴직금','lb_ret'],['퇴직금 체불','lb_ret'],['최저임금','lb_mw'],['최저 임금','lb_mw'],
  ['해고예고','lb_dismiss'],['해고 예고 수당','lb_dismiss'],['연차','lb_leave'],['연차수당','lb_leave'],['근로계약서','lb_contract'],['취업규칙','lb_rules'],['괴롭힘','lb_harass'],['성희롱','lb_harass'],
  ['출산휴가','lb_mat'],['육아휴직','lb_mat'],['기간제','lb_ft'],['알바','lb_ft'],['연장근로','lb_hours'],['52시간','lb_hours'],['근로자명부','lb_docs'],['취직인허증','lb_minor'],['징계','lb_dismiss']];
Q.forEach(([q,id])=>{ const r=C.workOf(D,q,'labor'); chk('근로기준 검색어 "'+q+'" → '+id,!!r&&r.id===id,r&&r.id); });
// 2026-10-17까지 근로기준 '자주 찾는 말' 12개가 모두 항목으로 이어짐(칩을 지워도 빠지는 것 없음)
['주휴','임금체불','퇴직금','최저임금','해고예고','연차','근로계약서','취업규칙','괴롭힘','성희롱','출산휴가','기간제'].forEach(q=>chk('옛 자주 찾는 말 "'+q+'" → 항목 있음',!!C.workOf(D,q,'labor')));
chk('근로기준 분야에서 "지게차" → 카드 없음',C.workOf(D,'지게차','labor')===null);
chk('산업안전 분야에서 "연차" → 카드 없음',C.workOf(D,'연차','osh')===null);
chk('산업안전 분야 "지게차" → 지게차 그대로',(C.workOf(D,'지게차','osh')||{}).id==='forklift');
['안전교육','MSDS',''].forEach(q=>chk('근로기준 검색어 "'+q+'" → 항목 없음',C.workOf(D,q,'labor')===null));
const allK={}; let dup=[]; (D.work||[]).forEach(w=>w.kw.forEach(k=>{ const n=k.replace(/\s/g,'').toLowerCase(); if(allK[n])dup.push(k); allK[n]=1; })); chk('검색어 겹침 없음(두 분야 전체)',!dup.length,dup);

// 5. 칩 묶음
if(C.workGroups){ const G=C.workGroups(D,'labor'), all=G.flatMap(g=>g.list.map(w=>w.id));
  chk('근로기준 칩 묶음 5개(계약·규칙/임금/시간·휴가/해고·고용/여성·연소자)',G.map(g=>g.h).join()==='계약·규칙,임금,시간·휴가,해고·고용,여성·연소자',G.map(g=>g.h));
  chk('근로기준 항목이 묶음에 한 번씩(기타 없음)',all.length===14&&new Set(all).size===14&&!G.some(g=>g.h==='기타'),all);
  chk('산업안전 칩 묶음에 근로기준 항목 없음',!C.workGroups(D,'osh').some(g=>g.list.some(w=>w.f==='labor')));
} else chk('workGroups 있음',false);

// 6. 역연결(조문 화면 '항목 기준')
const I=C.workIdx(D), ws=k=>(I[k]||[]).map(x=>x.w).sort().join();
chk('근로기준법 제18조 → 근로계약·휴게·주휴·연차·기간제(4개)',ws('GK:제18조')===['lb_contract','lb_rest','lb_leave','lb_ft'].sort().join(),ws('GK:제18조'));
chk('근로기준법 시행령 제9조 → 근로계약·기간제',ws('GKD:제9조')===['lb_contract','lb_ft'].sort().join(),ws('GKD:제9조'));
chk('근로기준법 제55조 → 휴게·주휴만',ws('GK:제55조')==='lb_rest',ws('GK:제55조'));
chk('최저임금법 제6조의2 → 최저임금·취업규칙',ws('MW:제6조의2')===['lb_mw','lb_rules'].sort().join(),ws('MW:제6조의2'));
chk('고평법 제13조 → 괴롭힘·성희롱',ws('EQ:제13조')==='lb_harass',ws('EQ:제13조'));

// 7. 계산 도구 단추
const T={}; L.forEach(w=>T[w.id]=w.tool&&w.tool[0]);
chk('임금 지급·최저임금·휴게·주휴 → 임금·주휴 계산',T.lb_wage==='wopen'&&T.lb_mw==='wopen'&&T.lb_rest==='wopen',T);
chk('연차 → 연차 계산, 퇴직급여 → 퇴직금 계산',T.lb_leave==='aopen'&&T.lb_ret==='ropen',T);
chk('계산 단추가 앱에 있는 열기 동작만(wopen·aopen·ropen·copen)',L.every(w=>!w.tool||['wopen','aopen','ropen','copen'].indexOf(w.tool[0])>=0&&html.indexOf("hasAttribute('data-"+w.tool[0]+"')")>=0));

console.log(fail?('실패 '+fail+'건 / '+cnt+'건'):('전체 통과 '+cnt+'건')); process.exit(fail?1:0);
