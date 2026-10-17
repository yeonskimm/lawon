// 법ON 작업별 기준(2026-10-17) 데이터 검사 — 사용: node tests/work_check.js index.html
// 작업마다 가리키는 조문·별표 줄이 실제로 있는지, 발췌 줄이 조문에 있는지, 제재 조항이 맞는지, 역연결·검색어 연결이 맞는지
// 기대값(작업 수·조문 수·연결 항·호)은 2026-10-17 사용자와 정한 1차 10개 + 2차 10개(건설·제조 기계) 기준. 작업을 늘리거나 바꾸면 여기도 같이 고칠 것
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,prepareBT,ruleSanc,workIdx:typeof workIdx==="function"?workIdx:null,workOf:typeof workOf==="function"?workOf:null,workLines:typeof workLines==="function"?workLines:null})');
let fail=0,cnt=0;
const chk=(name,c,info)=>{cnt++; if(!c)fail++; if(!c||process.env.VERBOSE)console.log((c?'PASS':'FAIL')+'  '+name+(c?'':'  → '+(info===undefined?'':JSON.stringify(info))));};
if(!C.workIdx||!C.workOf||!C.workLines){ console.log('FAIL  작업별 기준 함수 없음(workIdx·workOf·workLines)'); process.exit(1); }
const D=C.prepare(JSON.parse(raw)); C.prepareBT(D);
const W=D.work||[], RW={}; (D.bt.rows||[]).forEach(r=>RW[r.id]=r); const TB={}; D.bt.tabs.forEach(t=>TB[t.id]=t);
const lines=(x)=>String(x||'').split('\n').map(l=>l.trim());

// 1. 작업 목록·조문 수(1차 10개)
const EXP={forklift:['지게차',23],aerial:['고소작업대',15],crane:['크레인·양중기',49],scaffold:['비계',19],ladder:['사다리',3],fall:['추락 방지',11],excav:['굴착',30],formwork:['거푸집·동바리',12],steel:['철골',4],demol:['해체',8],pile:['항타기·항발기',17],confined:['밀폐공간',30],hotwork:['화기작업',27],electric:['전기작업',27],conveyor:['컨베이어',15],press:['프레스·전단기',10],robot:['산업용 로봇',7],injection:['사출성형기',8],roller:['롤러기',9],grinder:['연삭기',5]};
chk('작업 20개',W.length===20,W.length);
chk('작업 순서(장비 → 건설 → 공통 → 제조)',W.map(w=>w.id).join()===Object.keys(EXP).join(),W.map(w=>w.id));
const ids=W.map(w=>w.id); chk('작업 id 겹침 없음',new Set(ids).size===ids.length,ids);
W.forEach(w=>{ const e=EXP[w.id], n=w.sec.reduce((a,s)=>a+(s.a||[]).filter(i=>i.k).length,0);
  chk(w.n+' 이름·조문 수',!!e&&e[0]===w.n&&e[1]===n,[w.n,n]); });

// 2. 조문·별표·발췌·제재 실재
W.forEach(w=>{ const seen={};
  w.sec.forEach(s=>{
    chk(w.n+' · '+s.h+' 내용 있음',!!((s.a&&s.a.length)||(s.bt&&s.bt.length)),s);
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
const BW={'R4.10':'해체','S5.32':'해체','S5.21':'파쇄','S5.30':'금속제의 부재','LC1.12':'철골','R6.7':'항타기','R2.1':'프레스','R3.1':'프레스','S5.14':'프레스','R3.2':'로봇','S5.39':'로봇','LC1.21':'롤러기','LC1.16':'승강기','R3.9':'지게차','R3.11':'고소작업대','R3.13':'컨베이어','R3.14':'차량계 건설기계','R3.15':'용접','R2.9':'비계','R2.10':'달비계','R2.20':'밀폐공간','R2.15':'전기','R2.3':'크레인','R4.1':'타워크레인','R4.2':'차량계 하역운반기계','R4.5':'전기작업','R4.6':'굴착','S5.16':'하역기계','S5.29':'비계','S5.37':'밀폐','S5.17':'크레인','S5.20':'정전 및 활선','S5.28':'거푸집 동바리','LC1.6':'지게차','LC1.19':'비계','LC1.18':'거푸집','LC1.24':'고소작업대','LC1.8':'용접','LC1.11':'활선','SD21.21':'지게차'};
Object.keys(BW).forEach(id=>chk('별표 줄 '+id+' 내용 "'+BW[id]+'"',!!RW[id]&&String(RW[id].t||'').indexOf(BW[id])>=0,RW[id]&&RW[id].t));

// 5. 역연결(조문 → 작업)
const I=C.workIdx(D);
const has=(k,w,hs)=>(I[k]||[]).some(x=>x.w===w&&(hs===undefined||x.hs===hs));
chk('역연결 규칙 제183조 → 지게차 하나',(I['RULE:제183조']||[]).length===1&&has('RULE:제183조','forklift'));
chk('역연결 규칙 제171조 → 지게차·고소작업대',(I['RULE:제171조']||[]).length===2&&has('RULE:제171조','forklift')&&has('RULE:제171조','aerial'));
chk('역연결 규칙 제178조(지게차 허용하중) → 지게차만',(I['RULE:제178조']||[]).length===1&&has('RULE:제178조','forklift'));
chk('역연결 규칙 제38조 → 제1항제2호 지게차',has('RULE:제38조','forklift','제1항제2호'));
chk('역연결 규칙 제38조 → 제1항제1호 크레인',has('RULE:제38조','crane','제1항제1호'));
chk('역연결 규칙 제38조 → 7개 작업(항타기 제3항 포함)',(I['RULE:제38조']||[]).length===7&&has('RULE:제38조','pile','제3항')&&has('RULE:제38조','demol','제1항제10호'),(I['RULE:제38조']||[]).map(x=>x.n));
chk('역연결 규칙 제35조 → 13개 작업',(I['RULE:제35조']||[]).length===13,(I['RULE:제35조']||[]).map(x=>x.n));
chk('역연결 시행령 제78조 → 7개 작업',['crane','aerial','conveyor','press','robot','injection','roller'].every(w=>has('SD:제78조',w))&&(I['SD:제78조']||[]).length===7);
chk('역연결 시행령 제77조 → 크레인·화기·컨베이어·로봇·롤러기·연삭기',['crane','hotwork','conveyor','robot','roller','grinder'].every(w=>has('SD:제77조',w))&&(I['SD:제77조']||[]).length===6);
chk('역연결 규칙 제42조 → 사다리 제4항·추락 방지',has('RULE:제42조','ladder','제4항')&&has('RULE:제42조','fall'));
chk('역연결 규칙 제40조 → 지게차·크레인·굴착·항타기 호별',has('RULE:제40조','forklift','제1항제2호')&&has('RULE:제40조','crane','제1항제1호')&&has('RULE:제40조','excav','제1항제3호')&&has('RULE:제40조','pile','제1항제4호'));
chk('역연결 법 제119조 → 해체',has('OSH:제119조','demol'));
chk('역연결 시행규칙 제98조 → 지게차 제1항제5호',has('SR:제98조','forklift','제1항제5호'));
Object.keys(I).forEach(k=>chk('역연결 키 실재 '+k,!!D.byKey[k]));

// 6. 검색어 → 작업
const Q=[['지게차','forklift'],['지게차 작업계획서','forklift'],['아시바','scaffold'],['말비계','scaffold'],['밀폐공간','confined'],['질식','confined'],['타워크레인','crane'],['카고크레인','crane'],['고소작업대','aerial'],['포클레인','excav'],['흙막이','excav'],['용접','hotwork'],['화재감시자','hotwork'],['동바리','formwork'],['감전','electric'],['컨베이어','conveyor'],['사다리','ladder'],['이동식 사다리','ladder'],['추락','fall'],['개구부','fall'],['철골','steel'],['철거','demol'],['해체','demol'],['비계 해체','scaffold'],['거푸집 해체','formwork'],['항타기','pile'],['프레스','press'],['로봇','robot'],['사출기','injection'],['롤러기','roller'],['그라인더','grinder'],['연삭숫돌','grinder']];
Q.forEach(([q,w])=>{ const r=C.workOf(D,q); chk('검색어 "'+q+'" → '+w,!!r&&r.id===w,r&&r.id); });
['안전교육','휴게시간','MSDS','위험성평가',''].forEach(q=>chk('검색어 "'+q+'" → 작업 없음',C.workOf(D,q)===null));

// 6-2. 항 단위 발췌(④ → 그 항의 호·목까지)
chk('workLines 제42조 ④ → 호 7개·목 3개 포함',C.workLines(D.byKey['RULE:제42조'].x,['④']).length===11,C.workLines(D.byKey['RULE:제42조'].x,['④']).length);
chk('workLines 제38조 ③ → 한 줄(④ 제외)',C.workLines(D.byKey['RULE:제38조'].x,['③']).length===1);
chk('workLines 시행령 제74조 가. 프레스 → 기계·방호장치 2줄',C.workLines(D.byKey['SD:제74조'].x,['가. 프레스']).length===2);

// 7. 교육시간 문구(2026-10-17 데이터 오류 수정): 특별교육 '단기간·간헐적 2시간 이상' 끝까지
D.eduTime.filter(x=>x.c==='특별교육').forEach(x=>chk('특별교육 시간 문구 끝 "이상" ('+x.s+(x.w?' · '+x.w.slice(0,20):'')+')',/이상(\))?$/.test(x.t),x.t));
const sup=D.eduTime.find(x=>x.s==='관리감독자'&&x.c==='특별교육');
chk('관리감독자 특별교육 단기간·간헐적 2시간 이상 포함(시행규칙 별표4 제1호의2)',!!sup&&/단기간 작업 또는 간헐적 작업인 경우에는 2시간 이상$/.test(sup.t),sup&&sup.t);
D.items.forEach(it=>(it.edu||[]).forEach(x=>{ if(x.c==='특별교육')chk('주요 의무 '+it.id+' 특별교육 시간 끝 "이상"',/이상(\))?$/.test(x.t),x.t); }));

console.log(fail?('실패 '+fail+'건 / '+cnt+'건'):('전체 통과 '+cnt+'건')); process.exit(fail?1:0);
