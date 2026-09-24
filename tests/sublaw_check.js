// 시행령·시행규칙 조문 수록 검사 — 사용: node tests/sublaw_check.js index.html
// 조문 수가 원문(법제처 내려받은 판)과 같은지, 모법 연결이 실제 조문을 가리키는지, 대표 조문의 연결이 맞는지
// 2026-09-24: 추가 법령(최임법·고평법·기간제법·파견법·근참법 시행령·시행규칙, 집무규정 2종, 노동감독관 직무집행법)
// 2026-09-24: 질서위반행위규제법·시행령 삭제(과태료 징수 담당 소관, 감독 현장 검색 수요 낮음),
//             감독 조치기준(집무규정 별표) 연결, 과태료 금액(시행령 별표) 표본
const fs=require('fs'); const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const D=JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g,'</'));
const EXPECT={GKD:75,GKR:21,SD:125,SR:252,RETD:79,RETR:18,MWD:26,MWR:7,EQD:39,EQR:25,FTD:7,FTR:2,DISPD:10,DISPR:21,LMCD:11,GAM:87,OAM:50,LIO:43,TU:105,TUD:56,TUR:28,LIC:12};   // 원문 조문 수(삭제 조문 제외)
const LINK=[['GKD:제7조의2','GK:제11조'],['GKD:제30조','GK:제55조'],['GKD:제33조','GK:제60조'],['GKD:제27조의2','GK:제48조'],['GKR:제15조','GK:제93조'],['GKR:제6조','GK:제33조'],
  ['SD:제16조','OSH:제17조'],['SD:제52조','OSH:제62조'],['SR:제26조','OSH:제29조'],['SR:제67조','OSH:제54조'],['SR:제37조','OSH:제36조'],['SR:제194조의2','OSH:제128조의2'],['RETD:제3조','RET:제8조'],['RETD:제42조','RET:제48조'],['RETR:제2조','RET:제13조'],
  ['MWR:제3조','MW:제7조'],['MWD:제5조','MW:제6조'],['EQR:제14조의2','EQ:제19조'],['EQD:제12조','EQ:제19조'],['FTD:제2조','FT:제3조'],['DISPD:제2조','DISP:제5조'],['DISPR:제3조의2','DISP:제7조'],['LMCD:제2조','LMC:제4조'],['LMCD:제11조','LMC:제33조'],['TUD:제22조의2','TU:제42조의2'],['LIC:제3조','OSH:제140조'],['LIC:제7조','OSH:제140조']];
const ACT=[['GK:제26조','GAM3'],['GK:제43조','GAM3'],['MW:제6조','GAM3'],['LMC:제4조','GAM4'],['OSH:제38조','OAM2'],['RULE:제4조','OAM2'],['TU:제81조','GAM4'],['TU:제31조','GAM4']];
const FINE=[['FT:제17조','제24조제2항제2호'],['DISP:제6조의2','제46조제2항'],['MW:제11조','제31조제1항제1호'],['LMC:제18조','제33조제1항'],['TU:제13조','제96조제2항'],['TU:제14조','제96조제1항제1호']];
const by={}; D.arts.forEach(e=>by[e.l+':'+e.no]=e); let fail=0;
const ok=(n,c,i)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':'  → '+i)); if(!c)fail++;};
for(const [k,n] of Object.entries(EXPECT)){ const a=D.arts.filter(e=>e.l===k); ok(k+' 조문 '+n+'개',a.length===n,a.length);
  ok(k+' 법령 정보',!!D.meta.laws[k],'');
  const bad=a.filter(e=>(e.up||[]).some(u=>!by[u])); ok(k+' 모법 연결이 모두 실제 조문',!bad.length,bad.map(e=>e.no).join(','));
  const dup=a.map(e=>e.no).filter((x,i,s)=>s.indexOf(x)!==i); ok(k+' 조문 번호 중복 없음',!dup.length,dup.join(','));
  const empty=a.filter(e=>!e.x||!e.x.trim()); ok(k+' 빈 조문 없음',!empty.length,empty.map(e=>e.no).join(',')); }
for(const [s,p] of LINK){ const e=by[s]; ok(s+' → '+p,e&&(e.up||[])[0]===p,e&&e.up); }
const rowById={}; D.bt.rows.forEach(r=>rowById[r.id]=r);
for(const [k,tb] of ACT){ const L=(D.bt.act&&D.bt.act[k])||[]; ok(k+' 조치기준 '+tb, L.some(id=>rowById[id]&&rowById[id].tb===tb), L.join(',')); }
const badAct=Object.entries(D.bt.act||{}).filter(([k,L])=>!by[k]||L.some(id=>!rowById[id])); ok('조치기준 연결이 모두 실제 조문·별표 줄',!badAct.length,badAct.map(x=>x[0]).join(','));
for(const [k,b] of FINE){ const e=by[k]; ok(k+' 과태료 금액 '+b, e&&(e.fn||[]).some(x=>x.b===b&&x.rows.length), e&&JSON.stringify(e.fn)); }
// 2026-09-24: 별표 26개 추가(법제처 현행 원문) — 별표별 줄 수, 근거 조문이 실제 조문인지, 조문 화면 연결
const BTEXP={"GR1": 9, "GR2": 9, "GD4": 20, "GD2": 16, "SD2": 35, "SD9": 22, "S2": 12, "SD3": 18, "SD5": 11, "SD4": 13, "SD6": 6, "SD20": 6, "SD21": 25, "SD26": 38, "SD13": 51, "S3": 30, "S21_2": 15, "S4": 29, "S6": 48, "S7": 53, "S10": 24, "S25": 23, "S24": 183, "R14": 11, "R15": 3, "R17": 9};
const tabBy={}; D.bt.tabs.forEach(T=>tabBy[T.id]=T);
for(const [id,n] of Object.entries(BTEXP)){ const T=tabBy[id]; const m=T?T.secs.reduce((a,x)=>a+x.rows.length,0):-1;
  ok('별표 '+id+' 줄 '+n+'개', m===n, m); if(T) ok('별표 '+id+' 근거 조문 실재', T.arts.every(a=>by[a[0]+':'+a[1]]), JSON.stringify(T.arts)); }
for(const [k,id] of [['GKR:제4조','GR1'],['GK:제26조','GR1'],['GK:제65조','GR2'],['SD:제16조','SD3'],['OSH:제17조','SD3'],['SR:제194조의2','S21_2'],['RULE:제598조','R14']])
  ok(k+' → 별표 '+id, (D.bt.art[k]||[]).some(v=>v.t===id), JSON.stringify(D.bt.art[k]));
console.log(fail?'실패 '+fail+'건':'전체 통과'); process.exit(fail?1:0);
