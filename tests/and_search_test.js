// AND 연계 검색 회귀 테스트 — 빌드 키트 없이 index.html 하나로 실행
// 사용: node and_search_test.js index.html
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)||[])[1];
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
if(!raw||!core){console.log('데이터 또는 핵심 로직 블록을 찾지 못함');process.exit(1);}
const C=vm.runInNewContext(core+'\n;({norm:norm,prepare:prepare,patchOSH:typeof patchOSH==="function"?patchOSH:null,splitQuery:splitQuery,search:search})',{});
const D=C.prepare(JSON.parse(raw.replace(/<\\\//g,'</'))); if(C.patchOSH)C.patchOSH(D);
const ord=['GK','OSH','RULE','EQ','FT','RET','MW','DISP','LMC'];
let fail=0; const ok=(n,c,i)=>{console.log(c?'PASS':'FAIL',n,c?'':(i||''));if(!c)fail++;};
const top=(q,k=5)=>C.search(D,q,'',ord).arts.slice(0,k).map(e=>e.l+' '+e.no);
let r;
r=top('지게차',8); ok('지게차 → 규칙 제179~183조',['제179조','제180조','제181조','제182조','제183조'].every(n=>r.includes('RULE '+n)),r.join(', '));
r=top('산안법상 지게차',8); ok('"산안법상 지게차" 법령 힌트',r.length>0&&r.every(x=>!x.startsWith('GK')),r.join(', '));
r=top('주휴'); ok('주휴 → 근기법 제55조 1순위',r[0]==='GK 제55조',r.join(', '));
r=top('휴게시간'); ok('휴게시간 → 근기법 제54조 1순위',r[0]==='GK 제54조',r.join(', '));
r=top('임금체불'); ok('임금체불 → 제43조·제36조 상위',r.slice(0,2).sort().join()==='GK 제36조,GK 제43조',r.join(', '));
r=top('비계',6); ok('비계 → 규칙 조문',r.every(x=>x.startsWith('RULE')),r.join(', '));
// 2026-09-25 기대값 갱신: 시행령·시행규칙 조문 수록(2026-09-24) 반영
const sq=C.splitQuery('산안법상, 지게차,헤드가드 / 지게차'); ok('쉼표·빗금 분리, 중복 제거, 법령 이름 분리',sq.toks.join()==='지게차,헤드가드'&&(sq.hint||[]).join()==='OSH,SD,SR,RULE'&&(sq.lawToks||[]).join()==='산안법상',JSON.stringify(sq));
ok('쉼표만 써도 AND: 지게차,헤드가드 → 규칙 제180조 1순위 + 산안법 시행규칙 제98조(방호조치: 지게차 헤드 가드)',(function(t){return t[0]==='RULE 제180조'&&t.includes('SR 제98조')&&t.length===2;})(top('지게차,헤드가드')),top('지게차,헤드가드').join());
ok('띄어쓰기·쉼표·빗금·+ 결과 동일',['지게차 헤드가드','지게차, 헤드가드','지게차/헤드가드','지게차+헤드가드'].every(q=>top(q,9).join()===top('지게차,헤드가드',9).join()));
ok('법령 이름에 쉼표: 산안법,지게차 = 산안법 지게차',top('산안법,지게차',9).join()===top('산안법 지게차',9).join());
ok('조문 번호에 쉼표: 제54조,휴게 → 근기법 제54조 1순위',top('제54조,휴게')[0]==='GK 제54조',top('제54조,휴게').join());
ok('용어사전 고정 조문도 AND: 주휴 지게차 → 0건',C.search(D,'주휴 지게차','',ord).total===0);
ok('고정 조문은 자기 검색어에서는 유지: 주휴,휴일 → 제55조 1순위',top('주휴,휴일')[0]==='GK 제55조',top('주휴,휴일').join());
ok('법령 이름 둘 → 합쳐서 거름: 근기법, 산안법, 휴게',(function(){var b=C.search(D,'근기법, 산안법, 휴게','',ord).byLaw||{};return b.GK>0&&b.OSH>0&&!b.EQ;})());
ok('구분자만 넣어도 오류 없음',C.search(D,' , / ','',ord).total===0);
console.log(fail?('실패 '+fail+'건'):'전체 통과'); process.exit(fail?1:0);
