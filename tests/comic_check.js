// 안전보건규칙 조문 → 안전보건공단 「만화로 보는 산업안전보건기준에 관한 규칙」 쪽 연결 검사 — 사용: node tests/comic_check.js index.html
// 2026-10-23: 2026년판(전자책 Dir 647, 344쪽) PDF 쪽마다 '제N조(' 제목을 뽑아 만든 조문 → 첫 쪽 표(D.comic)
// 5-68: 우리 사이트 쪽 보기 comic/(index.html·2026/NNN.webp)와 서비스워커 v9 범위도 확인
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
// 5-68: 우리 사이트 쪽 보기(comic/) — 쪽 그림 파일·보기 화면 표·서비스워커 범위
const path=require('path'), base=path.dirname(path.resolve(process.argv[2]||'index.html'));
ok('앱 링크: v9 확인 시 comic/?p=쪽&a=조문, 확인 전 공단 전자책', /LAWON_COMIC_OK\?'comic\/\?p='/.test(html)&&/function swVer\(reg\)/.test(html)&&/type:'LAWON_VER'/.test(html), '');
const VD=path.join(base,'comic'), V=fs.existsSync(path.join(VD,'index.html'))?fs.readFileSync(path.join(VD,'index.html'),'utf8'):'';
const cfg=(V.match(/var CFG=(\{[\s\S]*?\});\n/)||[])[1]; let CF=null; try{ CF=Function('return '+cfg)(); }catch(e){}
ok('보기 화면 설정(연도·쪽 수·시행 기준)', CF&&CF.y===C.y&&CF.n===344&&CF.basis==='2025. 10. 1. 시행 기준'&&CF.dir===C.y+'/', cfg&&cfg.slice(0,80));
const miss=[]; for(let i=1;i<=344;i++){ const f=path.join(VD,String(C.y),String(i).padStart(3,'0')+'.webp'); if(!fs.existsSync(f)||fs.statSync(f).size<3000)miss.push(i); }
ok('쪽 그림 344장(webp)', !miss.length, miss.slice(0,20).join(','));
const extra=fs.existsSync(path.join(VD,String(C.y)))?fs.readdirSync(path.join(VD,String(C.y))).filter(f=>!/^\d{3}\.webp$/.test(f)||+f.slice(0,3)>344):['폴더 없음']; ok('그림 폴더에 다른 파일 없음', !extra.length, extra.join(','));
if(CF){ const pm={}; Object.entries(CF.pages).forEach(([p,a])=>a.forEach(no=>{ if(!(no in pm))pm[no]=+p; }));
  const d=Object.keys(M).filter(k=>pm[k]!==M[k]); ok('보기 화면 쪽별 조문 = 앱 연결 표', !d.length&&Object.keys(pm).length===Object.keys(M).length, d.slice(0,10).join(',')); }
ok('보기 화면: 쪽 넘김은 방문 기록 안 늘림(replaceState)·확대 허용·출처 표시', /history\.replaceState/.test(V)&&!/history\.pushState/.test(V)&&!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(V)&&/출처: 안전보건공단/.test(V), '');
const SW=fs.readFileSync(path.join(base,'service-worker.js'),'utf8');
ok('서비스워커 v9: 페이지 열기는 앱 화면 주소만·버전 응답', /CACHE_NAME = 'lawon-v9'/.test(SW)&&/req\.mode === 'navigate' && APP_PATHS\.indexOf\(url\.pathname\) >= 0/.test(SW)&&/LAWON_VER/.test(SW)&&/SW_VER = 9/.test(SW), '');
// 2026-10-23: 본문 없이 옮겨진 조문 3개 — 법령집과 같은 이동 표기, 옮겨간 조문 실재, 적용 판단·키워드 검색 제외 코드
const MV={'제336조':['제333조','[종전 제336조는 제333조로 이동 <2023.11.14.>]'],'제337조':['제331조의3','[종전 제337조를 제331조의3으로 이동 <2023.11.14.>]'],'제610조':['제4조의2','[종전 제610조는 제4조의2로 이동 <개정 2012.3.5.>]']};
for(const [no,[to,note]] of Object.entries(MV)){ const e=by[no]; ok(no+' 이동 표기 → '+to, e&&e.mv&&e.mv.to===to&&e.mv.note===note&&by[to]&&(by[to].x||'').trim(), e&&JSON.stringify(e.mv)); }
const mvAll=D.arts.filter(e=>e.mv).map(e=>e.l+':'+e.no); ok('이동 표기 조문은 이 3개뿐', mvAll.join(',')==='RULE:제336조,RULE:제337조,RULE:제610조', mvAll.join(','));
ok('옮겨진 조문: 적용 판단 없음·조 번호로만 검색·상세 화면 이동 칸', /if\(D\.meta\.laws\[e\.l\]\.nj\|\|e\.mv\)e\.nj=1/.test(html)&&/if\(e\.mv&&!toks\.some/.test(html)&&/옮겨간 조문<\/h3>/.test(html), '');
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
