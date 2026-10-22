// 법ON 질서위반행위규제법·시행령 수록 검사(2026-10-22, 작업안내 5-54) — 사용: node tests/qv_check.js index.html
// 기대값은 법제처 원문(기준본 tools/law_snapshot/QV·QVD, 한국법MCP 확인) 기준: 조문 수·핵심 문구·모법 연결·제재·서식, 검색(절차 법령은 분야 법령 뒤)
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue,xrefs:typeof xrefs==="function"?xrefs:null})',{});
let fail=0,n=0; const ok=(name,c,x)=>{n++; if(!c)fail++; console.log((c?'PASS ':'FAIL ')+name+(c?'':'  → '+JSON.stringify(x)));};
const R=JSON.parse(raw), L=R.meta.laws||{};
const D=C.prepare(C.applyDue(JSON.parse(raw),'2026-10-22'));
const A=c=>D.arts.filter(e=>e.l===c), g=k=>D.byKey[k];
// 1) 법령 정보
ok('질서위반행위규제법 법령 정보(이름 그대로·절차 법령·현행 고지)',L.QV&&L.QV.name==='질서위반행위규제법'&&L.QV.short==='질서위반행위규제법'&&L.QV.proc===1&&L.QV.now===1&&L.QV.nj===1,L.QV);
ok('시행령 법령 정보',L.QVD&&L.QVD.name==='질서위반행위규제법 시행령'&&L.QVD.proc===1&&L.QVD.now===1,L.QVD);
ok('법령 순서: 수사준칙 다음 질서위반행위규제법·시행령',(k=>k.indexOf('QV')===k.indexOf('ICR')+1&&k.indexOf('QVD')===k.indexOf('ICR')+2)(Object.keys(L)));
ok('분야 법령(두 분야): 수사준칙 다음',html.includes("'ICR','QV','QVD','MWS']")&&html.includes("'ICR','QV','QVD','CSC'"));
// 2) 조문 수·원문 문구
ok('법 조문 61개(제1~57조·의2 포함, 삭제 없음)',A('QV').length===61,A('QV').length);
ok('시행령 조문 22개',A('QVD').length===22,A('QVD').length);
const has=(k,s)=>{const e=g(k); return !!e&&(e.x||'').replace(/\s+/g,'').includes(s.replace(/\s+/g,''));};
ok('법 제16조 사전통지·10일 이상 의견 제출 기한',has('QV:제16조','10일 이상의 기간을 정하여 의견을 제출'),g('QV:제16조')&&g('QV:제16조').x.slice(0,200));
ok('법 제18조 의견 제출 기한 이내 자진납부 감경',g('QV:제18조').t==='자진납부자에 대한 과태료 감경'&&has('QV:제18조','의견 제출 기한 이내에 과태료를 자진하여 납부'));
ok('법 제20조 이의제기 60일',has('QV:제20조','60일 이내에 해당 행정청에 서면으로 이의제기'));
ok('법 제19조 제척기간 5년',has('QV:제19조','5년이 경과한 경우에는 해당 질서위반행위에 대하여 과태료를 부과할 수 없다'));
ok('시행령 제5조 자진납부 감경 100분의 20',has('QVD:제5조','100분의 20의 범위 이내'));
ok('시행령 제2조의2 과태료 감경(100분의 50)',has('QVD:제2조의2','100분의 50의 범위'));
// 3) 시행령 → 모법 조문
const UP={'제2조':'제2조','제2조의2':'제16조','제3조':'제16조','제4조':'제17조','제5조':'제18조','제6조':'제22조','제7조의2':'제24조의3','제9조':'제46조','제11조':'제52조','제13조':'제54조','제14조':'제55조'};
for(const [no,up] of Object.entries(UP)){ const e=g('QVD:'+no); ok('시행령 '+no+' → 법 '+up,e&&e.pa&&e.pa.l==='QV'&&e.pa.no===up,e&&e.up); }
ok('시행령 제1·8·15조는 모법 연결 없음(특정 조문 인용 없음)',['제1조','제8조','제15조'].every(no=>!g('QVD:'+no).up));
ok('법 제18조 아래 시행령 제5조',(D.dn['QV:제18조']||[]).some(e=>e.l==='QVD'&&e.no==='제5조'));
// 4) 제재: 제22조제2항 검사 거부 → 제57조제1항 500만원 이하(원문)
const s22=g('QV:제22조').s||[];
ok('법 제22조 → 제57조제1항 과태료 500만원 이하',s22.length===1&&s22[0].kind==='과태료'&&s22[0].basis==='제57조제1항'&&s22[0].amt==='500만원 이하',s22);
ok('제57조 원문이 제22조제2항 검사 거부 500만원',has('QV:제57조','제22조제2항에 따른 검사를 거부ㆍ방해 또는 기피한 자에게는 500만원 이하의 과태료'));
ok('그 밖의 조문은 제재 없음',A('QV').filter(e=>e.s&&e.s.length).length===1);
// 5) 개정 예정: 제25조 2028. 3. 1.(법률 제21460호)
const c25=R.arts.find(e=>e.l==='QV'&&e.no==='제25조').chg;
ok('법 제25조 2028-03-01 개정 예정',c25&&c25.date==='2028-03-01'&&/제21460호/.test(c25.note)&&/해사국제상사법원/.test(c25.x),c25);
ok('meta.pending에 2028-03-01',R.meta.pending.includes('2028-03-01'));
ok('그 밖의 조문은 개정 예정 없음',R.arts.filter(e=>(e.l==='QV'||e.l==='QVD')&&e.chg).length===1);
// 6) 시행령 서식(앱 미수록) 6개 — 법제처 서식 파일(PDF)
const ms=(R.bt.miss||{}).QVD||[];
ok('시행령 서식 6개·PDF 주소',ms.length===6&&ms.every(x=>x[3]==='f'&&/^https:\/\/www\.law\.go\.kr\/LSW\/flDownload\.do\?flSeq=\d+$/.test(x[4])),ms.map(x=>x[0]));
ok('서식 제3호 약식재판 이의신청서 — 시행령 제9조 관련',ms[2]&&ms[2][1]==='약식재판에 대한 이의신청서'&&ms[2][2]==='제9조 관련',ms[2]);
// 7) 검색: 절차 법령은 분야 법령 조문 뒤, 법령 이름을 넣으면 그 법
const LAB=['GK','GKD','GKR','MW','MWD','MWR','RET','RETD','RETR','EQ','EQD','EQR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','FW','FWD','TU','TUD','TUR','GAM','LIO','JPA','SPC','SPCR','ICR','QV','QVD','MWS'];
const OSH=['OSH','SD','SR','RULE','LIC','SAPA','SAPAD','OAM','LIO','JPA','SPC','SPCR','ICR','QV','QVD','CSC','RAG','EDU','CSL','HRS','HRC','HRP','PSM','GRD','SCP','SIP','MSD'];
const S=(q,f)=>C.search(D,q,'',f,f), K=r=>r.arts.map(e=>e.l+':'+e.no);
const own=(q,f)=>K(S(q,f)).filter(k=>f.includes(k.split(':')[0]));
ok('자진납부 → 분야 조문 1위 법 제18조',own('자진납부',LAB)[0]==='QV:제18조',own('자진납부',LAB).slice(0,3));
ok('과태료 이의제기 → 법 제20조 3위 안(과태료 붙은 조문만 거르는 검색에서도 절차 법령은 나옴)',K(S('과태료 이의제기',LAB)).slice(0,3).includes('QV:제20조'),K(S('과태료 이의제기',LAB)).slice(0,4));
ok('과태료 사전통지 → 법 제16조 1위',K(S('과태료 사전통지',LAB))[0]==='QV:제16조',K(S('과태료 사전통지',LAB)).slice(0,3));
ok('과태료 → 근기법 제116조 1위 그대로(근로기준)',K(S('과태료',LAB))[0]==='GK:제116조');
ok('과태료 → 산안법 제175조 1위 그대로(산업안전)',K(S('과태료',OSH))[0]==='OSH:제175조');
{ const r=S('과태료',LAB), k=K(r), qi=k.findIndex(x=>/^QVD?:/.test(x)), oi=k.findIndex(x=>!LAB.includes(x.split(':')[0]));
  ok('과태료(근로기준): 절차 법령 조문은 다른 분야 조문보다도 뒤(결과 상한 안에서 밀어내지 않음)',qi>oi&&oi>=0,[qi,oi]);
  ok('과태료(근로기준): 분야 조문 수에 절차 법령 포함',r.inN===k.filter(x=>LAB.includes(x.split(':')[0])).length||r.inN>=k.filter(x=>LAB.includes(x.split(':')[0])).length,r.inN); }
ok('질서법 → 질서위반행위규제법 조문만',K(S('질서법',LAB)).every(k=>/^QVD?:/.test(k))&&K(S('질서법',LAB))[0]==='QV:제1조');
ok('질서위반행위 규제법 18조(띄어쓰기) → 제18조',K(S('질서위반행위 규제법 18조',LAB))[0]==='QV:제18조',K(S('질서위반행위 규제법 18조',LAB)).slice(0,2));
// 8) 인용 조문: 시행령 본문 '법 제N조' → 법 조문(약칭 인용)
if(C.xrefs){ const x=(C.xrefs(D,g('QVD:제3조'))||[]).map(z=>z.k); ok('시행령 제3조 본문 \'법 제18조\'·\'법 제20조\' → 앱 조문 연결(근거 법 조문 제16조는 제외)',x.includes('QV:제18조')&&x.includes('QV:제20조')&&!x.includes('QV:제16조'),x); }
ok('검색 안내 줄: 절차 법령 조문이 섞이면 \'과태료 절차 조문\' 표시',html.includes("' 조항이 있는 조문'+(pr?' · 과태료 절차 조문':'')"));
console.log(fail?('실패 '+fail+'건 / '+n+'건'):'전체 통과 '+n+'건'); process.exit(fail?1:0);
