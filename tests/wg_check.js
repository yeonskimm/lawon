// 법ON 임금채권보장법·시행령·시행규칙 수록 검사(2026-10-22, 작업안내 5-55) — 사용: node tests/wg_check.js index.html
// 기대값은 법제처 원문(기준본 tools/law_snapshot/WG·WGD·WGR, 한국법MCP 확인) 기준: 조문 수·핵심 문구·벌칙·과태료 금액(시행령 별표 3)·모법 연결·개정 예정·서식, 검색
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue,judgeArt})',{});
let fail=0,n=0; const ok=(name,c,x)=>{n++; if(!c)fail++; console.log((c?'PASS ':'FAIL ')+name+(c?'':'  → '+JSON.stringify(x)));};
const R=JSON.parse(raw), L=R.meta.laws||{};
const D=C.prepare(C.applyDue(JSON.parse(raw),'2026-10-22'));
const A=c=>D.arts.filter(e=>e.l===c), g=k=>D.byKey[k], nz=s=>(s||'').replace(/\s+/g,'');
const has=(k,s)=>!!g(k)&&nz(g(k).x).includes(nz(s));
// 1) 법령 정보·위치(근로기준 분야 퇴직급여법 다음)
ok('법령 이름 그대로(약칭 없음)',L.WG&&L.WG.short==='임금채권보장법'&&L.WGD&&L.WGD.name==='임금채권보장법 시행령'&&L.WGR&&L.WGR.name==='임금채권보장법 시행규칙');
ok('일반 법령(절차 법령·현행 고지 아님)',!L.WG.proc&&!L.WG.now&&!L.WG.nj&&!L.WG.sasu);
ok('법령 순서: 퇴직급여법 시행규칙 다음',(k=>k.indexOf('WG')===k.indexOf('RETR')+1&&k.indexOf('WGR')===k.indexOf('RETR')+3)(Object.keys(L)));
ok('근로기준 분야 법령: 퇴직급여법 다음',html.includes("'RET','RETD','RETR','WG','WGD','WGR','EQ'"));
ok('산업안전 분야 법령에는 없음',!/osh:\{[^\n]*'WG'/.test(html));
// 2) 조문 수(삭제 조문 제외)·원문 문구
ok('법 37·시행령 37·시행규칙 30개 조',A('WG').length===37&&A('WGD').length===37&&A('WGR').length===30,[A('WG').length,A('WGD').length,A('WGR').length]);
ok('삭제 조문 없음(법 제3조의2·제13조의2·제16조의2·제19조의2, 시행령 제4조·제25조의3, 시행규칙 제3·15·17조·제8조의5)',['WG:제3조의2','WG:제13조의2','WG:제16조의2','WG:제19조의2','WGD:제4조','WGD:제25조의3','WGR:제3조','WGR:제15조','WGR:제17조','WGR:제8조의5'].every(k=>!g(k)));
ok('법 제7조 퇴직 근로자 대지급금 — 체불 임금등ㆍ사업주 확인서(제1항제5호)',g('WG:제7조').t==='퇴직한 근로자에 대한 대지급금의 지급'&&has('WG:제7조','체불 임금등ㆍ사업주 확인서'));
ok('법 제7조의2 재직 근로자 대지급금 — 1회만',has('WG:제7조의2','하나의 사업에 근로하는 동안 1회만 지급'));
ok('법 제12조 체불 임금등의 확인 — 근로감독사무 처리과정',has('WG:제12조','근로감독사무 처리과정에서 확인된 체불 임금등ㆍ사업주 확인서'));
ok('법 제3조 적용 범위 — 산재보험법 제6조 사업',has('WG:제3조','「산업재해보상보험법」 제6조에 따른 사업'));
ok('시행령 제6조 도산대지급금·간이대지급금 정의',has('WGD:제6조','(이하 "도산대지급금"이라 한다)')&&has('WGD:제6조','(이하 "간이대지급금'));
// 3) 벌칙·과태료(원문 — 법 제27조의2·제28조·제30조)
const S=k=>(g(k).s||[]).map(z=>z.kind+':'+z.basis+':'+z.amt);
for(const k of ['WG:제7조','WG:제7조의2','WG:제7조의3']) ok(k+' → 제28조제1항(3년·3천만)·제2항(2년·2천만)',S(k).join('|')==='벌칙:제28조제1항:3년 이하의 징역 또는 3천만원 이하의 벌금|벌칙:제28조제2항:2년 이하의 징역 또는 2천만원 이하의 벌금',S(k));
ok('제23조의2 → 제27조의2제1호(10년·1억)',S('WG:제23조의2').join()==='벌칙:제27조의2제1호:10년 이하의 징역 또는 1억원 이하의 벌금');
ok('제23조의3 → 제27조의2제2호',S('WG:제23조의3').join()==='벌칙:제27조의2제2호:10년 이하의 징역 또는 1억원 이하의 벌금');
ok('제13·22·24조 → 제30조제1항 과태료 1천만원 이하',S('WG:제13조')[0]==='과태료:제30조제1항제1호의2:1천만원 이하'&&S('WG:제22조')[0]==='과태료:제30조제1항제2호:1천만원 이하'&&S('WG:제24조')[0]==='과태료:제30조제1항제3호:1천만원 이하');
ok('제28조 원문 — 부정한 방법 대지급금·융자, 거짓 보고·증명·서류제출',has('WG:제28조','거짓이나 그 밖의 부정한 방법으로 제7조ㆍ제7조의2에 따른 대지급금 또는 제7조의3에 따른 융자를 받은 자')&&has('WG:제28조','거짓의 보고ㆍ증명 또는 서류제출을 한 자'));
ok('제재가 붙은 조문은 8개뿐',A('WG').filter(e=>e.s&&e.s.length).length===8);
// 과태료 금액 — 시행령 별표 3 개별기준(거부 500만원·거짓 800만원)
const F=k=>(g(k).fn||[]).map(f=>f.b+':'+f.rows.map(r=>r.d+'='+r.a.join('/')).join(';')).join('|');
ok('재산목록(제13조) 500·800만원',F('WG:제13조')==='제30조제1항제1호의2:재산목록의 제출을 거부한 경우=500;거짓의 재산목록을 제출한 경우=800',F('WG:제13조'));
ok('보고·서류(제22조) 500·800만원',F('WG:제22조')==='제30조제1항제2호:보고나 관계 서류의 제출요구에 따르지 않은 경우=500;거짓 보고를 하거나 거짓 서류를 제출한 경우=800',F('WG:제22조'));
ok('검사·질문(제24조) 500·800만원',F('WG:제24조')==='제30조제1항제3호:질문에 답변을 거부한 경우=500;검사를 거부ㆍ방해 또는 기피한 경우=800',F('WG:제24조'));
ok('과태료 안내(부과기준 별표 3)',/임금채권보장법 시행령 별표 3/.test((R.fineNote||{}).WG||''));
// 4) 하위법령 → 법 조문(조문 내용으로 직접 정한 것 포함)
const UP={'WGD:제2조':'제6조','WGD:제3조':'제6조','WGD:제6조':'제7조','WGD:제8조':'제7조','WGD:제19조':'제13조','WGD:제20조의3':'제15조','WGD:제21조':'제16조','WGD:제22조':'제20조','WGD:제26조':'제30조',
  'WGR:제2조':'제7조','WGR:제4조':'제7조','WGR:제8조의9':'제7조의3','WGR:제9조의2':'제12조','WGR:제10조':'제13조'};
for(const [k,up] of Object.entries(UP)){ const e=g(k); ok(k+' → 법 '+up,e&&e.pa&&e.pa.l==='WG'&&e.pa.no===up,e&&e.up); }
ok('하위법령 모법 연결 없는 것은 4개(목적 2·고유식별정보·서식)',A('WGD').concat(A('WGR')).filter(e=>!e.up).map(e=>e.l+':'+e.no).join()==='WGD:제1조,WGD:제25조의2,WGR:제1조,WGR:제16조');
// 5) 개정 예정
const ch=k=>R.arts.find(e=>e.l+':'+e.no===k).chg;
ok('법 제25조 2026-12-08 근로감독관 → 노동감독관',ch('WG:제25조')&&ch('WG:제25조').date==='2026-12-08'&&/노동감독관에게 신고/.test(ch('WG:제25조').x));
ok('시행령 제20조의3 2027-01-01(대통령령 제36751호)',ch('WGD:제20조의3')&&ch('WGD:제20조의3').date==='2027-01-01'&&/제36751호/.test(ch('WGD:제20조의3').note));
ok('그 밖의 조문은 개정 예정 없음',R.arts.filter(e=>/^WG/.test(e.l)&&e.chg).length===2);
// 6) 앱 미수록 별표·서식
const M=R.bt.miss||{};
ok('시행령 별표(앱 미수록)는 3만(별표 1은 수록)',JSON.stringify(M.WGD)==='[["3","과태료의 부과기준","제26조 관련"]]');
{ const T=R.bt.tabs.find(t=>t.id==='WGD1'), rows=R.bt.rows.filter(r=>r.tb==='WGD1'), all=nz(rows.map(r=>r.t).join(''));
  ok('시행령 별표 1 수록 — 제목·관련 조문·연결',T&&T.law==='WGD'&&T.n==='1'&&T.t==='상시근로자수의 산정방법'&&T.rel==='제5조제1항 관련'&&JSON.stringify(T.arts)==='[["WGD","제5조"]]',T);
  ok('별표 1 원문 — 최종 6개월 연인원 ÷ 사업 일수',all.includes(nz('최종 6개월(1개월 중 하루라도 사업을 한 경우 그 달을 포함한 최종 6개월을 말한다) 동안 사용한 근로자의 연인원을 같은 기간 중에 사업을 한 일수로 나눈 수')));
  ok('별표 1 원문 — 건설업 계산식·공사실적액·노무비율·월평균보수',all.includes(nz('전년도 공사 실적액 × 전년도 노무비율'))&&all.includes(nz('적법하게 하도급된 부분의 공사실적액을 제외한 금액'))&&all.includes(nz('고용산재보험료징수법 제13조제6항'))&&all.includes(nz('제2조제1항제3호가목 단서')));
  ok('별표 1 줄 6개·블록 위치',rows.length===6&&rows.every((r,i)=>r.bi===0&&r.ln[0]===i&&r.ln[1]===i+1));
  ok('시행령 제5조 본문 별표 1 → 앱 별표',has('WGD:제5조','별표 1')); }
ok('시행규칙 서식 26개·PDF',(M.WGR||[]).length===26&&M.WGR.every(x=>x[3]==='f'&&/^https:\/\/www\.law\.go\.kr\/LSW\/flDownload\.do\?flSeq=\d+$/.test(x[4])));
ok('별표 검색용 법령 정보(영·규)',R.bt.laws.WGD&&R.bt.laws.WGD.typ==='영'&&R.bt.laws.WGR&&R.bt.laws.WGR.typ==='규');
// 7) 검색
const LAB=['GK','GKD','GKR','MW','MWD','MWR','RET','RETD','RETR','WG','WGD','WGR','EQ','EQD','EQR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','FW','FWD','TU','TUD','TUR','GAM','LIO','JPA','SPC','SPCR','ICR','QV','QVD','MWS'];
const K=q=>C.search(D,q,'',LAB,LAB).arts.map(e=>e.l+':'+e.no);
ok('체당금 → 법 제7조 1위(옛말)',K('체당금')[0]==='WG:제7조',K('체당금').slice(0,3));
ok('소액체당금 → 법 제7조 1위',K('소액체당금')[0]==='WG:제7조',K('소액체당금').slice(0,3));
ok('간이대지급금 → 법 제7조·제7조의2 먼저',K('간이대지급금').slice(0,2).join()==='WG:제7조,WG:제7조의2',K('간이대지급금').slice(0,3));
ok('체불확인서 → 법 제12조 1위',K('체불확인서')[0]==='WG:제12조',K('체불확인서').slice(0,3));
ok('대지급금 → 법 제7조 1위',K('대지급금')[0]==='WG:제7조');
ok('임채법 7조 → 법 제7조만',K('임채법 7조').join()==='WG:제7조',K('임채법 7조'));
{ const r=C.search(D,'임금채권 보장법','',LAB,LAB); ok('임금채권 보장법(띄어쓰기) → 이 법 3개(104개 조)',r.total===104&&r.arts.every(e=>/^WG/.test(e.l)),r.total); }
ok('체당금 용어 안내에 앱 미수록 문구 없음',!/앱 미수록/.test((R.syn['체당금']||{}).note||''));
ok('임금체불 → 근기법 제43조 그대로 상위',K('임금체불').slice(0,2).includes('GK:제43조'),K('임금체불').slice(0,3));
// 8) 적용 판단: 일반 법령(규모와 관계없이)
const j=C.judgeArt(g('WG:제7조'),{n:3,amt:null,ind:'',ov:null}); ok('적용 판단 — 인원으로 제외하지 않음',j&&j.st!=='na',j);
console.log(fail?('실패 '+fail+'건 / '+n+'건'):'전체 통과 '+n+'건'); process.exit(fail?1:0);
