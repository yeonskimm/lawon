// 법ON 검색 회귀 테스트: 현장 검색어 → 기대 조문이 상위 N위 안에
// 사용: node tests/search_regression.js index.html
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,bsearch,looseQuery})',{});
const D=C.prepare(JSON.parse(raw));
const LAB=['GK','MW','RET','EQ','EQR','FT','DISP','LMC'], OSH=['OSH','RULE','SAPA','SAPAD'];
// [검색어, 기대 조문, 상위 몇 위 안, 분야]
const CASES=[
 ['주휴','GK:제55조',1,LAB],['휴게시간','GK:제54조',1,LAB],['임금체불','GK:제43조',2,LAB],['연차','GK:제60조',1,LAB],
 ['연차수당','GK:제60조',2,LAB],['연차 수당','GK:제60조',2,LAB],['해고예고수당','GK:제26조',1,LAB],['해고 예고 수당','GK:제26조',1,LAB],
 ['52시간','GK:제53조',1,LAB],['주 52시간','GK:제53조',1,LAB],['연장근로 한도','GK:제53조',1,LAB],['5인 미만','GK:제11조',1,LAB],['4인 이하','GK:제11조',1,LAB],
 ['18세 미만','GK:제64조',6,LAB],['청소년','GK:제64조',6,LAB],['통상임금','GK:제56조',3,LAB],['평균임금','GK:제2조',1,LAB],
 ['포괄임금','GK:제56조',1,LAB],['쪼개기','GK:제18조',2,LAB],['퇴사','GK:제36조',2,LAB],['수습','MW:제5조',2,LAB],
 ['최저임금 감액','MW:제5조',3,LAB],['육아휴직 불이익','EQ:제19조',3,LAB],['직장 내 괴롭힘','GK:제76조의2',2,LAB],['취업규칙','GK:제93조',2,LAB],
 ['불법파견','DISP:제5조',2,LAB],['무기계약','FT:제4조',1,LAB],['기숙사','GK:제98조',4,LAB],
 ['지게차',null,0,OSH],['비계',null,0,OSH],['안전난간',null,0,OSH],['MSDS','OSH:제114조',1,OSH],['휴게시설','OSH:제128조의2',3,OSH],
 ['온열','RULE:제562조',1,OSH],['열사병','RULE:제562조',1,OSH],['하청','OSH:제63조',2,OSH],['특고','OSH:제77조',1,OSH],['작업중지','OSH:제51조',3,OSH],
 ['관리비','OSH:제72조',1,OSH],['작업계획서','RULE:제38조',1,OSH],['질식','RULE:제619조',1,OSH],['스카이','RULE:제186조',1,OSH],
 ['시저리프트','RULE:제186조',1,OSH],['시저','RULE:제186조',1,OSH],['고소차','RULE:제186조',1,OSH],['고소작업차','RULE:제186조',1,OSH],['스카이차','RULE:제186조',1,OSH],['오버헤드크레인','RULE:제132조',1,OSH],['사다리차','RULE:제157조',2,OSH],['사다리차','RULE:제158조',2,OSH],['BT비계','RULE:제68조',1,OSH],
 ['위험성평가','OSH:제36조',1,OSH],['안전관리자','OSH:제17조',3,OSH],['보건관리자','OSH:제18조',3,OSH],
 ['중처법 경영책임자','SAPA:제4조',1,OSH],['경영책임자','SAPA:제4조',1,OSH],['안전보건관리체계','SAPAD:제4조',2,OSH],
 ['중대산업재해','SAPA:제2조',2,OSH],['중대재해','OSH:제54조',2,OSH],['직업성 질병','SAPAD:제2조',3,OSH],
 // 2026-09-25 조사가 끼인 원문: 붙여 쓴 검색어로 '출입의 금지'·'작업을 중지'·'흡연 등의 금지' 조문을 찾음
 ['출입금지','RULE:제20조',1,OSH],['출입금지','RULE:제622조',8,OSH],['흡연금지','RULE:제447조',5,OSH],['작업중지','OSH:제54조',30,OSH],['사용금지','RULE:제91조',40,OSH],['안전대착용','RULE:제44조',6,OSH],
 // 2026-09-26 '미실시·미지급·미선임' 등을 붙인 현장 표현, 간주근로·산재은폐 등 용어
 ['퇴직금 미지급','RET:제9조',1,LAB],['주휴수당 미지급','GK:제55조',1,LAB],['임금 미지급','GK:제36조',2,LAB],['근로계약서 미교부','GK:제17조',1,LAB],
 ['안전교육 미실시','OSH:제29조',1,OSH],['안전교육미실시','OSH:제29조',1,OSH],['안전관리자 미선임','OSH:제17조',1,OSH],['위험성평가 미실시','OSH:제36조',1,OSH],['안전난간 미설치','RULE:제13조',1,OSH],
 ['휴게시간 위반','GK:제54조',1,LAB],['미지급','GK:제37조',1,LAB],['간주근로','GK:제58조',1,LAB],['사업장 밖','GK:제58조',1,LAB],['서면명시','GK:제17조',2,LAB],
 ['산재은폐','OSH:제57조',1,OSH],['산재 미보고','OSH:제57조',1,OSH],
 // 2026-09-30 검색 0건이던 현장 말(용어사전 보강)
 ['하네스','RULE:제44조',1,OSH],['안전벨트','RULE:제44조',1,OSH],['안전망','RULE:제42조',1,OSH],['백호','RULE:제342조',1,OSH],['렌탈','OSH:제81조',1,OSH],['썬라이트','RULE:제45조',1,OSH],
 ['정화조','RULE:제618조',2,OSH],['귀마개','RULE:제516조',1,OSH],['안전보건협의체','OSH:제64조',1,OSH],['합동점검','SR:제82조',1,OSH],['작업중지권','OSH:제52조',1,OSH],['건설업 기초안전교육','OSH:제31조',1,OSH],['물 그늘 휴식','RULE:제562조',1,OSH],['안전대 미사용','RULE:제44조',1,OSH],
 ['아르바이트','GK:제18조',2,LAB],['계약직','FT:제4조',1,LAB],['가불','GK:제45조',2,LAB],['연차 미사용 수당','GK:제60조',1,LAB],['연차 사용 촉진','GK:제61조',1,LAB],['해고 서면','GK:제27조',1,LAB],['출퇴근 기록','GKD:제27조',2,LAB],['숙소','GK:제98조',2,LAB],
 // 2026-09-30 표기 흔들림 교정·현장 은어·외국인고용법
 ['안전밸트','RULE:제44조',1,OSH],['슬링밸트','RULE:제169조',1,OSH],['크래인','RULE:제139조',3,OSH],['콘베어','RULE:제194조',1,OSH],['후크','RULE:제164조',1,OSH],['펜스','RULE:제48조',1,OSH],
 ['아시바','RULE:제54조',3,OSH],['가스통','RULE:제234조',1,OSH],['헬멧','RULE:제32조',1,OSH],['에어콤프레샤','RULE:제87조',3,OSH],
 // 2026-10-04 고정 조문(법 조문에 검색어 글자가 없음)·0건 검색어
 ['특별교육','OSH:제29조',1,OSH],['정기교육','OSH:제29조',1,OSH],['채용시 교육','OSH:제29조',1,OSH],['채용 시 교육','OSH:제29조',1,OSH],
 ['끼임','RULE:제87조',2,OSH],['끼임','RULE:제92조',2,OSH],['휴일근로수당','GK:제56조',1,LAB],['연장근로수당','GK:제56조',1,LAB],['야간근로수당','GK:제56조',1,LAB],
 ['취업규칙 불이익변경','GK:제94조',1,LAB],['취업규칙 불이익 변경','GK:제94조',1,LAB],['친권자동의','GK:제66조',1,LAB],['줄걸이','RULE:제163조',3,OSH],['차량탑재형','RULE:제186조',1,OSH],
 ['용접흄',null,0,OSH],['온열질환','RULE:제562조',1,OSH],['최저임금 고지','MW:제11조',1,LAB],['관리비 목적외','OSH:제72조',1,OSH],['관리비 목적외 사용','OSH:제72조',1,OSH],['재량근로','GK:제58조',1,LAB],
  // 2026-10-06 장갑 현장 말(면장갑 등) → 안전보건규칙 제95조
 ['면장갑','RULE:제95조',1,OSH],['목장갑','RULE:제95조',1,OSH],['코팅장갑','RULE:제95조',1,OSH],['반코팅장갑','RULE:제95조',1,OSH],['면장갑 착용','RULE:제95조',1,OSH],['면장갑착용','RULE:제95조',1,OSH],['목장갑 사용금지','RULE:제95조',1,OSH],
 ['외국인고용법','FW:제1조',1,LAB],['표준근로계약서','FW:제9조',1,LAB],['고용허가','FW:제8조',1,LAB],['E-9','FW:제8조',1,LAB],['출국만기보험','FW:제13조',1,LAB],['고용변동 신고','FW:제17조',1,LAB],['사업장 변경','FW:제25조',1,LAB],['외국인 숙소','FW:제22조의2',1,LAB],
];
// 2026-10-16 과태료 위반행위 문구 색인·용어사전(타 앱 비교 후속)
CASES.push(['선임하지 않은','OSH:제17조',3,OSH],['게시하지 않은','OSH:제114조',3,OSH],['안전그네','RULE:제44조',1,OSH],['추락방지망','RULE:제42조',1,OSH],
 ['명예감독관','OSH:제23조',1,OSH],['정기교육 시간','SR:제26조',1,OSH],['교육시간','SR:제26조',1,OSH],['중대사고','OSH:제54조',3,OSH],['관리감독자 교육 시간','SR:제26조',1,OSH]);
// 2026-10-23(5-73) 전체 검토에서 0건·엉뚱한 결과였던 현장 말 — 기대 조문은 법령 원문 기준(산안법 제167조 근로자 사망·제54조 중대재해 조치, 규칙 제619조의2 산소농도 측정, 산안법 제130조 특수건강진단(시행규칙 별표 22 야간작업),
//  퇴직급여법 제19조·제13조 확정기여형·확정급여형, 근기법 제23조 전직, 제43조② 정기지급, 퇴직급여법 제9조 14일 이내, 기간제법 제8조·파견법 제21조 차별)
CASES.push(['사망사고','OSH:제167조',3,OSH],['사망사고','OSH:제54조',3,OSH],['사망사고','SAPA:제6조',3,OSH],['사망재해','OSH:제167조',3,OSH],
 ['산소농도 측정','RULE:제619조의2',1,OSH],['산소농도','RULE:제619조의2',1,OSH],['야간작업 건강진단','OSH:제130조',1,OSH],
 ['DC형','RET:제19조',1,LAB],['DB형','RET:제13조',1,LAB],['부당전보','GK:제23조',1,LAB],['전근','GK:제23조',1,LAB],['인사이동','GK:제23조',1,LAB],['부당전직','GK:제23조',1,LAB],
 ['월급날','GK:제43조',1,LAB],['임금지급일','GK:제43조',1,LAB],['퇴직금 지급기한','RET:제9조',1,LAB],['비정규직 차별','FT:제8조',2,LAB],['비정규직','DISP:제21조',2,LAB]);
// 2026-10-24(5-75) 시행 전 개정 문구로도 찾음(낮은 점수): 외국인고용법 제22조의2 '주거시설'(2027. 6. 10.), 건설근로자법 제13조 '전자카드 단말기'(2027. 1. 8.)
CASES.push(['주거시설','FW:제22조의2',1,LAB],['주거시설 제공','FW:제22조의2',1,LAB],['전자카드 단말기','CW:제13조',4,LAB]);
let fail=0;
for(const [q,exp,n,first] of CASES){
  const r=C.search(D,q,'',first), keys=r.arts.map(e=>e.l+':'+e.no);
  const ok=exp? keys.slice(0,n).includes(exp) : r.total>0;
  if(!ok)fail++;
  console.log((ok?'PASS':'FAIL')+'  '+q.padEnd(12)+' → '+keys.slice(0,3).join(', ')+(r.notes&&r.notes.length?'  [안내] '+r.notes.join(' / '):''));
}
// 2026-10-02 현장 문장(실측 0건·엉뚱한 결과) — 화면과 같은 순서: 그대로 → 0건이면 군말 빼고 → 그래도 0건이면 검색어별 결과
const LQ=(q,f)=>{ let r=C.search(D,q,'',f); if(!r.total&&!r.items.length){ const l=C.looseQuery(q); if(l)r=Object.assign(C.search(D,l.q,'',f),{lq:l}); } return r; };
const top=(r,n)=>r.arts.slice(0,n).map(e=>e.l+':'+e.no);
const LC=[ // [검색어, 분야, 기대 조문, 상위 몇 위, 뺄 말]
 ['지게차 작업계획서',OSH,'RULE:제38조',1,null],['안전난간 없음',OSH,'RULE:제13조',1,'없음'],['안전난간없음',OSH,'RULE:제13조',1,'없음'],
 ['관리감독자 교육 몇시간',OSH,'SR:제26조',1,'몇'],['건강진단 안했음 과태료',OSH,'OSH:제129조',2,'안했음'],['안전대 미착용',OSH,'RULE:제44조',1,null]];
for(const [q,f,exp,n,dw] of LC){ const r=LQ(q,f), okk=top(r,n).includes(exp)&&(dw?(r.lq&&r.lq.drop.includes(dw)):!r.lq);
  if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  현장 문장 '+q+' → '+top(r,3).join(', ')+(r.lq?'  [제외] '+r.lq.drop.join('·'):'')); }
// 뜻이 있는 말은 빼지 않음, 검색어별 결과로
{ const okk=C.looseQuery('건설현장 안전난간')===null&&C.looseQuery('지게차 안전관리')===null; if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  건설현장·안전관리는 빼지 않음'); }
{ const l=C.looseQuery('지게차 후진하다 사고'), okk=l&&l.q==='지게차 후진 사고'&&l.drop.join()==='하다'; if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  후진하다 → 후진(사고는 그대로) '+JSON.stringify(l)); }
// 한 조문에 없는 두 개념: 단어별로 각 조문이 나와야 함
{ const a=top(C.search(D,'5인미만','',LAB),1), b=top(C.search(D,'야간수당','',LAB),2), okk=a.includes('GK:제11조')&&b.includes('GK:제56조'); if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  5인미만 / 야간수당 단어별 → '+a+' / '+b); }
// 파견법 시행규칙 제4조 '관계서류 없음'은 알고 있는 예외(0건일 때만 빼므로 영향 없음)
// 군말 목록의 말은 조문 본문 낱말로 쓰이지 않아야 함(빼도 뜻이 안 바뀜) — 본문에 '없음'이 단독 낱말로 나오면 알림
{ const W=['없음','안함','안했음','했음','몇시간'], KNOWN={'DISPR:제4조':1}, hit=W.filter(w=>D.arts.some(e=>!KNOWN[e.l+':'+e.no]&&new RegExp('(^|[\\s,.(])'+w+'($|[\\s,.)])').test(e.x))); const okk=!hit.length; if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  군말이 본문 낱말로 없음 '+hit.join(',')); }
// 별표: 직업성 질병 → 중처법 시행령 별표1
const bh=C.bsearch(D,'열사병','osh'); const okb=bh.some(x=>(x.tab&&x.tab.id==='ZD1')||(x.r&&x.r.tb==='ZD1'));
console.log((okb?'PASS':'FAIL')+'  별표 검색 열사병 → 중처법 시행령 별표1 포함'); if(!okb)fail++;
// 2026-09-28 주요 의무: 근거 조문 제목·고정조문 연결, 키워드, 법령 이름만 검색 [검색어, 포함할 id, 포함하면 안 되는 id]
const ICASES=[
 ['안전교육',['o_edu','o_edu3','o_for'],[]],['작업내용 변경',['o_edu','o_edu3'],[]],['산안위',['o_comm'],[]],
 ['중처법',['o_sapa'],[]],['중대산업재해',['o_sapa'],[]],['경영책임자',['o_sapa'],[]],['불법파견',['l_disp'],[]],
 ['금품청산',['l_ret'],[]],['무기계약',['l_ft4'],[]],['배치전',['o_hc'],[]],
 // 본문에만 스친 조문으로는 붙이지 않음
 ['주휴',[],['l_ft17']],['감시단속',[],['o_38']],['통상임금',[],['l_ft4']],['유산',[],['l_cl']],['산재미보고',['o_57'],['o_disc']],['한파',[],['o_38']],
];
for(const [q,inc,exc] of ICASES){
  const r=C.search(D,q,'',OSH), ids=r.items.map(i=>i.id);
  const ok=inc.every(x=>ids.includes(x))&&!exc.some(x=>ids.includes(x));
  if(!ok)fail++; console.log((ok?'PASS':'FAIL')+'  주요 의무 '+q.padEnd(10)+' → '+ids.join(', '));
}
const rl=C.search(D,'산안법','',OSH); const okl=rl.lawOnly===1&&rl.items.length>5;
console.log((okl?'PASS':'FAIL')+'  법령 이름만(산안법) → 주요 의무 '+rl.items.length+'건(화면에서 접힘)'); if(!okl)fail++;
// 2026-10-16 조문 번호 약칭(선택 분야 기준) — 화면처럼 first·grp에 분야 법령을 줌. [검색어, 분야, 기대 1순위, 정확히 1건이면 1]
const OSHF=['OSH','SD','SR','RULE','LIC','SAPA','SAPAD','OAM','LIO'], LABF=['GK','GKD','GKR','MW','MWD','MWR','RET','RETD','RETR','EQ','EQD','EQR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','FW','FWD','TU','TUD','TUR','GAM','LIO'];
for(const [q,f,exp,one] of [['영 제16조',OSHF,'SD:제16조',1],['영 16조',OSHF,'SD:제16조',1],['시행령 제16조',OSHF,'SD:제16조',1],['영 제16조제1항',OSHF,'SD:제16조',1],['영 16조 2항',OSHF,'SD:제16조',1],
  ['법 제16조',OSHF,'OSH:제16조',1],['법 38조',OSHF,'OSH:제38조',1],['법 제10조의2',OSHF,'OSH:제10조의2',1],['시행규칙 12조',OSHF,'SR:제12조',1],['규칙 제42조',OSHF,'RULE:제42조',1],
  ['영 제7조의2',LABF,'GKD:제7조의2',1],['법 제60조',LABF,'GK:제60조',1],['시행규칙 제15조',LABF,'GKR:제15조',1],['규칙 제15조',LABF,'GKR:제15조',1],
  ['제16조',OSHF,'OSH:제16조',0],['16조',OSHF,'OSH:제16조',0],['제16조',LABF,'GK:제16조',0],['제7조의2',LABF,'GKD:제7조의2',0],['제23조',LABF,'GK:제23조',0]]){
  const r=C.search(D,q,'',f,f), k=r.arts.map(e=>e.l+':'+e.no), okk=k[0]===exp&&(!one||r.total===1); if(!okk)fail++;
  console.log((okk?'PASS':'FAIL')+'  조문 약칭 '+q+' → '+k.slice(0,2).join(', ')+' ('+r.total+'건)'); }
{ const r=C.search(D,'법 제16조','',null,null), okk=r.total>1; if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  분야 없으면 약칭 해석 안 함('+r.total+'건)'); }
{ const r=C.search(D,'영 제999조','',OSHF,OSHF), okk=r.total===0; if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  없는 조문 → 0건'); }
// 현장 약어(용어사전 2026-10-16) → 대표 조문 1순위
for(const [q,exp] of [['관감','OSH:제16조'],['산안비','OSH:제72조'],['일검','OSH:제129조'],['배검','OSH:제130조'],['작측','OSH:제125조'],['유위','OSH:제42조'],['유위계','OSH:제42조'],['산보위','OSH:제24조'],['명감','OSH:제23조'],['명산감','OSH:제23조'],['근감','OSH:제155조'],['위평','OSH:제36조'],['안보교육','OSH:제29조'],['물안자','OSH:제114조'],['보관자','OSH:제18조'],['안관','OSH:제17조']]){
  const r=C.search(D,q,'',OSHF,OSHF), k=r.arts.map(e=>e.l+':'+e.no), okk=k[0]===exp; if(!okk)fail++;
  console.log((okk?'PASS':'FAIL')+'  현장 약어 '+q+' → '+k.slice(0,2).join(', ')); }
{ const r=C.search(D,'근감','',LABF,LABF), okk=r.arts[0]&&r.arts[0].l+':'+r.arts[0].no==='GK:제102조'; if(!okk)fail++; console.log((okk?'PASS':'FAIL')+'  근로기준 분야 근감 → 근기법 제102조'); }
// 2026-10-17 주요 의무를 근거 조문 줄 아래에 붙이므로: 주요 의무 이름으로 찾으면 근거 법 조문이 결과에(근거가 하나면 앞쪽으로), 두 글자 낱말 하나·근거 여럿인 의무로는 순위를 바꾸지 않음
{ const LCx={}; Object.keys(D.meta.laws).forEach(k=>LCx[D.meta.laws[k].name]=k);
  const host=(r,it)=>it.refs.some(x=>r.arts.some(e=>e.l+':'+e.no===LCx[x.law]+':'+x.no));
  for(const [q,exp,top] of [['특별교육(유해·위험 작업)','OSH:제29조',1],['안전보건계획','OSH:제14조',1],['안전관리자 선임','OSH:제17조',1],['보건관리자 선임','OSH:제18조',1],['근로자 정기교육·채용 시 교육','OSH:제29조',1],
      ['중대재해 발생 시 조치·보고','OSH:제54조',1],['일반·특수건강진단','OSH:제129조',2],['안전조치·보건조치','OSH:제38조',2],['특수건강진단','OSH:제130조',1]]){
    const r=C.search(D,q,'',OSHF,OSHF), k=r.arts.map(e=>e.l+':'+e.no), i=k.indexOf(exp), okk=i>=0&&i<top; if(!okk)fail++;
    console.log((okk?'PASS':'FAIL')+'  주요 의무 이름 '+q+' → '+k.slice(0,3).join(', ')); }
  for(const [q,f,not] of [['위험',OSHF,'OSH:제29조'],['작업',OSHF,'OSH:제29조'],['업무',OSHF,'OSH:제16조'],['이내',LABF,'RET:제9조'],['가족돌봄휴직',LABF,'EQ:제18조의3'],['차별금지',LABF,'FT:제6조']]){
    const r=C.search(D,q,'',f,f), k=r.arts[0]?r.arts[0].l+':'+r.arts[0].no:'', okk=k!==not; if(!okk)fail++;
    console.log((okk?'PASS':'FAIL')+'  '+q+' 1순위가 '+not+' 아님(주요 의무 제목 낱말로 끌어올리지 않음) → '+k); }
  for(const q of ['안전교육','휴게시설','건강진단','도급인','안전보건관리책임자','육아휴직']){
    const r=C.search(D,q,'',OSHF.concat(LABF),OSHF), miss=r.items.filter(it=>!host(r,it)).map(it=>it.id), okk=r.items.length>0&&miss.length===0; if(!okk)fail++;
    console.log((okk?'PASS':'FAIL')+'  '+q+' → 주요 의무 '+r.items.length+'건 모두 근거 조문이 결과에'+(miss.length?' (없음: '+miss.join(',')+')':'')); } }
// 2026-10-22: 용어사전 not — '환풍기'(add 환기)가 '상환기간'·'열교환기' 속 '환기'로 잡히지 않음
{ const LW=['GK','GKD','GKR','MW','MWD','MWR','RET','RETD','RETR','WG','WGD','WGR','EQ','EQD','EQR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','FW','FWD','TU','TUD','TUR','GAM'];
  const kk=C.search(D,'환풍기','',LW,LW).arts.map(e=>e.l+':'+e.no), ko=C.search(D,'환풍기','',OSH,OSH).arts.map(e=>e.l+':'+e.no);
  const okk=kk.length>0&&!kk.includes('WGR:제8조의10')&&!ko.includes('RULE:제261조')&&ko[0]==='RULE:제77조'&&kk.includes('GKD:제55조');
  if(!okk)fail++; console.log((okk?'PASS':'FAIL')+' 환풍기 → 상환기간·열교환기 제외, 산업안전 1위 규칙 제77조, 기숙사(근기령 제55조) 유지',okk?'':JSON.stringify([kk.slice(0,4),ko.slice(0,4)])); }
// 2026-10-22: 법 추가 수록(건설근로자법·가사근로자법 — 근로기준, 진폐법 — 산업안전) 전 핵심 검색어 1위 고정 — 새 법 조문이 기존 핵심 조문을 밀어내지 않는지
{ const FLD=src=>(new RegExp(src+":\\{[^\\n]*?first:\\[([^\\]]*)\\]").exec(html)[1]).replace(/'/g,'').split(','); const LF=FLD('labor'), OF=FLD('osh');
  const LOCK=[['건강진단',OF,'OSH:제129조'],['특수건강진단',OF,'OSH:제130조'],['배치전 건강진단',OF,'OSH:제130조'],['분진',OF,'RULE:제4조의2'],['분진작업',OF,'RULE:제605조'],['건설업 기초안전보건교육',OF,'OSH:제31조'],
    ['연대책임',LF,'GK:제44조의2'],['건설업 임금',LF,'GK:제44조의2'],['퇴직금',LF,'RET:제9조'],['건설',LF,'GK:제44조의2'],['하수급인',LF,'GK:제44조'],['직상수급인',LF,'GK:제44조']];
  for(const [q,f,exp] of LOCK){ const a=C.search(D,q,'',f,f).arts[0], k=a&&a.l+':'+a.no; if(k!==exp)fail++; console.log((k===exp?'PASS':'FAIL')+' 핵심 검색어 고정 '+q+' → '+exp,k===exp?'':k); } }
// 2026-10-22(5-61): 현장 말 점검 — 0건이던 말·엉뚱한 1위였던 말(근로기준 분야)
{ const FLD=src=>(new RegExp(src+":\\{[^\\n]*?first:\\[([^\\]]*)\\]").exec(html)[1]).replace(/'/g,'').split(','); const LF=FLD('labor'), OF=FLD('osh');
  const FIX=[['해고 서면통지',LF,'GK:제27조'],['전액불',LF,'GK:제43조'],['통화불',LF,'GK:제43조'],['정리해고',LF,'GK:제24조'],['대기발령',LF,'GK:제23조'],['징계',LF,'GK:제23조'],
    ['노동청 진정',LF,'GAM:제33조'],['진정',LF,'GAM:제33조'],['임금 지급일',LF,'GK:제43조'],['수습기간 최저임금',LF,'MWD:제3조'],['상시근로자수',LF,'GKD:제7조의2'],['차별시정',LF,'FT:제9조'],
    ['산재',LF,'GK:제78조'],['산재',OF,'OSH:제57조'],['안전방망',OF,'RULE:제42조'],['뇌심혈관',OF,'RULE:제669조'],
    ['폐업',LF,'FW:제25조'],['보험료',LF,'FW:제13조'],['상시근로자수',OF,'OSH:제3조'],['사회보험',LF,'DW:제18조']];   // 5-64 검색 순위 정리
  for(const [q,f,exp] of FIX){ const a=C.search(D,q,'',f,f).arts[0], k=a&&a.l+':'+a.no; if(k!==exp)fail++; console.log((k===exp?'PASS':'FAIL')+' 현장 말 '+q+' → '+exp,k===exp?'':k); } }
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
