// 시행령·시행규칙 조문 수록 검사 — 사용: node tests/sublaw_check.js index.html
// 조문 수가 원문(법제처 내려받은 판)과 같은지, 모법 연결이 실제 조문을 가리키는지, 대표 조문의 연결이 맞는지
const fs=require('fs'); const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const D=JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g,'</'));
const EXPECT={GKD:75,GKR:21,SD:125,SR:252,RETD:79,RETR:18};   // 원문 조문 수(삭제 조문 제외)
const LINK=[['GKD:제7조의2','GK:제11조'],['GKD:제30조','GK:제55조'],['GKD:제33조','GK:제60조'],['GKD:제27조의2','GK:제48조'],['GKR:제15조','GK:제93조'],['GKR:제6조','GK:제33조'],
  ['SD:제16조','OSH:제17조'],['SD:제52조','OSH:제62조'],['SR:제26조','OSH:제29조'],['SR:제67조','OSH:제54조'],['SR:제37조','OSH:제36조'],['SR:제194조의2','OSH:제128조의2'],['RETD:제3조','RET:제8조'],['RETD:제42조','RET:제48조'],['RETR:제2조','RET:제13조']];
const by={}; D.arts.forEach(e=>by[e.l+':'+e.no]=e); let fail=0;
const ok=(n,c,i)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':'  → '+i)); if(!c)fail++;};
for(const [k,n] of Object.entries(EXPECT)){ const a=D.arts.filter(e=>e.l===k); ok(k+' 조문 '+n+'개',a.length===n,a.length);
  ok(k+' 법령 정보',!!D.meta.laws[k],'');
  const bad=a.filter(e=>(e.up||[]).some(u=>!by[u])); ok(k+' 모법 연결이 모두 실제 조문',!bad.length,bad.map(e=>e.no).join(','));
  const dup=a.map(e=>e.no).filter((x,i,s)=>s.indexOf(x)!==i); ok(k+' 조문 번호 중복 없음',!dup.length,dup.join(','));
  const empty=a.filter(e=>!e.x||!e.x.trim()); ok(k+' 빈 조문 없음',!empty.length,empty.map(e=>e.no).join(',')); }
for(const [s,p] of LINK){ const e=by[s]; ok(s+' → '+p,e&&(e.up||[])[0]===p,e&&e.up); }
console.log(fail?'실패 '+fail+'건':'전체 통과'); process.exit(fail?1:0);
