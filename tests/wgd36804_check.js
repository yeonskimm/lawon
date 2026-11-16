// 임금채권보장법 시행령 대통령령 제36804호(2026-11-10 공포·시행, 타법개정) 반영 확인 — 제13조·제16조 고시 방법. 사용: node tests/wgd36804_check.js index.html
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue})',{});
const mk=d=>C.prepare(C.applyDue(JSON.parse(raw),d));
let f=0;const ok=(n,c)=>{if(!c)f++;console.log((c?'PASS ':'FAIL ')+n);};
const b=mk('2026-11-09'),t=mk('2026-11-16'),g=(D,k)=>D.byKey[k];
for(const no of ['제13조','제16조']){
  const k='WGD:'+no;
  ok('11.9 '+no+' 개정 전',/관보 및 .*일반일간신문 1개 이상에 고시하여야/.test(g(b,k).x)&&!!g(b,k).chg);
  ok('11.16 '+no+' 관보 고시 + 일간신문 또는 인터넷 홈페이지',/관보에 고시하고, .*일반일간신문 또는 인터넷 홈페이지에도 이를 고시해야 한다\. <개정 2026\.11\.10>/.test(g(t,k).x)&&!g(t,k).chg&&!!g(t,k).old);
}
ok('11.16 제20조의3 2027 개정 예정 유지',!!g(t,'WGD:제20조의3').chg&&/1억원/.test(g(t,'WGD:제20조의3').x));
const r=C.search(t,'부담금비율 고시','',['WGD']);ok('검색 부담금비율 고시 → 제13조',r.arts.some(x=>x.l==='WGD'&&x.no==='제13조'));
process.exit(f?1:0);
