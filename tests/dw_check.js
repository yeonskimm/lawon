// 법ON 가사근로자의 고용개선 등에 관한 법률(가사근로자법)·시행령·시행규칙 수록 검사(2026-10-22, 작업안내 5-59)
// 사용: node tests/dw_check.js index.html — 기대값은 법제처 원문(기준본 tools/law_snapshot/DW·DWD·DWR, 한국법MCP 확인) 기준
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue,judgeArt})',{});
let fail=0,n=0; const ok=(name,c,x)=>{n++; if(!c)fail++; console.log((c?'PASS ':'FAIL ')+name+(c?'':'  → '+JSON.stringify(x)));};
const R=JSON.parse(raw), L=R.meta.laws||{}, N='가사근로자의 고용개선 등에 관한 법률';
const D=C.prepare(C.applyDue(JSON.parse(raw),'2026-10-22'));
const A=c=>D.arts.filter(e=>e.l===c), g=k=>D.byKey[k], nz=s=>(s||'').replace(/\s+/g,''), has=(k,s)=>!!g(k)&&nz(g(k).x).includes(nz(s));
// 1) 법령 정보·위치
ok('법령 이름 정식, 짧은 이름은 법제처 약칭 가사근로자법',L.DW&&L.DW.name===N&&L.DW.short==='가사근로자법'&&L.DWD.short==='가사근로자법 시행령'&&L.DWR.short==='가사근로자법 시행규칙');
ok('일반 법령',!L.DW.proc&&!L.DW.now&&!L.DW.nj);
ok('법령 순서: 건설근로자법 시행규칙 다음',(k=>k.indexOf('DW')===k.indexOf('CWR')+1&&k.indexOf('DWR')===k.indexOf('CWR')+3)(Object.keys(L)));
ok('근로기준 분야: 건설근로자법 다음, 감독관 집무규정 앞',html.includes("'CW','CWD','CWR','DW','DWD','DWR','GAM'"));
// 2) 조문 수·원문
ok('법 28·시행령 12·시행규칙 8개 조',A('DW').length===28&&A('DWD').length===12&&A('DWR').length===8,[A('DW').length,A('DWD').length,A('DWR').length]);
ok('법 제15조 최소근로시간 주 15시간 이상',has('DW:제15조','최소근로시간은 1주일에 15시간 이상이어야 한다'));
ok('법 제6조 가사사용인으로 보지 않음·근기법 일부 적용 제외',has('DW:제6조','가사(家事) 사용인으로 보지 아니하고')&&has('DW:제6조','「근로기준법」 제17조, 제54조'));
ok('시행령 제2조 인증 요건 가사근로자 5명 이상 상시 고용',has('DWD:제2조','가사근로자를 5명 이상 상시 고용하고 있거나 고용할 예정일 것'));
// 3) 벌칙·과태료(원문 제26·28조)
const S=k=>(g(k).s||[]).map(z=>z.kind+':'+z.basis+':'+z.amt).join('|');
ok('제16조 → 제26조제1항 2년·2천만',S('DW:제16조')==='벌칙:제26조제1항:2년 이하의 징역 또는 2천만원 이하의 벌금');
ok('제9조·제24조 → 제26조제2항 1년·1천만',S('DW:제9조')==='벌칙:제26조제2항:1년 이하의 징역 또는 1천만원 이하의 벌금'&&S('DW:제24조')===S('DW:제9조'));
ok('제14조 → 제26조제3항제2호 500만원 벌금',S('DW:제14조')==='벌칙:제26조제3항제2호:500만원 이하의 벌금');
ok('제7조 → 사칭 벌칙(제26조제3항제1호)·변경인증 과태료(제28조제1항제1호)',S('DW:제7조')==='벌칙:제26조제3항제1호:500만원 이하의 벌금|과태료:제28조제1항제1호:500만원 이하');
ok('제11·12·22조 → 제28조제1항제2·3·4호 500만',S('DW:제11조')==='과태료:제28조제1항제2호:500만원 이하'&&S('DW:제12조')==='과태료:제28조제1항제3호:500만원 이하'&&S('DW:제22조')==='과태료:제28조제1항제4호:500만원 이하');
ok('제10·19·21조 → 제28조제2항제1·2·3호 300만',S('DW:제10조')==='과태료:제28조제2항제1호:300만원 이하'&&S('DW:제19조')==='과태료:제28조제2항제2호:300만원 이하'&&S('DW:제21조')==='과태료:제28조제2항제3호:300만원 이하');
ok('제재가 붙은 조문 11개',A('DW').filter(e=>e.s&&e.s.length).length===11);
// 과태료 금액 — 시행령 별표 2
const F=k=>(g(k).fn||[]).map(f=>f.b+'>'+f.rows.map(r=>r.a.join('/')).join(';')).join('|');
ok('변경인증 300·변경신고 250',F('DW:제7조')==='제28조제1항제1호>300/300/300;250/250/250');
ok('이용계약 미체결 300·400·500, 포함사항 누락 250',F('DW:제11조')==='제28조제1항제2호>300/400/500;250/250/250');
ok('아동 보호ㆍ양육 결격 500, 휴업ㆍ폐업 미신고 150',F('DW:제12조')==='제28조제1항제3호>500/500/500'&&F('DW:제10조')==='제28조제2항제1호>150/150/150');
ok('출입ㆍ검사 500, 진술ㆍ보고 300·400·500',F('DW:제22조')==='제28조제1항제4호>500/500/500;300/400/500;300/400/500');
ok('정보·자료 제출 150·200·300, 거짓 200·250·300',F('DW:제19조')==='제28조제2항제2호>150/200/300;200/250/300'&&F('DW:제21조')==='제28조제2항제3호>150/200/300;200/250/300');
ok('과태료 안내(별표 2·최근 1년)',/시행령 별표 2/.test((R.fineNote||{}).DW||'')&&/최근 1년/.test(R.fineNote.DW));
// 4) 적용 범위 안내(인원 밖) — 인증 가사서비스 제공기관
ok('인원 기준 없음',A('DW').every(e=>!e.min));
ok('적용 범위 안내 10개 조(제4·9~17조)',A('DW').filter(e=>e.jn).map(e=>e.no).join()==='제4조,제9조,제10조,제11조,제12조,제13조,제14조,제15조,제16조,제17조');
{ const j=C.judgeArt(g('DW:제16조'),{n:3}); ok('적용 판단: 인증받은 가사서비스 제공기관 안내',j.st==='apply'&&/인증받은 가사서비스 제공기관/.test(j.why)&&/근로기준법 제11조/.test(j.why),j); }
// 5) 2027-06-10 개정 예정(법률 제21784호 근로기준법 부칙): 제6조제2항
const c6=R.arts.find(e=>e.l==='DW'&&e.no==='제6조').chg;
ok('제6조 2027-06-10 개정 예정(제21784호 근로기준법 부칙)',c6&&c6.date==='2027-06-10'&&/제21784호/.test(c6.note)&&/근로기준법/.test(c6.note)&&nz(c6.x).includes(nz('제4항부터 제6항까지를 적용하지 아니하고')));
ok('그 밖의 조문은 개정 예정 없음',R.arts.filter(e=>/^DW/.test(e.l)&&e.chg).length===1);
// 6) 하위법령 → 법 조문
const UP={'DWD:제2조':'제7조','DWD:제3조':'제13조','DWD:제4조':'제14조','DWD:제6조':'제15조','DWD:제7조':'제16조','DWD:제12조':'제28조','DWR:제4조':'제9조','DWR:제6조':'제11조','DWR:제7조':'제13조'};
for(const [k,up] of Object.entries(UP)){ const e=g(k); ok(k+' → 법 '+up,e&&e.pa&&e.pa.l==='DW'&&e.pa.no===up,e&&e.up); }
ok('모법 연결 없는 것 3개(목적 2·민감정보)',A('DWD').concat(A('DWR')).filter(e=>!e.up).map(e=>e.l+':'+e.no).join()==='DWD:제1조,DWD:제11조,DWR:제1조');
// 7) 별표: 시행령 별표 1 수록, 별표 2·시행규칙 서식 미수록
const T=R.bt.tabs.find(x=>x.id==='DWD1');
ok('시행령 별표 1(유급휴일·연차 산정기준) 수록',T&&T.law==='DWD'&&T.n==='1'&&T.kind==='doc'&&/1주일에 평균 1회 이상의 유급휴일/.test(T.blk[0].p)&&/15일의 유급휴가/.test(T.blk[0].p)&&/25일을 한도/.test(T.blk[0].p));
ok('계산식 ÷ 표기',T&&T.blk[0].p.includes('주 평균 실제 근로시간 ÷ 40시간) × 8시간'));
ok('법 제16조 조문 화면에도 별표 1 연결',R.bt.art['DW:제16조']&&R.bt.art['DW:제16조'][0].t==='DWD1');
ok('시행령 별표 2·시행규칙 서식 14(앱 미수록)',JSON.stringify(R.bt.miss.DWD)==='[["2","과태료의 부과기준","제12조 관련"]]'&&(R.bt.miss.DWR||[]).length===14&&R.bt.miss.DWR.every(x=>x[3]==='f'));
// 8) 검색
const LAB=['GK','GKD','GKR','MW','MWD','MWR','RET','RETD','RETR','WG','WGD','WGR','EQ','EQD','EQR','AG','AGD','AGR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','FW','FWD','TU','TUD','TUR','CW','CWD','CWR','DW','DWD','DWR','GAM','LIO','JPA','SPC','SPCR','ICR','QV','QVD','MWS'];
const K=q=>C.search(D,q,'',LAB,LAB).arts.map(e=>e.l+':'+e.no);
ok('가사사용인·가사도우미 → 근기법 제11조·이 법 제6조',K('가사사용인').slice(0,2).join()==='GK:제11조,DW:제6조'&&K('가사도우미').slice(0,2).join()==='GK:제11조,DW:제6조');
ok('최소근로시간 → 제15조, 입주도우미 → 제17조',K('최소근로시간')[0]==='DW:제15조'&&K('입주도우미')[0]==='DW:제17조');
ok('가사근로자법 16조 → 제16조만, 가사 근로자법 → 이 법',K('가사근로자법 16조').join()==='DW:제16조'&&K('가사 근로자법').every(k=>/^DW/.test(k)));
ok('기존 1위 유지: 연차 → 근기법 제60·61조, 유급휴일 → 제55조, 근로계약서 → 제17조, 결격사유 → 파견법 제8조',K('연차').slice(0,2).join()==='GK:제60조,GK:제61조'&&K('유급휴일')[0]==='GK:제55조'&&K('근로계약서')[0]==='GK:제17조'&&K('결격사유')[0]==='DISP:제8조');
ok('검색 점수 배수 0.6(접힌 구획 아님)',A('DW').concat(A('DWD'),A('DWR')).every(e=>e.sw===0.6));
console.log(fail?('실패 '+fail+'건 / '+n+'건'):'전체 통과 '+n+'건'); process.exit(fail?1:0);
