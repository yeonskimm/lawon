// 안전보건규칙 조문 → 안전보건공단 「만화로 보는 산업안전보건기준에 관한 규칙」 쪽 연결 검사 — 사용: node tests/comic_check.js index.html
// 2026-10-23: 2026년판(전자책 Dir 647, 344쪽) PDF 쪽마다 '제N조(' 제목을 뽑아 만든 조문 → 첫 쪽 표(D.comic)
// 5-68: 우리 사이트 쪽 보기 comic/(index.html·2026/NNN.webp)와 서비스워커 v9 범위도 확인
// 5-82: 다음 쪽까지 이어지는 조문의 끝 쪽(D.comic.to 62개)·보기 화면 이어지는 쪽(CFG.cont)
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
// 2026-10-24(5-75) 조문 카드 줄 문구: 책 이름(굵게) + 판·쪽(회색) — 사용자 결정
ok("조문 카드 줄 '만화로 보는 안전보건규칙' + 'N년판 N쪽'(5-82: 이어지는 조문은 'N~N쪽')", html.includes("<b>만화로 보는 안전보건규칙</b> <span>'+esc(String(c.y))+'년판 '+p+(q?'~'+q:'')+'쪽</span>")&&!html.includes('<b>만화로 보기</b>'));
// 2026-10-25(5-82) 다음 쪽까지 이어지는 조문의 끝 쪽 — 쪽 그림으로 판별(맨 위가 조문 칸 윗줄로 시작하는 쪽 62개, 모두 눈 확인 — app-dev scripts/claude_comic_end_20261025.py)
const TO=C.to||{}, TK=Object.keys(TO);
ok('이어지는 조문 62개·모두 두 쪽(시작 쪽 + 1)', TK.length===62&&TK.every(k=>M[k]&&TO[k]===M[k]+1), TK.length+' '+JSON.stringify(TK.filter(k=>!(M[k]&&TO[k]===M[k]+1)).slice(0,5)));
const order=R.filter(e=>M[e.no]).map(e=>e.no), lateEnd=[];
order.forEach((no,i)=>{ const nx=order[i+1]; if(TO[no]&&nx&&M[nx]<TO[no])lateEnd.push(no+'→'+nx); });
ok('끝 쪽이 다음 조문 첫 쪽보다 뒤가 아님', !lateEnd.length, lateEnd.join(','));
ok('한 쪽이 두 조문의 끝 쪽이 아님', new Set(Object.values(TO)).size===TK.length, '');
for(const [k,s,e] of [['제38조',28,29],['제56조',38,39],['제57조',39,40],['제87조',61,62],['제96조',65,66],['제156조',86,87],['제162조',88,89],['제321조',155,156],['제331조의3',162,163],['제542조',249,250],['제651조',298,299],['제672조',311,312]])
  ok(k+' → '+s+'~'+e+'쪽(책 쪽 확인)', M[k]===s&&TO[k]===e, M[k]+'~'+TO[k]);
for(const k of ['제1조','제42조','제93조','제95조','제97조','제619조','제674조']) ok(k+' 한 쪽(끝 쪽 없음)', M[k]&&!(k in TO), TO[k]);
if(CF){ const CN=CF.cont||{}; ok('보기 화면 이어지는 쪽(cont) = 앱 끝 쪽 표', Object.keys(CN).length===TK.length&&TK.every(k=>CN[String(TO[k])]===k), Object.keys(CN).length); }
ok('조문 화면 코드: q = 끝 쪽', html.includes("var p=c.map[e.no], q=c.to&&c.to[e.no]; if(!p)return '';"), '');
ok('보기 화면 머리 띠: 연 조문이 이어지면 그 이름, 시작 조문 없으면 이어지는 조문', V.includes("cn=CFG.cont[n]||'', t=a&&(arts.indexOf(a)>=0||cn===a)?a:(arts[0]||cn)")&&V.includes("var al=(cn?[cn]:[]).concat(arts)"), '');
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
