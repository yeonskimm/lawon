// 법ON 사용자 입장 점검 정비 검사(2026-10-22, 작업안내 5-63) — 사용: node tests/ux_check.js index.html
// 적용 확인 법별 목록·첫 화면 법 이름·검색 칩 순서·짧은 이름·주요 의무 줄 '없음' 표시
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue})',{});
let fail=0,n=0; const ok=(name,c,x)=>{n++; if(!c)fail++; console.log((c?'PASS ':'FAIL ')+name+(c?'':'  → '+JSON.stringify(x)));};
const R=JSON.parse(raw), L=R.meta.laws, D=C.prepare(C.applyDue(JSON.parse(raw),'2026-10-22'));
// ① 적용 확인(근로기준) 법별 접힌 목록 — 벌칙·과태료가 붙은 조문이 있는 근로기준 법률은 모두
const m=/\[((?:'[A-Z]+',?)+)\]\.forEach\(function\(k\)\{ if\(!D\.meta\.laws\[k\]\)return;/.exec(html), list=m?m[1].replace(/'/g,'').split(','):[];
const LF=(/labor:\{[^\n]*?first:\[([^\]]*)\]/.exec(html)[1]).replace(/'/g,'').split(',');
const need=LF.filter(c=>c!=='GK'&&!/(D|R)$/.test(c)&&L[c]&&!L[c].proc&&!L[c].sasu&&!L[c].nj&&!L[c].gosi&&R.arts.some(e=>e.l===c&&e.s&&e.s.length));
ok('적용 확인 법별 목록에 근로기준 분야 법률 전부(임금채권보장법·고령자고용법·건설근로자법·가사근로자법 포함)',need.every(c=>list.includes(c))&&['WG','AG','CW','DW'].every(c=>list.includes(c)),{need,list});
ok('적용 확인 법별 목록 순서 = 분야 법령 순서',JSON.stringify(list)===JSON.stringify(LF.filter(c=>list.includes(c))),list);
// ② 첫 화면 근로기준 카드 법 이름
const card=/data-field="labor">[\s\S]*?<span class="pls">([\s\S]*?)<\/span><\/span>/.exec(html), names=card?[...(card[1]+'</span>').matchAll(/<span class="pl">([^<]*)<\/span>/g)].map(x=>x[1]):[];
ok('첫 화면 근로기준 카드: 법률 13개(임금채권보장법·고령자고용법·건설근로자법·가사근로자법 포함)',names.length===13&&['임금채권보장법','고령자고용법','건설근로자법','가사근로자법'].every(x=>names.includes(x)),names);
// ③ 검색 칩 순서 — 결과에 먼저 나온 법령 순서
const ord=Object.keys(L);
{ const r=C.search(D,'퇴직금','',LF,LF); ok('퇴직금 → 칩 첫 법령이 결과 1위 법령(퇴직급여법)',r.lawOrd&&r.lawOrd[0]===r.arts[0].l&&r.lawOrd[0]==='RET',r.lawOrd&&r.lawOrd.slice(0,3)); }
{ const r=C.search(D,'퇴직금','RETD',LF,LF), r0=C.search(D,'퇴직금','',LF,LF); ok('칩으로 거를 때도 칩 순서 그대로(거르기 전 결과 기준)',JSON.stringify(r.lawOrd)===JSON.stringify(r0.lawOrd)); }
ok('칩 코드: r.lawOrd 사용, 같은 줄의 전체 건수 합계 그대로',html.includes("var laws=(r.lawOrd||ord).filter(function(k){return r.byLaw[k];}), allN=0; laws.forEach(function(k){allN+=r.byLaw[k];});"));
{ const r=C.search(D,'퇴직금','RETD',LF,LF); ok('칩으로 거르면 그 법령 조문만(같은 줄 if(law) 거르기 그대로)',r.arts.length>0&&r.arts.every(e=>e.l==='RETD'),[...new Set(r.arts.map(e=>e.l))]); }
// ④ 짧은 이름
ok('근기법·최임법 시행령·시행규칙 짧은 이름',L.GKD.short==='근기법 시행령'&&L.GKR.short==='근기법 시행규칙'&&L.MWD.short==='최임법 시행령'&&L.MWR.short==='최임법 시행규칙'&&R.bt.laws.GKD.short==='근기법 시행령');
ok('하위법령 짧은 이름이 모법 짧은 이름으로 시작(모법 짧은 이름이 정식 이름과 다를 때)',Object.keys(L).filter(c=>/(D|R)$/.test(c)&&L[c.slice(0,-1)]&&L[c].name.startsWith(L[c.slice(0,-1)].name+' 시행')&&L[c.slice(0,-1)].short!==L[c.slice(0,-1)].name).every(c=>L[c].short.startsWith(L[c.slice(0,-1)].short+' ')),Object.keys(L).filter(c=>/(D|R)$/.test(c)&&L[c.slice(0,-1)]&&L[c].name.startsWith(L[c.slice(0,-1)].name+' 시행')&&!L[c].short.startsWith(L[c.slice(0,-1)].short)).map(c=>c+':'+L[c].short));
ok("검색: '근로기준법 시행령'·'근기법 시행령' 모두 시행령 조문",C.search(D,'근로기준법 시행령','',LF,LF).arts.every(e=>e.l==='GKD')&&C.search(D,'근기법 시행령','',LF,LF).arts.every(e=>e.l==='GKD'));
// ⑤ 주요 의무 줄
ok("목록 줄: 제재가 있으면 '없음' 항목은 뺌",html.includes("real=list.some(function(z){return z.kind!=='없음';})")&&html.includes("if(seen[k]||(real&&z.kind==='없음'))return;"));
console.log(fail?('실패 '+fail+'건 / '+n+'건'):'전체 통과 '+n+'건'); process.exit(fail?1:0);
