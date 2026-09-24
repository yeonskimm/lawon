// 분야 우선 검색 — 사용: node tests/field_priority.js index.html
// 근로기준 분야에서는 근로기준 법령이, 산업안전 분야에서는 산업안전 법령이 먼저 나오고, 다른 분야 결과도 빠지지 않는지
const fs=require('fs'),vm=require('vm'); const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search})',{}); const D=C.prepare(JSON.parse(raw));
const LAB=['GK','GKD','GKR','MW','RET','RETD','RETR','EQ','EQR','FT','DISP','LMC'], OSH=['OSH','SD','SR','RULE','SAPA','SAPAD'];
const Q=['휴게','휴게시설','교육','건강진단','도급','보고','근로자대표','서류 보존','임산부','야간'];
let fail=0; const ok=(n,c,i)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':'  → '+i)); if(!c)fail++;};
for(const q of Q){ for(const [nm,G] of [['근로기준',LAB],['산업안전',OSH]]){
  const r=C.search(D,q,'',G.concat(nm==='근로기준'?OSH:LAB),G), L=r.arts.map(e=>e.l), k=L.findIndex(l=>!G.includes(l));
  const sorted=k<0||L.slice(k).every(l=>!G.includes(l)), inN=L.filter(l=>G.includes(l)).length;
  const base=C.search(D,q,'',G.concat(nm==='근로기준'?OSH:LAB));
  ok(`${q} · ${nm}: 분야 법령 ${Math.min(inN,r.arts.length)}건 먼저, 전체 ${r.total}건`, sorted&&r.total===base.total, L.slice(0,8).join(','));
}}
console.log(fail?'실패 '+fail+'건':'전체 통과'); process.exit(fail?1:0);
