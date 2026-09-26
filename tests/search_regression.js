// 법ON 검색 회귀 테스트: 현장 검색어 → 기대 조문이 상위 N위 안에
// 사용: node tests/search_regression.js index.html
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,bsearch})',{});
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
 ['위험성평가','OSH:제36조',1,OSH],['안전관리자','OSH:제17조',3,OSH],['보건관리자','OSH:제18조',3,OSH],
 ['중처법 경영책임자','SAPA:제4조',1,OSH],['경영책임자','SAPA:제4조',1,OSH],['안전보건관리체계','SAPAD:제4조',1,OSH],
 ['중대산업재해','SAPA:제2조',2,OSH],['중대재해','OSH:제54조',2,OSH],['직업성 질병','SAPAD:제2조',3,OSH],
 // 2026-09-25 조사가 끼인 원문: 붙여 쓴 검색어로 '출입의 금지'·'작업을 중지'·'흡연 등의 금지' 조문을 찾음
 ['출입금지','RULE:제20조',1,OSH],['출입금지','RULE:제622조',8,OSH],['흡연금지','RULE:제447조',5,OSH],['작업중지','OSH:제54조',30,OSH],['사용금지','RULE:제91조',40,OSH],['안전대착용','RULE:제44조',6,OSH],
 // 2026-09-26 '미실시·미지급·미선임' 등을 붙인 현장 표현, 간주근로·산재은폐 등 용어
 ['퇴직금 미지급','RET:제9조',1,LAB],['주휴수당 미지급','GK:제55조',1,LAB],['임금 미지급','GK:제36조',2,LAB],['근로계약서 미교부','GK:제17조',1,LAB],
 ['안전교육 미실시','OSH:제29조',1,OSH],['안전교육미실시','OSH:제29조',1,OSH],['안전관리자 미선임','OSH:제17조',1,OSH],['위험성평가 미실시','OSH:제36조',1,OSH],['안전난간 미설치','RULE:제13조',1,OSH],
 ['휴게시간 위반','GK:제54조',1,LAB],['미지급','GK:제37조',1,LAB],['간주근로','GK:제58조',1,LAB],['사업장 밖','GK:제58조',1,LAB],['서면명시','GK:제17조',2,LAB],
 ['산재은폐','OSH:제57조',1,OSH],['산재 미보고','OSH:제57조',1,OSH],
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
