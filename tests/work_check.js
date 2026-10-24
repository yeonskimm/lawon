// 법ON 작업별 기준(2026-10-17) 데이터 검사 — 사용: node tests/work_check.js index.html
// 작업마다 가리키는 조문·별표 줄이 실제로 있는지, 발췌 줄이 조문에 있는지, 제재 조항이 맞는지, 역연결·검색어 연결이 맞는지
// 기대값(작업 수·조문 수·연결 항·호)은 2026-10-17 사용자와 정한 1차 10개 + 2차 10개(건설·제조 기계) + 3차 9개(크레인 분리·하역 운반·보건) + 4차 5개(2026-10-18 제조·화학, 폭염에 한랭 합침) 기준. 작업을 늘리거나 바꾸면 여기도 같이 고칠 것
// 3차 조문 수는 안전보건규칙 장·절 구성에서 손으로 셈(삭제 조문 제520조·제610조 제외): 예) 관리대상 = 제420·421 + 제422~428(7) + 제429~435(7) + 제436~440(5) + 제441~449(9) + 제450·451 + 제35조 + 법 제114·115조 + 영 제74조 = 36
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,prepareBT,ruleSanc,workIdx:typeof workIdx==="function"?workIdx:null,workOf:typeof workOf==="function"?workOf:null,workAll:typeof workAll==="function"?workAll:null,workLines:typeof workLines==="function"?workLines:null,workGroups:typeof workGroups==="function"?workGroups:null})');
let fail=0,cnt=0;
const chk=(name,c,info)=>{cnt++; if(!c)fail++; if(!c||process.env.VERBOSE)console.log((c?'PASS':'FAIL')+'  '+name+(c?'':'  → '+(info===undefined?'':JSON.stringify(info))));};
if(!C.workIdx||!C.workOf||!C.workLines){ console.log('FAIL  작업별 기준 함수 없음(workIdx·workOf·workLines)'); process.exit(1); }
const D=C.prepare(JSON.parse(raw)); C.prepareBT(D);
const W=(D.work||[]).filter(w=>(w.f||'osh')==='osh')/* 2026-10-18: 산업안전 작업별 기준만(근로기준 항목은 labor_item_check.js) */, RW={}; (D.bt.rows||[]).forEach(r=>RW[r.id]=r); const TB={}; D.bt.tabs.forEach(t=>TB[t.id]=t);
const lines=(x)=>String(x||'').split('\n').map(l=>l.trim());

// 1. 작업 목록·조문 수(1차 10개)
const EXP={forklift:['지게차',23],aerial:['고소작업대',15],crane:['크레인',36],lift:['리프트·곤돌라·승강기',32],cart:['구내운반차',18],truck:['화물취급·화물자동차',27],heavy:['중량물',10],scaffold:['비계',19],ladder:['사다리',3],fall:['추락 방지',11],excav:['굴착',30],formwork:['거푸집·동바리',12],steel:['철골',4],asbestos:['석면',20],demol:['해체',8],pile:['항타기·항발기',17],confined:['밀폐공간',30],hotwork:['화기작업',27],electric:['전기작업',27],hazmat:['위험물·화학설비',49],conveyor:['컨베이어',15],press:['프레스·전단기',10],robot:['산업용 로봇',7],injection:['사출성형기',8],roller:['롤러기',9],grinder:['연삭기',5],wood:['목재가공용 기계',13],boiler:['보일러·압력용기',15],chem:['관리대상 유해물질',36],permit:['허가대상 유해물질',29],dust:['분진',13],noise:['소음·진동',10],heat:['폭염·한랭',11],msd:['근골격계부담작업',15],dryer:['건조설비·호퍼',9],foundry:['주물·단조',13],logging:['벌목',7]};
// 4차 손 계산: 위험물 = 제225~238(14) + 제255~279(25) + 제296~300(5) + 제20조 + 제38조 + 제35조 + 법 제44조 + 영 제43조 = 49 / 허가대상 = 법 제118조 + 영 제88조 + 제452~476(25) + 제35조 + 영 제74조 = 29 / 폭염·한랭 = 제558·559 + 제560·561 + 제562·567·571 + 제563·569·572 + 제566 = 11
// 5차 손 계산(2026-10-22): 건조설비·호퍼 = 제280~284(5) + 제243조 + 제48조 + 제35조 + 법 제42조 = 9 / 주물·단조 = 제247~254(8) + 제559·562·566조 + 제605조 + 법 제42조 = 13 / 벌목 = 제405·406조 + 제20조 + 제512·518·519·521조 = 7
chk('작업 37개',W.length===37,W.length);
chk('작업 순서(검색어 우선순위 — 석면은 해체 앞)',W.map(w=>w.id).join()===Object.keys(EXP).join(),W.map(w=>w.id));
const ids=W.map(w=>w.id); chk('작업 id 겹침 없음',new Set(ids).size===ids.length,ids);
W.forEach(w=>{ const e=EXP[w.id], n=w.sec.reduce((a,s)=>a+(s.a||[]).filter(i=>i.k).length,0);
  chk(w.n+' 이름·조문 수',!!e&&e[0]===w.n&&e[1]===n,[w.n,n]); });

// 2. 조문·별표·발췌·제재 실재
W.forEach(w=>{ const seen={};
  w.sec.forEach(s=>{
    chk(w.n+' · '+s.h+' 내용 있음',!!((s.a&&s.a.length)||(s.bt&&s.bt.length)||s.t),s);
    if(s.t)chk(w.n+' · '+s.h+' 별표 '+s.t,!!TB[s.t]);
    if(s.sb){ const e=D.byKey[s.sb.k]; chk(w.n+' · '+s.h+' 근거 조문 '+s.sb.k,!!e);
      [].concat(s.sb.pk).forEach(p=>chk(w.n+' · '+s.h+' 제재 '+p,!!e&&(e.s||[]).some(z=>String(z.qual||'').indexOf(p)===0))); }
    (s.bt||[]).forEach(id=>chk(w.n+' · '+s.h+' 별표 줄 '+id,!!RW[id]));
    (s.a||[]).forEach(it=>{
      if(it.t&&!it.k){ chk(w.n+' 별표 '+it.t,!!TB[it.t]); return; }
      const e=D.byKey[it.k]; chk(w.n+' 조문 '+it.k,!!e); if(!e)return;
      chk(w.n+' 조문 본문 있음 '+it.k,!!String(e.x||'').trim());
      if(it.k!=='RULE:제35조'){ chk(w.n+' 같은 조문 두 번 없음 '+it.k,!seen[it.k]); seen[it.k]=1; }
      if(e.l==='RULE'){ const rs=C.ruleSanc(D,e); chk(w.n+' 제재 연결 '+it.k,!!rs||!!e.ns,it.k); }
      (it.ln||[]).forEach(p=>chk(w.n+' 발췌 줄 '+it.k+' "'+p+'"',lines(e.x).filter(l=>l.indexOf(p)===0).length>=1));
      if(it.ln)chk(w.n+' workLines '+it.k,C.workLines(e.x,it.ln).length>=it.ln.length);
      (it.bt||[]).forEach(id=>chk(w.n+' 별표 줄 '+id,!!RW[id]));
      if(it.t)chk(w.n+' 별표 '+it.t,!!TB[it.t]);
      if(it.pk)[].concat(it.pk).forEach(p=>chk(w.n+' 제재 '+it.k+' '+p,(e.s||[]).some(z=>String(z.qual||'').indexOf(p)===0)));
      (it.q||[]).forEach(q=>{ const f=D.byKey[q.k]; chk(w.n+' 발췌 조문 '+q.k,!!f); if(f)q.ln.forEach(p=>chk(w.n+' 발췌 줄 '+q.k+' "'+p+'"',lines(f.x).filter(l=>l.indexOf(p)===0).length>=1)); });
    });
  });
});

// 3. 작업계획서 호와 별표 4 줄 번호가 맞는지(제38조제1항 N호 ↔ 별표 4 제N호)
W.forEach(w=>w.sec.forEach(s=>(s.a||[]).forEach(it=>{ if(it.k!=='RULE:제38조')return;
  if(!it.bt)return;   // 제3항(항타기 작업방법)은 별표 4 대상 아님
  const ho=(it.ln||[]).map(p=>(/^(\d+)\./.exec(p)||[])[1]), rw=(it.bt||[]).map(id=>RW[id]&&RW[id].tb==='R4'?RW[id].no:null);
  chk(w.n+' 작업계획서 호 ↔ 별표4 번호',JSON.stringify(ho)===JSON.stringify(rw),[ho,rw]); })));

// 4. 별표 줄 내용이 작업과 맞는지(대표 낱말)
const BW={'R2.2':'목재가공용','R2.4':'위험물','R2.17':'허가대상','R3.3':'공기압축기','R4.4':'화학설비','S5.7':'인화성 액체','S5.8':'인화성 가스','S5.9':'반응기','S5.10':'탱크 내','S5.15':'목재가공용','S5.34':'보일러','S5.35':'압력용기','LC1.1':'압력용기','LC1.4':'보일러','LC1.9':'인화성','LC1.12':'배관','S21.195':'목재','S22.174':'목재','R2.13':'화물취급','R2.16':'관리대상 유해물질','R2.18':'석면','R3.6':'리프트','R3.7':'곤돌라','R3.8':'와이어로프','R3.10':'구내운반차','R3.12':'화물자동차','R3.17':'중량물','R4.11':'중량물','S5.18':'리프트','S5.26':'쌓거나 무너뜨리는','S5.38':'관리 대상 유해물질','S5.40':'석면','S21.190':'80dB','S21.191':'고열','S21.192':'광물성','S21.196':'석면','S21.197':'용접 흄','S22.171':'곡물','S22.177':'석면','S22.178':'소음','S22.179':'진동','R4.10':'해체','S5.32':'해체','S5.21':'파쇄','S5.30':'금속제의 부재','LC1.12':'철골','R6.7':'항타기','R2.1':'프레스','R3.1':'프레스','S5.14':'프레스','R3.2':'로봇','S5.39':'로봇','LC1.21':'롤러기','LC1.16':'승강기','R3.9':'지게차','R3.11':'고소작업대','R3.13':'컨베이어','R3.14':'차량계 건설기계','R3.15':'용접','R2.9':'비계','R2.10':'달비계','R2.20':'밀폐공간','R2.15':'전기','R2.3':'크레인','R4.1':'타워크레인','R4.2':'차량계 하역운반기계','R4.5':'전기작업','R4.6':'굴착','S5.16':'하역기계','S5.29':'비계','S5.37':'밀폐','S5.17':'크레인','S5.20':'정전 및 활선','S5.28':'거푸집 동바리','LC1.6':'지게차','LC1.19':'비계','LC1.18':'거푸집','LC1.24':'고소작업대','LC1.8':'용접','LC1.11':'활선','SD21.21':'지게차'};
Object.keys(BW).forEach(id=>chk('별표 줄 '+id+' 내용 "'+BW[id]+'"',!!RW[id]&&String(RW[id].t||'').indexOf(BW[id])>=0,RW[id]&&RW[id].t));

// 5. 역연결(조문 → 작업)
const I=C.workIdx(D);
const has=(k,w,hs)=>(I[k]||[]).some(x=>x.w===w&&(hs===undefined||x.hs===hs));
chk('역연결 규칙 제183조 → 지게차 하나',(I['RULE:제183조']||[]).length===1&&has('RULE:제183조','forklift'));
chk('역연결 규칙 제171조 → 지게차·고소작업대·구내운반차·화물자동차',(I['RULE:제171조']||[]).length===4&&['forklift','aerial','cart','truck'].every(w=>has('RULE:제171조',w)));
chk('역연결 규칙 제178조 → 지게차(전체)·구내운반차·화물자동차(제2항 최대적재량), 고소작업대 없음',(I['RULE:제178조']||[]).length===3&&has('RULE:제178조','forklift','')&&has('RULE:제178조','cart','제2항')&&has('RULE:제178조','truck','제2항'));
chk('역연결 규칙 제38조 → 제1항제2호 지게차',has('RULE:제38조','forklift','제1항제2호'));
chk('역연결 규칙 제38조 → 제1항제1호 크레인',has('RULE:제38조','crane','제1항제1호'));
chk('역연결 규칙 제38조 → 중량물 제1항제11호',has('RULE:제38조','heavy','제1항제11호'));
chk('역연결 규칙 제38조 → 위험물 제1항제4호',has('RULE:제38조','hazmat','제1항제4호'));
chk('역연결 규칙 제38조 → 11개 작업(항타기 제3항 포함)',(I['RULE:제38조']||[]).length===11&&has('RULE:제38조','pile','제3항')&&has('RULE:제38조','demol','제1항제10호'),(I['RULE:제38조']||[]).map(x=>x.n));
chk('역연결 규칙 제35조 → 25개 작업(5차 건조설비 별표2 제5호)',(I['RULE:제35조']||[]).length===25,(I['RULE:제35조']||[]).map(x=>x.n));
chk('역연결 시행령 제78조 → 9개 작업(리프트·곤돌라 분리, 압력용기)',['crane','lift','aerial','conveyor','press','robot','injection','roller','boiler'].every(w=>has('SD:제78조',w))&&(I['SD:제78조']||[]).length===9);
chk('역연결 시행령 제77조 → 리프트(자동차정비용)·화기·컨베이어·로봇·롤러기·연삭기·목재가공',['lift','hotwork','conveyor','robot','roller','grinder','wood'].every(w=>has('SD:제77조',w))&&(I['SD:제77조']||[]).length===7);
chk('역연결 영 제88조(허가대상 물질) → 허가대상',has('SD:제88조','permit'));
chk('역연결 영 제43조(공정안전보고서 대상) → 위험물',has('SD:제43조','hazmat'));
chk('역연결 규칙 제261조(안전밸브) → 위험물·보일러',has('RULE:제261조','hazmat')&&has('RULE:제261조','boiler'));
chk('역연결 규칙 제563조(한랭) → 폭염·한랭',has('RULE:제563조','heat'));
chk('역연결 규칙 제663조 → 중량물·근골격계',has('RULE:제663조','heavy')&&has('RULE:제663조','msd'));
chk('역연결 시행규칙 제98조 → 보일러 제1항제3호(공기압축기)',has('SR:제98조','boiler','제1항제3호'));
chk('역연결 시행령 제74조 → 보호구(석면·관리대상·분진·소음) 포함',['asbestos','chem','dust','noise'].every(w=>has('SD:제74조',w)));
chk('역연결 규칙 제86조 탑승 제한 → 항별로 나뉨',has('RULE:제86조','crane','제1항·제2항')&&has('RULE:제86조','lift','제3항~제6항·제10항')&&has('RULE:제86조','forklift','제7항')&&has('RULE:제86조','cart','제7항')&&has('RULE:제86조','truck','제8항')&&has('RULE:제86조','conveyor','제9항'));
chk('역연결 규칙 제20조 출입금지 → 크레인 제3~5호·리프트 제6호·화물 제7·14호',has('RULE:제20조','crane','제3호~제5호')&&has('RULE:제20조','lift','제6호')&&has('RULE:제20조','truck','제7호·제14호'));
chk('역연결 규칙 제151조(리프트) → 리프트만',(I['RULE:제151조']||[]).length===1&&has('RULE:제151조','lift'));
chk('역연결 규칙 제136조(크레인) → 크레인만',(I['RULE:제136조']||[]).length===1&&has('RULE:제136조','crane'));
chk('역연결 규칙 제132조(양중기 공통) → 크레인·리프트',(I['RULE:제132조']||[]).length===2&&has('RULE:제132조','crane')&&has('RULE:제132조','lift'));
chk('역연결 규칙 제559조(폭염작업 정의) → 폭염',has('RULE:제559조','heat'));
chk('역연결 규칙 제663조 → 중량물',has('RULE:제663조','heavy'));
chk('역연결 법 제125조·제130조(작업환경측정·특수건강진단)는 작업 기준 링크 없음(교육·자격처럼 묶음 근거로만)',!I['OSH:제125조']&&!I['OSH:제130조']);
chk('역연결 규칙 제42조 → 사다리 제4항·추락 방지',has('RULE:제42조','ladder','제4항')&&has('RULE:제42조','fall'));
chk('역연결 규칙 제40조 → 지게차·크레인·굴착·항타기 호별',has('RULE:제40조','forklift','제1항제2호')&&has('RULE:제40조','crane','제1항제1호')&&has('RULE:제40조','excav','제1항제3호')&&has('RULE:제40조','pile','제1항제4호'));
chk('역연결 법 제119조 → 해체·석면',has('OSH:제119조','demol')&&has('OSH:제119조','asbestos')&&(I['OSH:제119조']||[]).length===2);
chk('역연결 시행규칙 제98조 → 지게차 제1항제5호',has('SR:제98조','forklift','제1항제5호'));
Object.keys(I).forEach(k=>chk('역연결 키 실재 '+k,!!D.byKey[k]));
// 3차: 크레인·리프트 분리 경계, 별표 줄 범위(별표3 제18호 슬링은 제2편제6장제2절 항만하역이라 크레인에 넣지 않음)
const keysOf=id=>{ const w=W.find(x=>x.id===id); return w?w.sec.flatMap(s=>(s.a||[]).filter(i=>i.k).map(i=>i.k)):[]; }, btOf=id=>{ const w=W.find(x=>x.id===id); return w?w.sec.flatMap(s=>(s.bt||[]).concat(...(s.a||[]).map(i=>i.bt||[]))):[]; };
chk('크레인에 리프트·곤돌라·승강기 조문(제151~162조) 없음',!keysOf('crane').some(k=>/^RULE:제1(5[1-9]|6[0-2])조$/.test(k)),keysOf('crane'));
chk('리프트에 크레인·이동식 크레인 조문(제136~150조) 없음',!keysOf('lift').some(k=>/^RULE:제1(3[6-9]|4\d|50)조$/.test(k)),keysOf('lift'));
chk('크레인 별표3 슬링(제18호 R3.19) 없음',btOf('crane').indexOf('R3.19')<0);
const eduOf=id=>{ const w=W.find(x=>x.id===id), s=w&&w.sec.find(x=>x.h==='특별교육'); return s?JSON.stringify(s.bt):null; };
// 5차(2026-10-22) 역연결·발췌
chk('역연결 규칙 제20조 → 벌목 제16호',has('RULE:제20조','logging','제16호'));
chk('역연결 규칙 제559조 → 폭염·주물단조',has('RULE:제559조','heat')&&has('RULE:제559조','foundry'));
chk('역연결 규칙 제512조 → 소음·진동·벌목(제4호 진동작업)',has('RULE:제512조','noise')&&has('RULE:제512조','logging','제4호 진동작업(체인톱)'));
chk('역연결 규칙 제280조(건조설비) → 건조설비·호퍼만',(I['RULE:제280조']||[]).length===1&&has('RULE:제280조','dryer'));
chk('역연결 규칙 제253조(용해로) → 주물단조만',(I['RULE:제253조']||[]).length===1&&has('RULE:제253조','foundry'));
chk('역연결 법 제42조(유해위험방지계획서) → 건조설비·주물단조',has('OSH:제42조','dryer')&&has('OSH:제42조','foundry'));
chk('역연결 규칙 제405조 → 벌목만',(I['RULE:제405조']||[]).length===1&&has('RULE:제405조','logging'));
chk('주물단조 제559조 발췌 4줄(용광로·용선로·가열된 금속·녹인 금속)',C.workLines(D.byKey['RULE:제559조'].x,['1. 용광로','2. 용선로','6. 가열된 금속','7. 녹인 금속']).length===4);
chk('벌목 제20조 발췌 = 제16호 한 줄',C.workLines(D.byKey['RULE:제20조'].x,['16. 벌목']).length===1);
chk('벌목 제512조 발췌 = 제4호 진동작업 + 다목 체인톱 2줄',C.workLines(D.byKey['RULE:제512조'].x,['4. "진동작업"','다. 체인톱']).length===2&&/체인톱/.test(C.workLines(D.byKey['RULE:제512조'].x,['4. "진동작업"','다. 체인톱']).join('')));
chk('건조설비 특별교육 = 별표5 제8호(호퍼)·제9호(가열·건조)',eduOf('dryer')==='["S5.11","S5.12"]',eduOf('dryer'));
chk('주물단조 특별교육 = 별표5 제16호',eduOf('foundry')==='["S5.19"]',eduOf('foundry'));
chk('벌목 특별교육 = 별표5 제10호(집재장치)',eduOf('logging')==='["S5.13"]',eduOf('logging'));
{ const wl=W.find(x=>x.id==='logging'), se=wl&&wl.sec.find(x=>x.h==='특별교육'), sh=wl&&wl.sec.find(x=>x.h==='특수건강진단');
  chk('벌목 특별교육·특수건강진단 칸에 조건(벌목 자체는 대상 아님 — 별표5·22 원문)',!!se&&/벌목 자체 아님/.test(se.s||'')&&/집재장치/.test(se.s||'')&&!!sh&&/체인톱/.test(sh.s||''),[se&&se.s,sh&&sh.s]); }

chk('리프트 특별교육 = 별표5 제15호(건설용 리프트·곤돌라)만',eduOf('lift')==='["S5.18"]',eduOf('lift'));
chk('크레인 특별교육 = 제14·30·39호(제15호 없음)',eduOf('crane')==='["S5.17","S5.33","S5.42"]',eduOf('crane'));
chk('구내운반차·화물자동차 작업계획서 제38조제1항제2호 발췌에 도로상 주행작업 제외 문구',/화물자동차를 사용하는 도로상의 주행작업은 제외/.test(C.workLines(D.byKey['RULE:제38조'].x,['2. 차량계 하역운반기계등']).join('')));
chk('폭염 제560조 ②·③ 발췌(체감온도 33도·2시간 이내 20분)',/33도/.test(C.workLines(D.byKey['RULE:제560조'].x,['②','③']).join(''))&&/20분/.test(C.workLines(D.byKey['RULE:제560조'].x,['②','③']).join('')));
chk('폭염·한랭 제560조 ① 발췌(고열·한랭·다습 실내)',/고열ㆍ한랭 또는 다습작업이 실내/.test(C.workLines(D.byKey['RULE:제560조'].x,['①','②','③']).join('')));
chk('목재가공 자율안전확인 발췌(고정형 기계·둥근톱 반발예방·수동대패 칼날)',C.workLines(D.byKey['SD:제77조'].x,['자. 고정형 목재가공용 기계','마. 목재 가공용 둥근톱','바. 동력식 수동대패용']).length===3);
chk('보일러 안전인증 발췌(압력용기·보일러 안전밸브·압력용기 안전밸브·파열판 4줄)',C.workLines(D.byKey['SD:제74조'].x,['마. 압력용기','다. 보일러 압력방출용','라. 압력용기 압력방출용']).length===4);
chk('작업환경측정 묶음 근거 = 법 제125조, 특수건강진단 = 법 제130조',W.every(w=>w.sec.every(s=>(s.h.indexOf('작업환경측정')!==0||s.sb.k==='OSH:제125조')&&(s.h!=='특수건강진단'||s.sb.k==='OSH:제130조'))));

// 6. 검색어 → 작업
const Q=[['둥근톱','wood'],['목공','wood'],['보일러','boiler'],['공기압축기','boiler'],['콤프레샤','boiler'],['안전밸브','boiler'],['위험물','hazmat'],['인화성 액체','hazmat'],['공정안전보고서','hazmat'],['PSM','hazmat'],['베릴륨','permit'],['염화비닐','permit'],['근골격계','msd'],['유해요인조사','msd'],['한랭','heat'],['동상','heat'],['냉동창고','heat'],['리프트','lift'],['곤돌라','lift'],['승강기','lift'],['사다리차','lift'],['호이스트','crane'],['양중기','crane'],['구내운반차','cart'],['화물차','truck'],['상하차','truck'],['하역','truck'],['중량물','heavy'],['드럼통','heavy'],['석면','asbestos'],['석면 해체','asbestos'],['석면 철거','asbestos'],['슬레이트','asbestos'],['유기용제','chem'],['톨루엔','chem'],['국소배기장치','chem'],['분진','dust'],['용접흄','dust'],['소음','noise'],['귀마개','noise'],['진동','noise'],['폭염','heat'],['열사병','heat'],['체감온도','heat'],['고열','heat'],['지게차','forklift'],['지게차 작업계획서','forklift'],['아시바','scaffold'],['말비계','scaffold'],['밀폐공간','confined'],['질식','confined'],['타워크레인','crane'],['카고크레인','crane'],['고소작업대','aerial'],['포클레인','excav'],['흙막이','excav'],['용접','hotwork'],['화재감시자','hotwork'],['동바리','formwork'],['감전','electric'],['컨베이어','conveyor'],['사다리','ladder'],['이동식 사다리','ladder'],['추락','fall'],['개구부','fall'],['철골','steel'],['철거','demol'],['해체','demol'],['비계 해체','scaffold'],['거푸집 해체','formwork'],['항타기','pile'],['프레스','press'],['로봇','robot'],['사출기','injection'],['롤러기','roller'],['그라인더','grinder'],['연삭숫돌','grinder']];
Q.push(['건조설비','dryer'],['호퍼','dryer'],['사일로','dryer'],['주물','foundry'],['단조','foundry'],['용해로','foundry'],['쇳물','foundry'],['벌목','logging'],['체인톱','logging'],['집재','logging']);   // 5차
Q.forEach(([q,w])=>{ const r=C.workOf(D,q); chk('검색어 "'+q+'" → '+w,!!r&&r.id===w,r&&r.id); });
['안전교육','휴게시간','MSDS','위험성평가',''].forEach(q=>chk('검색어 "'+q+'" → 작업 없음(산업안전)',C.workOf(D,q,'osh')===null));

// 6-2. 항 단위 발췌(④ → 그 항의 호·목까지)
chk('workLines 제42조 ④ → 호 7개·목 3개 포함',C.workLines(D.byKey['RULE:제42조'].x,['④']).length===11,C.workLines(D.byKey['RULE:제42조'].x,['④']).length);
chk('workLines 제38조 ③ → 한 줄(④ 제외)',C.workLines(D.byKey['RULE:제38조'].x,['③']).length===1);
chk('workLines 시행령 제74조 가. 프레스 → 기계·방호장치 2줄',C.workLines(D.byKey['SD:제74조'].x,['가. 프레스']).length===2);

// 7. 교육시간 문구(2026-10-17 데이터 오류 수정): 특별교육 '단기간·간헐적 2시간 이상' 끝까지
D.eduTime.filter(x=>x.c==='특별교육').forEach(x=>chk('특별교육 시간 문구 끝 "이상" ('+x.s+(x.w?' · '+x.w.slice(0,20):'')+')',/이상(\))?$/.test(x.t),x.t));
const sup=D.eduTime.find(x=>x.s==='관리감독자'&&x.c==='특별교육');
chk('관리감독자 특별교육 단기간·간헐적 2시간 이상 포함(시행규칙 별표4 제1호의2)',!!sup&&/단기간 작업 또는 간헐적 작업인 경우에는 2시간 이상$/.test(sup.t),sup&&sup.t);
D.items.forEach(it=>(it.edu||[]).forEach(x=>{ if(x.c==='특별교육')chk('주요 의무 '+it.id+' 특별교육 시간 끝 "이상"',/이상(\))?$/.test(x.t),x.t); }));

// 칩 묶음(2026-10-17): 화면 표시만 묶음 순서, 검색어 우선순위는 데이터 순서 그대로. 작업을 늘리면 WORK_GROUPS에도 넣을 것('기타'가 생기면 실패)
chk('작업 기준 칸 제목이 줄어들지 않음(320 큰 글자 낱말 중간 꺾임 방지, 5-65)',html.includes('<h3 class="gl wgl"><b class="gh">')&&html.includes('.gl .gh{flex:none;font-weight:inherit}'));
chk('작업 묶음 함수 있음(workGroups)',!!C.workGroups);
if(C.workGroups){ const G=C.workGroups(D), all=G.flatMap(g=>g.list.map(w=>w.id));
  chk('묶음 이름·순서',G.map(g=>g.h).join()==='하역·양중,건설·추락,제조 기계,위험작업,보건',G.map(g=>g.h));
  chk('모든 작업이 묶음에 한 번씩(기타 없음)',all.length===W.length&&new Set(all).size===W.length&&!G.some(g=>g.h==='기타'),all);
  chk('하역·양중 = 지게차·크레인·리프트·고소작업대·구내운반차·화물·중량물',G[0].list.map(w=>w.id).join()==='forklift,crane,lift,aerial,cart,truck,heavy',G[0].list.map(w=>w.id));
  chk('보건 = 석면·관리대상·허가대상·분진·소음·폭염·근골격계',G[4]&&G[4].list.map(w=>w.id).join()==='asbestos,chem,permit,dust,noise,heat,msd',G[4]&&G[4].list.map(w=>w.id));
  chk('제조 기계 끝 = 목재가공·보일러·주물단조(5차)',G[2].list.slice(-3).map(w=>w.id).join()==='wood,boiler,foundry',G[2].list.map(w=>w.id));
  chk('위험작업 = 밀폐·화기·전기·위험물·건조설비·벌목(5차)',G[3].list.map(w=>w.id).join()==='confined,hotwork,electric,hazmat,dryer,logging',G[3].list.map(w=>w.id));
  chk('묶음에 없는 새 작업은 기타로 표시(빠지지 않음)',C.workGroups({work:W.concat([{id:'zz',n:'새 작업'}])}).slice(-1)[0].h==='기타'); }

// 2026-10-24(5-80) 낱말마다 기준 카드(입력 순서, 2개까지) — 작업 카드에는 추락 방지 조문(제42~45조·제13조)이 없어 둘 다 보여 줌. 한 낱말·검색어 전체가 맞는 말은 카드 1개
if(!C.workAll)chk('workAll 함수 있음',false);
else { const WA=(q,f)=>C.workAll(D,q,f||'osh').map(w=>w.id).join();
  for(const [q,f,exp] of [['철골 추락','osh','steel,fall'],['추락 철골','osh','fall,steel'],['지게차 추락','osh','forklift,fall'],['비계 추락','osh','scaffold,fall'],['굴착 추락','osh','excav,fall'],
      ['추락','osh','fall'],['지붕 추락','osh','fall'],['개구부 안전난간','osh','fall'],['석면 해체','osh','asbestos'],['석면 철거','osh','asbestos'],['비계 철골 추락','osh','scaffold,steel'],
      ['자재 추락','osh','fall'],['안전교육','osh',''],['퇴직금 체불','labor','lb_ret'],['주휴수당','labor','lb_rest']])
    chk('카드 "'+q+'" → '+(exp||'없음'),WA(q,f)===exp,WA(q,f));
  chk('workOf = 첫 카드(철골 추락 → 철골)',(C.workOf(D,'철골 추락','osh')||{}).id==='steel');
  const FALLK=['RULE:제42조','RULE:제43조','RULE:제44조','RULE:제45조','RULE:제13조'], ks=w=>W.find(x=>x.id===w).sec.reduce((a,s)=>a.concat((s.a||[]).map(x=>x.k)),[]);
  chk('철골·비계 카드에는 추락 방지 조문이 없음(둘 다 보여 주는 이유 — 넣으면 이 검사도 고칠 것)',['steel','scaffold'].every(w=>!ks(w).some(k=>FALLK.includes(k)))); }
console.log(fail?('실패 '+fail+'건 / '+cnt+'건'):('전체 통과 '+cnt+'건')); process.exit(fail?1:0);
