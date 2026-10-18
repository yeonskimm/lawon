// 법ON 항목별 기준(근로기준, 2026-10-18) 데이터 검사 — 사용: node tests/labor_item_check.js index.html
// 기대값: 항목 14개·조문 수는 2026-10-18 사용자와 정한 1차 구성(근로기준 '자주 찾는 말' 12개를 모두 받는 14개)
// 5명 미만 적용 여부 기대값은 근로기준법 시행령 별표1 원문(2018. 6. 29. 개정)·기간제법 시행령 별표1 원문(한국법MCP 현행·2027. 12. 31. 기준 확인 2026-10-18) — 앱 판정(judgeArt)·화면 문구(l5Lab)와 대조
// 2026-10-18 10시 사용자 결정: 5명 미만에도 적용되는 조문은 표시 없음(null), 예외만 '5명 미만 적용 제외'·'5명 미만은 제1항만 적용'·'5명 미만은 일부만 적용'+설명·'상시 10명 이상'·시행 예정
// 2026-10-18 오전 보완: 근로시간 → 근로시간·가산수당(20), 퇴직급여에서 근기법 제34조 뺌(8), l5Lab(제93조 '상시 10명 이상', 모법 없는 시행령 표시 없음, 하위 조문 일부 적용은 모법 조항 표기)
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,prepareBT,judgeArt,l5Lab:typeof l5Lab==="function"?l5Lab:null,workIdx:typeof workIdx==="function"?workIdx:null,workOf:typeof workOf==="function"?workOf:null,workGroups:typeof workGroups==="function"?workGroups:null,workLines})',{console});
let fail=0,cnt=0;
const chk=(name,c,info)=>{cnt++; if(!c)fail++; if(!c||process.env.VERBOSE)console.log((c?'PASS':'FAIL')+'  '+name+(c?'':'  → '+(info===undefined?'':JSON.stringify(info))));};
const D=C.prepare(JSON.parse(raw)); C.prepareBT(D);
const TB={}; D.bt.tabs.forEach(t=>TB[t.id]=t);
const L=(D.work||[]).filter(w=>w.f==='labor');

// 1. 항목 목록·순서·조문 수
const EXP={lb_contract:['근로계약',12],lb_rules:['취업규칙',8],lb_docs:['서류 보존',12],lb_mw:['최저임금',10],lb_wage:['임금 지급',21],lb_ret:['퇴직급여',8],
  lb_hours:['근로시간·가산수당',20],lb_rest:['휴게·주휴',4],lb_leave:['연차',5],lb_dismiss:['해고',13],lb_ft:['기간제·단시간',10],lb_harass:['괴롭힘·성희롱',8],lb_mat:['모성·육아',18],lb_minor:['연소자·임산부',15]};
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
  ['출산휴가','lb_mat'],['육아휴직','lb_mat'],['기간제','lb_ft'],['알바','lb_ft'],['연장근로','lb_hours'],['52시간','lb_hours'],['가산수당','lb_hours'],['연장근로수당','lb_hours'],['야간수당','lb_hours'],['휴일근로수당','lb_hours'],['근로자명부','lb_docs'],['파견사업관리대장','lb_docs'],['사용사업관리대장','lb_docs'],['관리대장','lb_docs'],['회의록','lb_docs'],['노사협의회 회의록','lb_docs'],['취직인허증','lb_minor'],['징계','lb_dismiss']];
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

// 3-2. 원문 별표1 목록으로 항목의 모든 근로기준법·기간제법 줄(모법을 따르는 시행령·시행규칙 포함)을 따로 판정해 화면 문구와 대조
if(!C.l5Lab){ chk('l5Lab 있음',false); } else {
  const num=no=>{ const m=/제(\d+)조(?:의(\d+))?/.exec(no); return [+m[1],+(m[2]||0)]; };
  const inR=(no,a,b)=>{ const [x,y]=num(no); return (x>a||(x===a&&y>=0))&&(x<b||(x===b&&y>=0))&&!(x===b&&y>0&&false); };
  // 근로기준법 시행령 별표1: '제43조부터 제45조까지'처럼 범위는 그 사이 '조의' 포함(끝 조의 '조의N'은 범위 밖), 단독 열거(제74조)는 그 조만(제74조의2 제외)
  const GKR=[[1,13],[35,42],[43,45],[47,49],[66,69],[78,92],[101,106],[107,116]], GKW=[15,17,18,20,21,22,26,54,63,64,71,72,74,76], GKP={19:'제1항',23:'제2항',55:'제1항',65:'제1항·제3항',70:'제2항·제3항'};
  const FTW=[1,2,5,7,18,19,20,21,23], FTP={16:'제4호',17:'제1호',24:'제2항제2호'};
  const exp=(e)=>{ const [x,y]=num(e.no);
    if(e.l==='GK'){ if(y===0&&GKW.includes(x))return 'ap'; if(y===0&&GKP[x])return 'pt:'+GKP[x];
      if(GKR.some(([a,b])=>x>=a&&x<=b&&!(x===b&&y>0)))return 'ap'; return 'na'; }
    if(e.l==='FT'){ if(y===0&&FTW.includes(x))return 'ap'; if(y===0&&FTP[x])return 'pt:'+FTP[x]; return 'na'; }
    return null; };
  const seen={};
  L.forEach(w=>w.sec.forEach(s=>s.a.forEach(it=>{ const e=D.byKey[it.k]; if(seen[it.k])return; seen[it.k]=1;
    const sub=/(D|R)$/.test(e.l), base=sub?e.pa:e, lab=C.l5Lab(D,e);
    if(sub&&!e.pa){ chk(it.k+' 모법 없는 하위 조문 → 표시 없음',lab===null,lab); return; }
    if(base.fut){ chk(it.k+' 시행 전 조문 → 시행 예정 표시(5명 미만 표시 안 함)',!!lab&&lab.k==='fut'&&/^\d{4}\. \d+\. \d+\. 시행 예정$/.test(lab.t),lab); return; }
    if(base.min>5){ chk(it.k+' 상시 '+base.min+'명 이상 표시',!!lab&&lab.t==='상시 '+base.min+'명 이상',lab); return; }
    const x=exp(base);
    if(x===null){ chk(it.k+' 규모 제한 없는 법(최임·퇴직급여·고평) → 표시 없음(전체 적용)',lab===null,lab); return; }
    if(x==='ap')chk(it.k+' 별표1 적용 → 표시 없음(전체 적용)',lab===null,lab);
    else if(x==='na')chk(it.k+' 별표1에 없음 → 5명 미만 적용 제외',!!lab&&lab.t==='5명 미만 적용 제외',lab);
    else { const p=x.slice(3); chk(it.k+' 별표1 일부('+p+') → 일부 표시',!!lab&&lab.k==='pt'&&((lab.t+' '+(lab.d||'')).indexOf(p)>=0),lab);
      if(sub)chk(it.k+' 하위 조문 일부 적용은 모법 조항으로 표기',!!lab.d&&lab.d.indexOf(base.no+' 중 ')>=0,lab); } })));
  chk('항목 줄 전부 점검(중복 제외 157줄 이상)',Object.keys(seen).length>=150,Object.keys(seen).length);
  // 대표 문구(화면에 그대로 나옴)
  const T=k=>C.l5Lab(D,D.byKey[k]);
  chk('근기법 제93조 → 상시 10명 이상(5~9명도 대상 아님)',T('GK:제93조').t==='상시 10명 이상',T('GK:제93조'));
  chk('근기법 시행규칙 제15조(취업규칙 신고) → 상시 10명 이상',T('GKR:제15조').t==='상시 10명 이상',T('GKR:제15조'));
  chk('근기법 제56조(가산수당) → 5명 미만 적용 제외',T('GK:제56조').t==='5명 미만 적용 제외',T('GK:제56조'));
  chk('근기법 시행령 제6조(통상임금, 모법 연결 없음) → 표시 없음',T('GKD:제6조')===null,T('GKD:제6조'));
  chk('근기법 제55조 → 5명 미만은 제1항만 적용',T('GK:제55조').t==='5명 미만은 제1항만 적용',T('GK:제55조'));
  chk('근기법 제23조 → 5명 미만은 제2항만 적용',T('GK:제23조').t==='5명 미만은 제2항만 적용',T('GK:제23조'));
  chk('기간제법 제16조 → 5명 미만은 제4호만 적용',T('FT:제16조').t==='5명 미만은 제4호만 적용',T('FT:제16조'));
  chk('근기법 제70조 → 5명 미만은 제2항·제3항만 적용(줄이지 않음)',T('GK:제70조').t==='5명 미만은 제2항·제3항만 적용',T('GK:제70조'));
  chk('시행령 제30조 → 일부 적용 · 근기법 제55조 중 제1항만 적용',T('GKD:제30조').t==='5명 미만은 일부만 적용'&&T('GKD:제30조').d==='근기법 제55조 중 제1항만 적용',T('GKD:제30조'));
  chk('시행규칙 제12조 → 일부 적용 · 근기법 제70조 중 제2항·제3항만 적용',T('GKR:제12조').d==='근기법 제70조 중 제2항·제3항만 적용',T('GKR:제12조'));
  chk('근기법 제65조 → 일부 적용 · 제1항·제3항(임산부와 18세 미만 한정)만 적용',T('GK:제65조').t==='5명 미만은 일부만 적용'&&T('GK:제65조').d==='제1항·제3항(임산부와 18세 미만 한정)만 적용',T('GK:제65조'));
  chk('기간제법 제17조 → 일부 적용 · 제1호·제2호(휴게)·제3호·제4호(휴일)·제5호만 적용',T('FT:제17조').t==='5명 미만은 일부만 적용'&&T('FT:제17조').d==='제1호·제2호(휴게)·제3호·제4호(휴일)·제5호만 적용',T('FT:제17조'));
  chk('기간제법 제4조(2년 초과 사용) → 5명 미만 적용 제외',T('FT:제4조').t==='5명 미만 적용 제외',T('FT:제4조'));
  chk('근기법 제74조의2(태아검진) → 적용 제외(별표1은 제74조만)',T('GK:제74조의2').t==='5명 미만 적용 제외',T('GK:제74조의2'));
  chk('근기법 제44조의4(2027. 1. 1. 시행 신설) → 2027. 1. 1. 시행 예정',T('GK:제44조의4').t==='2027. 1. 1. 시행 예정',T('GK:제44조의4'));
  chk('근기법 제44조의2 → 표시 없음(별표1 제43조부터 제45조까지 — 사이의 조의 포함)',T('GK:제44조의2')===null,T('GK:제44조의2'));
  chk('퇴직급여법 제9조 → 표시 없음(모든 사업 적용)',T('RET:제9조')===null,T('RET:제9조'));
  ['GK:제63조','GKD:제34조','MW:제7조','MW:제6조의2','GK:제26조','GK:제54조'].forEach(k=>chk(k+' 적용 조문 → 표시 없음(적용 제외·특례 조문에 \'적용\'이 붙어 반대로 읽히던 문제)',T(k)===null,T(k)));
  const allLab=[]; L.forEach(w=>w.sec.forEach(s=>s.a.forEach(it=>{ const v=T(it.k); if(v)allLab.push(v.t); })));
  chk('표시 문구는 예외만(적용 제외·은 …만 적용·일부만 적용·10명 이상·시행 예정)',allLab.every(t=>/^(5명 미만 적용 제외|5명 미만은 .+만 적용|5명 미만은 일부만 적용|상시 \d+명 이상|\d{4}\. \d+\. \d+\. 시행 예정)$/.test(t)),allLab.filter(t=>!/^(5명 미만 적용 제외|5명 미만은 .+만 적용|5명 미만은 일부만 적용|상시 \d+명 이상|\d{4}\. \d+\. \d+\. 시행 예정)$/.test(t)));
  chk('"5명 미만 적용"(뜻이 두 가지로 읽히는 문구) 없음',!allLab.includes('5명 미만 적용'));
  chk('퇴직급여 항목에 근기법 제34조 없음(퇴직급여법 직접 적용과 헷갈림)',!L.find(w=>w.id==='lb_ret').sec.some(s=>s.a.some(i=>i.k==='GK:제34조')));
}

// 6. 역연결(조문 화면 '항목 기준')
const I=C.workIdx(D), ws=k=>(I[k]||[]).map(x=>x.w).sort().join();
chk('근로기준법 제18조 → 근로계약·휴게·주휴·연차·기간제(4개)',ws('GK:제18조')===['lb_contract','lb_rest','lb_leave','lb_ft'].sort().join(),ws('GK:제18조'));
chk('근로기준법 시행령 제9조 → 근로계약·기간제',ws('GKD:제9조')===['lb_contract','lb_ft'].sort().join(),ws('GKD:제9조'));
chk('근로기준법 제55조 → 휴게·주휴만',ws('GK:제55조')==='lb_rest',ws('GK:제55조'));
chk('최저임금법 제6조의2 → 최저임금·취업규칙',ws('MW:제6조의2')===['lb_mw','lb_rules'].sort().join(),ws('MW:제6조의2'));
chk('고평법 제13조 → 괴롭힘·성희롱',ws('EQ:제13조')==='lb_harass',ws('EQ:제13조'));

// 7. 계산 도구 단추
const T={}; L.forEach(w=>T[w.id]=w.tool&&w.tool[0]);
chk('임금 지급·최저임금·근로시간·가산수당·휴게·주휴 → 임금·주휴 계산',T.lb_wage==='wopen'&&T.lb_mw==='wopen'&&T.lb_hours==='wopen'&&T.lb_rest==='wopen',T);
chk('근로시간·가산수당 첫 묶음이 가산수당(제56조·영 제6조·제57조)',(()=>{const s=L.find(w=>w.id==='lb_hours').sec[0]; return s.h==='가산수당'&&s.a.map(i=>i.k).join()==='GK:제56조,GKD:제6조,GK:제57조';})());
chk('연차 → 연차 계산, 퇴직급여 → 퇴직금 계산',T.lb_leave==='aopen'&&T.lb_ret==='ropen',T);
chk('계산 단추가 앱에 있는 열기 동작만(wopen·aopen·ropen·copen)',L.every(w=>!w.tool||['wopen','aopen','ropen','copen'].indexOf(w.tool[0])>=0&&html.indexOf("hasAttribute('data-"+w.tool[0]+"')")>=0));

// 2026-10-18 오후: 서류 보존에 다른 법령 서류 의무 — 기대값은 조문 본문(원문)에서: '작성ㆍ보존'·'보존하여야' 조문
{ const docs=L.find(w=>w.id==='lb_docs'), ks=docs.sec.flatMap(s=>(s.a||[]).map(i=>i.k));
  ['DISP:제29조','DISP:제33조','LMC:제19조'].forEach(k=>{ const e=D.byKey[k];
    chk('서류 보존에 '+k+'(본문에 작성·보존 의무)',ks.includes(k)&&/보존하여야/.test(e.x),ks); });
  ['DISP:제29조','DISP:제33조'].forEach(k=>chk(k+' 과태료 연결(제46조제5항)',(D.byKey[k].s||[]).some(z=>z.kind==='과태료'&&/^제46조제5항/.test(z.basis)),D.byKey[k].s));
  const m4=/상시(?:\(常時\))?\s*(\d+)명\s*미만[^.]*그러하지\s*아니하다/.exec((D.byKey['LMC:제4조']||{}).x||''), lab=C.l5Lab(D,D.byKey['LMC:제19조']);
  chk('근참법 제19조 표시 = 제4조 단서 원문 인원(상시 '+(m4&&m4[1])+'명 미만 제외 → 이상)',!!m4&&!!lab&&lab.t==='상시 '+m4[1]+'명 이상',[m4&&m4[1],lab]);
  ['DISP:제29조','DISP:제33조'].forEach(k=>chk(k+' 5명 미만 표시 없음(파견법은 인원 제한 없음)',C.l5Lab(D,D.byKey[k])===null,C.l5Lab(D,D.byKey[k])));
  chk("'관리대장' 산업안전 분야에서는 카드 없음",C.workOf(D,'관리대장','osh')===null); }
console.log(fail?('실패 '+fail+'건 / '+cnt+'건'):('전체 통과 '+cnt+'건')); process.exit(fail?1:0);
