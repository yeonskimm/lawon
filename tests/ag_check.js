// 법ON 고용상 연령차별금지 및 고령자고용촉진에 관한 법률(고령자고용법)·시행령·시행규칙 수록 검사(2026-10-22, 작업안내 5-57)
// 사용: node tests/ag_check.js index.html — 기대값은 법제처 원문(기준본 tools/law_snapshot/AG·AGD·AGR, 한국법MCP 확인) 기준
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue,judgeArt})',{});
let fail=0,n=0; const ok=(name,c,x)=>{n++; if(!c)fail++; console.log((c?'PASS ':'FAIL ')+name+(c?'':'  → '+JSON.stringify(x)));};
const R=JSON.parse(raw), L=R.meta.laws||{}, N='고용상 연령차별금지 및 고령자고용촉진에 관한 법률';
const D=C.prepare(C.applyDue(JSON.parse(raw),'2026-10-22'));
const A=c=>D.arts.filter(e=>e.l===c), g=k=>D.byKey[k], nz=s=>(s||'').replace(/\s+/g,''), has=(k,s)=>!!g(k)&&nz(g(k).x).includes(nz(s));
// 1) 법령 정보·위치
ok('법령 이름 정식, 짧은 이름은 법제처 약칭 고령자고용법(머리 제목 조 번호 안 잘림)',L.AG&&L.AG.name===N&&L.AG.short==='고령자고용법'&&L.AGD.name===N+' 시행령'&&L.AGD.short==='고령자고용법 시행령'&&L.AGR.short==='고령자고용법 시행규칙');
ok('일반 법령',!L.AG.proc&&!L.AG.now&&!L.AG.nj);
ok('법령 순서: 남녀고용평등법 시행규칙 다음',(k=>k.indexOf('AG')===k.indexOf('EQR')+1&&k.indexOf('AGR')===k.indexOf('EQR')+3)(Object.keys(L)));
ok('근로기준 분야: 남녀고용평등법 다음',html.includes("'EQ','EQD','EQR','AG','AGD','AGR','FT'"));
// 2) 조문 수·원문
ok('법 40·시행령 22·시행규칙 12개 조(삭제 제외)',A('AG').length===40&&A('AGD').length===22&&A('AGR').length===12,[A('AG').length,A('AGD').length,A('AGR').length]);
ok('법 제19조 정년 60세 이상 — 60세 미만이면 60세로 봄',g('AG:제19조').t==='정년'&&has('AG:제19조','근로자의 정년을 60세 이상으로 정하여야 한다')&&has('AG:제19조','정년을 60세로 정한 것으로 본다'));
ok('법 제19조는 벌칙·과태료 없음',!(g('AG:제19조').s||[]).length);
ok('법 제4조의4 모집·채용 등 5개 분야 연령차별 금지',has('AG:제4조의4','1. 모집ㆍ채용')&&has('AG:제4조의4','5. 퇴직ㆍ해고'));
ok('시행령 제2조 고령자 55세 이상·준고령자 50세 이상 55세 미만',has('AGD:제2조','55세 이상인 사람')&&has('AGD:제2조','50세 이상 55세 미만인 사람'));
// 3) 벌칙·과태료(원문 제23조의3·제24조)
const S=k=>(g(k).s||[]).map(z=>z.kind+':'+z.basis+':'+z.amt).join('|');
ok('제4조의4 → 제23조의3제2항 500만원 이하 벌금(모집·채용)',S('AG:제4조의4')==='벌칙:제23조의3제2항:500만원 이하의 벌금');
ok('제4조의9 → 제23조의3제1항 2년·1천만',S('AG:제4조의9')==='벌칙:제23조의3제1항:2년 이하의 징역 또는 1천만원 이하의 벌금');
ok('제4조의7 → 제24조제1항 3천만원 이하',S('AG:제4조의7')==='과태료:제24조제1항:3천만원 이하');
ok('제4조의8·제13조·제20조 → 제24조제2항 제1·2·3호',S('AG:제4조의8')==='과태료:제24조제2항제1호:500만원 이하'&&S('AG:제13조')==='과태료:제24조제2항제2호:500만원 이하'&&S('AG:제20조')==='과태료:제24조제2항제3호:500만원 이하');
ok('제23조 → 제24조제2항 제4호(보고)·제5호(검사)',S('AG:제23조')==='과태료:제24조제2항제4호:500만원 이하|과태료:제24조제2항제5호:500만원 이하');
ok('제재가 붙은 조문 7개',A('AG').filter(e=>e.s&&e.s.length).length===7);
ok('제23조의3·제24조 원문',has('AG:제23조의3','2년 이하의 징역 또는 1천만원 이하의 벌금')&&has('AG:제23조의3','500만원 이하의 벌금')&&has('AG:제24조','3천만원 이하의 과태료'));
// 과태료 금액 — 시행령 별표 2(개정 2011. 3. 30.)
const F=k=>(g(k).fn||[]).map(f=>f.b+'>'+f.rows.map(r=>r.a.join('/')).join(';')).join('|');
ok('시정명령 불이행 규모별 3,000·2,700·2,400·2,100·1,800만원',F('AG:제4조의7')==='제24조제1항>3000;2700;2400;2100;1800',F('AG:제4조의7'));
ok('고령자 고용현황 미제출 지연 기간·차수별',F('AG:제13조')==='제24조제2항제2호>100/200/300;200/300/400;300/400/500',F('AG:제13조'));
ok('정년제도 운영현황 미제출 같은 금액',F('AG:제20조')==='제24조제2항제3호>100/200/300;200/300/400;300/400/500');
ok('이행상황 제출요구·보고·검사 300만원',F('AG:제4조의8')==='제24조제2항제1호>300'&&F('AG:제23조')==='제24조제2항제4호>300|제24조제2항제5호>300');
ok('과태료 안내(별표 2·최근 3년 차수)',/시행령 별표 2/.test((R.fineNote||{}).AG||'')&&/최근 3년/.test(R.fineNote.AG));
// 4) 인원 기준(원문 상시근로자 수로 정한 것만)
ok('법 제12·13·20조 상시 300명 이상(영 제10·14조)',g('AG:제12조').min===300&&g('AG:제13조').min===300&&g('AG:제20조').min===300);
ok('영 제10·14조 원문 상시 300명 이상',has('AGD:제10조','상시 300명 이상의 근로자를 사용하는 사업장의 사업주')&&has('AGD:제14조','상시 300명 이상의 근로자를 사용하는 사업주'));
ok('재취업지원서비스(제21조의3)는 인원 표시 없음(피보험자 1천명 기준이라)',!g('AG:제21조의3').min&&has('AGD:제14조의2','피보험자 수의 평균이 1천명 이상'));
ok('그 밖의 조문은 인원 표시 없음',A('AG').filter(e=>e.min).length===3);
{ const j=C.judgeArt(g('AG:제21조의3'),{n:50}); ok('제21조의3 적용 판단: 피보험자 1천명 기준 안내(5-61)',j.st==='apply'&&/피보험자 수 평균 1천명 이상/.test(j.why)&&/제1항은 모든 사업주의 노력 의무/.test(j.why),j); }
{ const P=n=>({n,amt:null,ind:'',ov:null}); const j1=C.judgeArt(g('AG:제13조'),P(299)), j2=C.judgeArt(g('AG:제13조'),P(300)), j3=C.judgeArt(g('AG:제19조'),P(3));
  ok('적용 판단: 고용현황 제출 299명 대상 아님·300명 적용, 정년 3명 적용',j1.st==='na'&&j2.st==='apply'&&j3.st==='apply',[j1,j2,j3]);
  const j4=C.judgeArt(g('AGR:제10조'),P(100)); ok('시행규칙 제10조(고용현황 제출)는 법 제13조 판단을 따름(100명 대상 아님)',j4.st==='na',j4); }
// 5) 하위법령 → 법 조문
const UP={'AGD:제2조':'제2조','AGD:제3조':'제2조','AGD:제6조':'제6조','AGD:제10조':'제12조','AGD:제12조':'제16조','AGD:제13조':'제16조','AGD:제14조':'제20조','AGD:제14조의2':'제21조의3','AGD:제16조':'제24조','AGR:제10조':'제13조','AGR:제12조':'제16조','AGR:제13조':'제20조','AGR:제15조':'제23조'};
for(const [k,up] of Object.entries(UP)){ const e=g(k); ok(k+' → 법 '+up,e&&e.pa&&e.pa.l==='AG'&&e.pa.no===up,e&&e.up); }
ok('모법 연결 없는 것 4개(목적 2·고유식별정보·규제 재검토)',A('AGD').concat(A('AGR')).filter(e=>!e.up).map(e=>e.l+':'+e.no).join()==='AGD:제1조,AGD:제15조의2,AGD:제15조의3,AGR:제1조');
// 6) 앱 미수록 별표·서식
const M=R.bt.miss||{};
ok('시행령 별표 1·2(앱 미수록)',JSON.stringify(M.AGD)==='[["1","고령자인재은행 지정기준","제7조제1항 관련"],["2","과태료의 부과기준","제16조 관련"]]');
ok('시행규칙 [별표] 1·서식 9(삭제 서식 제외, PDF)',(M.AGR||[]).length===10&&M.AGR[0][0]===''&&M.AGR.slice(1).every(x=>x[3]==='f'&&/flSeq=\d+$/.test(x[4]))&&!M.AGR.some(x=>/삭제/.test(x[1])));
ok('서식 제7호 고령자 고용현황 및 정년 제도 운영 현황',M.AGR.some(x=>x[0]==='7'&&x[1]==='고령자 고용현황 및 정년 제도 운영 현황'));
// 7) 검색
const LAB=['GK','GKD','GKR','MW','MWD','MWR','RET','RETD','RETR','WG','WGD','WGR','EQ','EQD','EQR','AG','AGD','AGR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','FW','FWD','TU','TUD','TUR','GAM','LIO','JPA','SPC','SPCR','ICR','QV','QVD','MWS'];
const K=q=>C.search(D,q,'',LAB,LAB).arts.map(e=>e.l+':'+e.no);
ok('정년 → 법 제19조 1위',K('정년')[0]==='AG:제19조',K('정년').slice(0,3));
ok('나이차별·연령차별 → 법 제4조의4 1위',K('나이차별')[0]==='AG:제4조의4'&&K('연령차별')[0]==='AG:제4조의4');
ok('임금피크제 → 법 제19조의2 1위',K('임금피크제')[0]==='AG:제19조의2');
ok('고령자고용법 19조 → 법 제19조만',K('고령자고용법 19조').join()==='AG:제19조');
ok('연령차별 금지법(띄어쓰기) → 이 법',K('연령차별 금지법').length>0&&K('연령차별 금지법').every(k=>/^AG/.test(k)));
ok('해고 → 근기법 제23조 1위 그대로',K('해고')[0]==='GK:제23조');
console.log(fail?('실패 '+fail+'건 / '+n+'건'):'전체 통과 '+n+'건'); process.exit(fail?1:0);
