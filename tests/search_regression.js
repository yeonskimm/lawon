// 법ON 검색 회귀 테스트: 현장 검색어 → 기대 조문이 상위 N위 안에
// 사용: node tests/search_regression.js index.html
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,bsearch})',{});
const D=C.prepare(JSON.parse(raw));
const LAB=['GK','MW','MWD','MWR','RET','EQ','EQD','EQR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','GAM','LIO','ORD','ORDD'], OSH=['OSH','RULE','SAPA','SAPAD','OAM','LIO','ORD','ORDD'];
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
 ['위험성평가','OSH:제36조',1,OSH],['안전관리자','OSH:제17조',3,OSH],['보건관리자','OSH:제18조',3,OSH],
 ['중처법 경영책임자','SAPA:제4조',1,OSH],['경영책임자','SAPA:제4조',1,OSH],['안전보건관리체계','SAPAD:제4조',1,OSH],
 ['중대산업재해','SAPA:제2조',2,OSH],
 ['최저임금 시행령 임금의 환산','MWD:제5조',1,LAB],['파견법 시행령 금지업무','DISPD:제2조',1,LAB],['과태료 의견제출','ORDD:제3조',3,LAB],['신고사건 처리기간','GAM:제42조',3,LAB],['사용중지','OSH:제53조',3,OSH],['노동감독관 출석요구','LIO:제10조',2,LAB],['중대재해','OSH:제54조',2,OSH],['직업성 질병','SAPAD:제2조',3,OSH],
];
let fail=0;
for(const [q,exp,n,first] of CASES){
  const r=C.search(D,q,'',first), keys=r.arts.map(e=>e.l+':'+e.no);
  const ok=exp? keys.slice(0,n).includes(exp) : r.total>0;
  if(!ok)fail++;
  console.log((ok?'PASS':'FAIL')+'  '+q.padEnd(12)+' → '+keys.slice(0,3).join(', ')+(r.notes&&r.notes.length?'  [안내] '+r.notes.join(' / '):''));
}
// 별표: 직업성 질병 → 중처법 시행령 별표1
const bh=C.bsearch(D,'열사병','osh'); const okb=bh.some(x=>(x.tab&&x.tab.id==='ZD1')||(x.r&&x.r.tb==='ZD1'));
console.log((okb?'PASS':'FAIL')+'  별표 검색 열사병 → 중처법 시행령 별표1 포함'); if(!okb)fail++;
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
