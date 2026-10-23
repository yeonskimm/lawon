// 안전보건규칙 조문 → 안전보건공단 「만화로 보는 산업안전보건기준에 관한 규칙」 쪽 연결 검사 — 사용: node tests/comic_check.js index.html
// 2026-10-23: 2026년판(전자책 Dir 647, 344쪽) PDF 쪽마다 '제N조(' 제목을 뽑아 만든 조문 → 첫 쪽 표(D.comic)
const fs=require('fs'); const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const D=JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g,'</'));
let fail=0; const ok=(n,c,i)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':'  → '+i)); if(!c)fail++;};
const C=D.comic||{}, M=C.map||{}, R=D.arts.filter(e=>e.l==='RULE'), by={}; R.forEach(e=>by[e.no]=e);
ok('만화 연결 데이터(연도·전자책 번호)', C.y===2026&&C.dir==='647', JSON.stringify({y:C.y,dir:C.dir}));
ok('연결 조문 669개', Object.keys(M).length===669, Object.keys(M).length);
const notRule=Object.keys(M).filter(k=>!by[k]); ok('연결 조문이 모두 안전보건규칙에 있음', !notRule.length, notRule.join(','));
const badP=Object.entries(M).filter(([k,p])=>!Number.isInteger(p)||p<1||p>344); ok('쪽 번호 1~344', !badP.length, JSON.stringify(badP));
let prev=0, back=[]; R.forEach(e=>{ const p=M[e.no]; if(p){ if(p<prev)back.push(e.no+':'+p); prev=p; } }); ok('조문 순서대로 쪽이 커짐', !back.length, back.join(','));
const empty=R.filter(e=>M[e.no]&&!(e.t||'').trim()); ok('삭제 조문(제목 없음)은 연결 없음', !empty.length, empty.map(e=>e.no).join(','));
const noLink=R.filter(e=>!M[e.no]).map(e=>e.no); ok('연결 없는 조문은 삭제 조문 3개(제336·337·610조)', noLink.join(',')==='제336조,제337조,제610조', noLink.join(','));
for(const [k,p] of [['제1조',10],['제3조',12],['제4조의2',12],['제42조',32],['제87조',61],['제227조',115],['제618조',284],['제619조의2',285],['제673조',312],['제674조',312]])
  ok(k+' → '+p+'쪽', M[k]===p, M[k]);
ok('조문 화면 코드(comicLink)', /function comicLink\(e\)/.test(html)&&/ecatalog5\.jsp\?Dir=/.test(html)&&/comicLink\(e\)\+'<\/div>'/.test(html), '');
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
