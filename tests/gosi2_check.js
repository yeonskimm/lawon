// 법ON 고시 10종 수록·앱 미수록 별표/서식·원문 연결 고시 7종 검사 — 사용: node tests/gosi2_check.js index.html  (2026-10-18, 5-37)
// 기대값은 법제처 국가법령정보 Open API 행정규칙 원문(2026-10-18 현행) 기준 — 코드가 아닌 원문에서 셈
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/<\\\//g,'</');
const core=h.slice(h.indexOf('/*CORE_START*/'),h.indexOf('/*CORE_END*/')+12);
const C=vm.runInNewContext(core+'\n;({prepare,search,splitQuery,ruleSanc,missOf:typeof missOf==="function"?missOf:null,glOf:typeof glOf==="function"?glOf:null,k9Of:typeof k9Of==="function"?k9Of:null})',{});
const D=C.prepare(JSON.parse(raw)), L=D.meta.laws, BT=D.bt; D.glink=D.glink||[];
let fail=0, n=0; const ok=(name,c,info)=>{ n++; if(!c){ fail++; console.log('FAIL '+name+(info===undefined?'':'  → '+JSON.stringify(info).slice(0,300))); } };
const A=k=>D.byKey[k]||{x:'',no:'',l:''}, arts=c=>D.arts.filter(e=>e.l===c);   // 없는 조문도 오류 없이 FAIL로

// 1. 수록 고시 10종 — 이름·조문 수(삭제 조문 제외, 조문 형식이 아닌 고시는 '본문' 1개)
const EXP={CSL:['건설공사 안전보건대장의 작성 등에 관한 고시',9],HRS:['유해·위험방지계획서 자체심사 및 확인업체 지정대상 건설업체 고시',1],
  HRC:['건설업 유해·위험방지계획서 중 지도사가 평가·확인 할 수 있는 대상 건설공사의 범위 및 지도사의 요건',1],
  HRP:['제조업 등 유해·위험방지계획서 제출·심사·확인에 관한 고시',15],PSM:['공정안전보고서의 제출·심사·확인 및 이행상태평가 등에 관한 규정',62],
  GRD:['위험기계·기구 방호조치 기준',23],SCP:['안전인증·자율안전확인신고의 절차에 관한 고시',29],SIP:['안전검사 절차에 관한 고시',12],
  MSD:['근골격계부담작업의 범위 및 유해요인조사 방법에 관한 고시',5],MWS:['최저임금법 제5조에 따른 단순노무직종 근로자 지정 고시',1]};
Object.keys(EXP).forEach(c=>{ const lw=L[c]; ok(c+' 수록·이름',lw&&lw.name===EXP[c][0]&&lw.gosi&&lw.adm,lw&&lw.name); ok(c+' 조문 수 '+EXP[c][1],arts(c).length===EXP[c][1],arts(c).length); });
['HRS','HRC','MWS'].forEach(c=>ok(c+' 조문 형식이 아닌 고시는 본문 1개',arts(c).length===1&&arts(c)[0].no==='본문'));
ok('PSM 제2조의2(적용 제외) 수록',!!D.byKey['PSM:제2조의2']);
ok('SCP 삭제 조문(제25조) 수록 안 함',!!L.SCP&&!D.byKey['SCP:제25조']);
// 원문 핵심 문구
ok('근골격계 고시 제3조: 11개 작업·단기간·간헐 제외',/단기간작업 또는 간헐적인 작업은 제외/.test(A('MSD:제3조').x)&&/^\s*11\.\s*하루에 총\s+2시간 이상 시간당 10회 이상/m.test(A('MSD:제3조').x)&&!/^\s*12\./m.test(A('MSD:제3조').x));
ok('단순노무직종 고시: 한국표준직업분류 대분류 9',/대분류 9\(단순노무 종사자\)/.test(A('MWS:본문').x));
ok('안전보건대장 고시 제3조: 총공사금액 50억원 이상',/총공사금액이 50억원 이상인 건설공사에 적용/.test(A('CSL:제3조').x));
ok('자체심사업체 고시: 시공능력평가액 순위 200위 이내',/200위 이내/.test(A('HRS:본문').x));
ok('방호조치 기준 제18조(지게차 방호장치) 헤드가드',/헤드가드/.test(A('GRD:제18조').x));

// 2. 분야·법령집 묶음
const FL=(f)=>{ const m=new RegExp(f+":\\{name:'[^']+',[^}]*first:\\[([^\\]]*)\\]").exec(h); return m?m[1].replace(/'/g,'').split(','):[]; };
ok('산업안전 분야에 고시 9종',['CSL','HRS','HRC','HRP','PSM','GRD','SCP','SIP','MSD'].every(c=>FL('osh').includes(c)),FL('osh'));
ok('근로기준 분야에 단순노무직종 고시',FL('labor').includes('MWS')&&!FL('osh').includes('MWS'));

// 3. 근거 조문·제재 연결(원문 조문이 정한 의무 주체·법 조항 기준)
const up=k=>(A(k).up||[])[0];
ok('안전보건대장 제5조 → 법 제67조, 과태료 제175조제4항제3호(제67조제1항)',up('CSL:제5조')==='OSH:제67조'&&A('CSL:제5조').rs&&A('CSL:제5조').rs.list[0].basis==='산업안전보건법 제175조제4항제3호'&&A('CSL:제5조').rs.fq==='제67조제1항');
ok('안전보건대장 제6·7조 → 제67조제1항·제2항',['CSL:제6조','CSL:제7조'].every(k=>A(k).rs&&A(k).rs.fq==='제67조제1항|제67조제2항'));
ok('제조업 계획서 제7조(작성자) → 제42조제2항 과태료 제175조제6항제4호',A('HRP:제7조').rs&&A('HRP:제7조').rs.list[0].basis==='산업안전보건법 제175조제6항제4호');
ok('제조업 계획서 제13조(이행확인) → 법 제43조',up('HRP:제13조')==='OSH:제43조'&&A('HRP:제13조').rs.fq==='제43조제1항');
ok('PSM 제4조 → 법 제44조 제1항 전단·제2항',up('PSM:제4조')==='OSH:제44조'&&A('PSM:제4조').rs.list.length===2);
ok('PSM 제15조(확인 요청) → 법 제46조제2항',up('PSM:제15조')==='OSH:제46조'&&A('PSM:제15조').rs.fq==='제46조제2항');
ok('PSM 심사(제7~14조·제41~53조) → 법 제45조, 이행평가(제54~59조) → 법 제46조, 제재 없음',['제7조','제14조','제41조','제53조'].every(n=>up('PSM:'+n)==='OSH:제45조'&&A('PSM:'+n).ns)&&['제54조','제58조'].every(n=>up('PSM:'+n)==='OSH:제46조'&&A('PSM:'+n).ns));
ok('PSM 제2조의2(적용 제외) → 시행령 제43조',up('PSM:제2조의2')==='SD:제43조');
ok('방호조치 기준 방호장치·설치방법 조문 → 법 제80조 벌칙(근거 조문 제재)',['제4조','제6조','제7조','제18조','제19조','제22조'].every(n=>up('GRD:'+n)==='OSH:제80조'&&!A('GRD:'+n).ns&&!A('GRD:'+n).rs));
ok('방호조치 기준 적용대상·정의 조문은 제재 없음',['제3조','제5조','제17조','제20조'].every(n=>A('GRD:'+n).ns));
ok('인증 절차 제20조(표시) → 제85조제1항·제90조제1항 과태료',A('SCP:제20조').rs&&A('SCP:제20조').rs.list.map(z=>z.qual).join()==='제85조제1항,제90조제1항');
ok('검사 절차 고시는 모두 제재 없음(검사기관 업무)',arts('SIP').every(e=>e.ns));
ok('근골격계 고시 제3조 → 규칙 제656조, 제4조 → 규칙 제658조',up('MSD:제3조')==='RULE:제656조'&&up('MSD:제4조')==='RULE:제658조');
ok('단순노무직종 고시 → 최임법 제5조',up('MWS:본문')==='MW:제5조');
const badUp=D.arts.filter(e=>EXP[e.l]&&e.up&&!D.byKey[e.up[0]]).map(e=>e.l+e.no); ok('근거 조문이 모두 앱에 있음',!badUp.length,badUp);
// rs.fq가 실제 과태료 부과기준 줄과 맞음
const rsBad=[]; D.arts.filter(e=>EXP[e.l]&&e.rs).forEach(e=>e.rs.list.forEach(z=>{ const no=/제\d+조(?:의\d+)?/.exec(z.qual)[0], a=A('OSH:'+no), re=new RegExp(e.rs.fq);
  if(!a||!(a.fn||[]).some(f=>('산업안전보건법 '+f.b)===z.basis&&re.test(f.t)))rsBad.push(e.l+e.no+' '+z.qual); })); ok('rs 부과기준 줄이 법 조문 과태료와 맞음',!rsBad.length,rsBad);
ok('ruleSanc: 제재 없음 조문 null, rs 조문은 rs',C.ruleSanc(D,A('PSM:제30조'))===null&&C.ruleSanc(D,A('CSL:제5조'))===A('CSL:제5조').rs);

// 4. 수록 별표(점검용 7개) — 원문 표 내용
const T=id=>BT.tabs.find(t=>t.id===id)||{blk:[{}]}, txt=id=>JSON.stringify(T(id).blk);
ok('수록 별표 7개',['HRP1','HRP2','PSM3','PSM4','SCP1','SCP2','SIP1'].every(id=>BT.tabs.some(t=>t.id===id)));
ok('안전인증 대상 크레인: 정격하중 0.5톤 이상(인증 절차 고시 별표 1)',/정격하중 0\.5톤 이상 크레인/.test(txt('SCP1')));
ok('안전검사 대상 크레인: 정격하중이 2톤 이상(검사 절차 고시 별표 1)',/정격하중이 2톤 이상은 적용/.test(txt('SIP1')));
ok('자율안전확인 대상 연삭기 휴대형 제외(별표 2)',/휴대형은/.test(txt('SCP2')));
ok('PSM 별표 4: 빈 기록란(A~E·평가근거) 칸은 싣지 않음, 3열',T('PSM4').blk.filter(b=>b.tb).every(b=>b.nc===3)&&!/평가근거/.test(txt('PSM4'))&&/12개 요소/.test(txt('PSM4')));
ok('PSM 별표 3: 배점 합계 표',/최고 실배점/.test(txt('PSM3')));
ok('별표 머리글([별표 N]·제목 줄)이 본문에 남지 않음',['HRP1','HRP2','SCP1','SCP2','SIP1'].every(id=>!/^\s*\[별표/.test((T(id).blk[0].p||''))));
ok('시행령 제74·77·78조 → 적용범위 별표',(BT.art['SD:제74조']||[]).some(v=>v.t==='SCP1')&&(BT.art['SD:제77조']||[]).some(v=>v.t==='SCP2')&&(BT.art['SD:제78조']||[]).some(v=>v.t==='SIP1'));
ok('법 제84·89·93조 → 적용범위 별표',(BT.art['OSH:제84조']||[]).some(v=>v.t==='SCP1')&&(BT.art['OSH:제89조']||[]).some(v=>v.t==='SCP2')&&(BT.art['OSH:제93조']||[]).some(v=>v.t==='SIP1'));
const rowName=BT.rows.filter(r=>r.tb==='SCP1').map(r=>r.t); ok('적용범위 별표 줄 이름은 기계 이름(번호 칸 아님)',rowName.includes('크레인')&&!rowName.includes('4'),rowName.slice(0,6));

// 5. 앱 미수록 별표·서식 목록(원문 별표단위 — 삭제 제외)
const M=c=>BT.miss[c]||[], F=c=>M(c).filter(x=>x[3]==='f');
ok('PSM 미수록: 별표 1(심사필) + 서식 24',M('PSM').filter(x=>!x[3]).map(x=>x[0]).join()==='1'&&F('PSM').length===24,M('PSM').length);
ok('PSM 서식 제17호의2~5·제19호의2 가지번호',['17의2','17의3','17의4','17의5','19의2'].every(n=>F('PSM').some(x=>x[0]===n)));
ok('안전보건대장 고시 서식 3(기본·설계·공사)',F('CSL').map(x=>x[1]).join()==='기본안전보건대장,설계안전보건대장,공사안전보건대장');
ok('근골격계 고시 서식 2(유해요인조사표·증상조사표)',F('MSD').length===2&&/유해요인조사표/.test(F('MSD')[0][1]));
ok('제조업 계획서 고시: 별표 3 + 서식 10',M('HRP').filter(x=>!x[3]).map(x=>x[0]).join()==='3'&&F('HRP').length===10);
ok('인증 절차 고시: 별표 3~7 + 서식 4',M('SCP').filter(x=>!x[3]).map(x=>x[0]).join()==='3,4,5,6,7'&&F('SCP').length===4);
ok('검사 절차 고시: 별표 2·3 + 서식 3',M('SIP').filter(x=>!x[3]).map(x=>x[0]).join()==='2,3'&&F('SIP').length===3);
ok('기존 고시 서식도 목록: 관리비 1·위평 6·교육규정 12',F('CSC').length===1&&F('RAG').length===6&&F('EDU').length===12);
ok('기존 고시 수록 별표는 미수록 목록에 없음',!M('CSC').some(x=>!x[3])&&!M('EDU').some(x=>!x[3]&&['1','2','4','7','8'].includes(x[0])));

// 6. 조문 → 미수록 별표·서식(제목 줄 '원문' 링크)
ok('missOf 함수(CORE)',!!C.missOf);
const MO=k=>C.missOf?C.missOf(D,A(k)).map(v=>(v.f?'f':'b')+v.n).join():'(없음)';
ok('안전보건대장 제5조 → 서식 1',MO('CSL:제5조')==='f1',MO('CSL:제5조'));
ok('PSM 제23조 → 서식 5개(17의3·17의4·17의5·18·19)',MO('PSM:제23조').split(',').sort().join()===['f17의3','f17의4','f17의5','f18','f19'].sort().join(),MO('PSM:제23조'));
ok('PSM 제57조 → 앱 수록 별표 3·4는 원문 링크 없음',MO('PSM:제57조')==='',MO('PSM:제57조'));
ok('제조업 계획서 제3조 → 안전보건규칙 별표 9·영 별표는 다른 법령이라 없음',MO('HRP:제3조')==='',MO('HRP:제3조'));
ok('인증 절차 제12조 시행규칙 서식(별지 제45호)은 없음',MO('SCP:제12조')==='',MO('SCP:제12조'));
ok('근골격계 제4조 → 서식 1·2',MO('MSD:제4조')==='f1,f2',MO('MSD:제4조'));
ok('교육규정 제2조 「시행규칙」(이하 "규칙") 별표 5는 다른 법령이라 없음',MO('EDU:제2조')==='',MO('EDU:제2조'));
ok('자체심사업체 고시 \'시행규칙 … 및 별표 13\'은 고시 별표가 아니라 없음',MO('HRS:본문')==='',MO('HRS:본문'));
ok('PSM 제12조 → 서식 4·5 + 별표 1(심사필, 원문 그림)',MO('PSM:제12조').split(',').sort().join()===['f4','b1','f5'].sort().join(),MO('PSM:제12조'));
ok('기존 법령 미수록 별표도 그대로(근기령 제13조 → 별표 3)',MO('GKD:제13조')==='b3',MO('GKD:제13조'));
ok('화면: 제목 줄 원문 링크 함수·창',/function missLink\(e\)/.test(h)&&/data-ms=/.test(h)&&/function openMsSheet/.test(h));

// 7. 원문만 연결하는 고시 7종·검색
ok('원문 연결 고시 7종',(D.glink||[]).length===7&&D.glink.every(g=>g.n&&g.u&&g.d&&g.tok.length));
ok('원문 연결 고시 이름(법제처 현행)',['위험기계·기구 안전인증 고시','방호장치 안전인증 고시','보호구 안전인증 고시','위험기계·기구 자율안전확인 고시','방호장치 자율안전기준 고시','보호구 자율안전확인 고시','안전검사 고시'].every(n=>D.glink.some(g=>g.n===n)));
ok('원문 연결 고시는 수록 법령이 아님(개정 점검·조문 수 제외)',D.glink.every(g=>!Object.values(L).some(l=>l.name===g.n)));
const G=q=>C.glOf?C.glOf(D,q).map(g=>g.s).join():'(없음)';
ok('glOf 함수(CORE)',!!C.glOf);
ok("'방호장치 안전인증 고시' → 방호장치만",G('방호장치 안전인증 고시')==='방호장치 안전인증 고시',G('방호장치 안전인증 고시'));
ok("'크레인 검사기준' → 안전검사 고시",G('크레인 검사기준')==='안전검사 고시',G('크레인 검사기준'));
ok("'안전인증' 한 낱말은 카드 없음(너무 넓음)",G('안전인증')==='',G('안전인증'));
ok("'보호구 자율안전확인' → 보호구 자율안전확인 고시",G('보호구 자율안전확인')==='보호구 자율안전확인 고시',G('보호구 자율안전확인'));
// 법령 이름 검색(고시 약칭)
const HQ=q=>(C.splitQuery(q).hint||[]).join();
ok("'PSM 규정' → 공정안전보고서 규정",HQ('PSM 규정')==='PSM',HQ('PSM 규정'));
ok("'공정안전보고서 규정 확인' → PSM, 검색어 확인",HQ('공정안전보고서 규정 확인')==='PSM'&&C.splitQuery('공정안전보고서 규정 확인').toks.join()==='확인');
ok("'근골격계 고시' → MSD",HQ('근골격계 고시')==='MSD');
ok("'방호조치 기준 지게차' → GRD·지게차",HQ('방호조치 기준 지게차')==='GRD'&&C.splitQuery('방호조치 기준 지게차').toks.join()==='지게차');
ok("'안전보건대장 고시' → CSL",HQ('안전보건대장 고시')==='CSL');
ok("'제조업 계획서 고시' → HRP",HQ('제조업 계획서 고시')==='HRP',HQ('제조업 계획서 고시'));
ok("'단순노무직종 고시' → MWS",HQ('단순노무직종 고시')==='MWS');
// 고시는 같은 분야 법령 조문 뒤(법전 순서)
const ord=Object.keys(L), top=(q,k)=>C.search(D,q,'',ord).arts.slice(0,k||80);
const order=q=>{ const r=top(q), i=r.findIndex(e=>L[e.l].gosi); return i<0||r.slice(i).every(e=>L[e.l].gosi); };
ok("'헤드가드' 고시는 법령 조문 뒤",order('헤드가드'));
ok("'안전보건대장' 고시는 법령 조문 뒤, 시행규칙 제86조 포함",order('안전보건대장')&&top('안전보건대장').some(e=>e.l==='SR'&&e.no==='제86조')&&top('안전보건대장').some(e=>e.l==='CSL'));
ok("'근골격계부담작업' → 규칙 제656조 먼저, 근골격계 고시 제3조도 결과에",top('근골격계부담작업')[0].l==='RULE'&&top('근골격계부담작업').some(e=>e.l==='MSD'&&e.no==='제3조'));
ok("'단순노무' → 단순노무직종 고시 본문",top('단순노무').some(e=>e.l==='MWS'));
ok("'이행상태평가' → PSM 제54~58조",top('이행상태평가').some(e=>e.l==='PSM'&&e.no==='제54조'));

// 8. 작업별 기준 근골격계에 고시 묶음
const W=(D.work||[]).find(w=>w.id==='msd'), sec=W&&W.sec.find(s=>/범위/.test(s.h));   // 조문 키는 근골격계 고시
ok('작업별 기준 근골격계: 범위·조사 방법 묶음(고시 제2·3·4조)',sec&&sec.a.map(x=>x.k).join()==='MSD:제2조,MSD:제3조,MSD:제4조',sec);

// 9. 단순노무직종 고시 참고 — 제8차 한국표준직업분류 대분류 9(국가데이터처 고시 제2024-328호 첨부 '분류 항목표' 원문 기준, 5-39)
const K=D.k9||{g:[]}, leaf=K.g.reduce((a,g)=>a.concat(g[2]),[]);
ok('대분류 9: 중분류 6·세세분류 52(원문 분류 체계 표)',K.g.length===6&&leaf.length===52,[K.g.length,leaf.length]);
ok('중분류 91·92·93·94·95·99',K.g.map(g=>g[0]).join()==='91,92,93,94,95,99',K.g.map(g=>g[0]));
ok('제8차·고시 번호·시행일 표시',K.src==='제8차 한국표준직업분류'&&/제2024-328호/.test(K.ver)&&/2025\. 1\. 1\. 시행/.test(K.ver),K.ver);
const LF=c=>(leaf.find(r=>r[0]===c)||[])[1];
ok('원문 항목: 92220 택배원·94201 아파트 경비원·95220 주방 보조원·93091 수동 포장원·99992 정리 수납원',LF('92220')==='택배원'&&LF('94201')==='아파트 경비원'&&LF('95220')==='주방 보조원'&&LF('93091')==='수동 포장원'&&LF('99992')==='정리 수납원');
ok('세세분류 코드는 모두 9로 시작하는 5자리, 소분류 이름 있음',leaf.every(r=>/^9\d{4}$/.test(r[0])&&r[2]));
const KO=q=>C.k9Of?C.k9Of(D,q).map(r=>r.c).join():'(없음)';
ok('k9Of 함수(CORE)',!!C.k9Of);
ok("'택배원' → 92220",KO('택배원')==='92220',KO('택배원'));
ok("'경비원' → 아파트 경비원만(다른 경비·보안 직종은 대분류 9 아님)",KO('경비원')==='94201',KO('경비원'));
ok("'택배'(2자)·'최저임금 수습'은 없음",KO('택배')===''&&KO('최저임금 수습')==='');
ok("'그 외 …' 항목은 이름으로 찾지 않음",KO('그 외 배달원')==='');
ok('화면: 고시 화면 분류표·검색 카드 함수',/function k9Block\(\)/.test(h)&&/function k9Hit\(q\)/.test(h));

console.log(fail?`\n실패 ${fail}건 / ${n}건`:`\n전체 통과 ${n}건`); process.exit(fail?1:0);
