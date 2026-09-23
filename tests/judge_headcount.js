// 법ON 안전·보건관리자 인원 판정 테스트 — 사용: node tests/judge_headcount.js index.html [비교할_이전판.html]
// 배포용 HTML에서 핵심 로직(/*CORE_START*/~/*CORE_END*/)과 데이터를 꺼내 검사(빌드 키트 없이도 실행 가능)
const fs=require('fs'), vm=require('vm');
function load(p){ const s=fs.readFileSync(p,'utf8');
  const data=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(s)[1].replace(/<\\\//g,'</');
  const js=s.slice(s.indexOf('/*CORE_START*/'),s.indexOf('/*CORE_END*/'));
  const ctx={}; vm.createContext(ctx); vm.runInContext(js+';this.C={prepare,judgeItem,judgeArt,search,headcount:typeof headcount==="function"?headcount:null,HCI:typeof HCI==="object"?HCI:null};',ctx);
  return {C:ctx.C, D:ctx.C.prepare(JSON.parse(data))}; }
const A=load(process.argv[2]), C=A.C, D=A.D;
let fail=0; const ok=(n,c,i)=>{console.log(c?'PASS':'FAIL',n,c?'':(i===undefined?'':JSON.stringify(i))); if(!c)fail++;};
const P=(id,n,amt)=>{const s=D.inds.find(x=>x.id===id); return {id,n,amt:amt==null?null:amt,ind:s?s.g:'',ov:s&&s.ov||null};};
const I=id=>D.items.find(x=>x.id===id), HC=(it,id,n,amt)=>C.headcount(I(it),P(id,n,amt)), J=(it,id,n,amt)=>C.judgeItem(I(it),P(id,n,amt),'2026-09-22');
ok('모든 업종(건설업·그 밖의 업종 제외)이 인원 표에 연결', D.inds.filter(x=>!['const','etc'].includes(x.id)).every(x=>C.HCI[x.id]), D.inds.filter(x=>!C.HCI[x.id]).map(x=>x.id));
ok('제조업(화학 등) 60명 → 1명, 600명 → 2명', HC('o_safe','mfgHeavy',60).one===1&&HC('o_safe','mfgHeavy',600).one===2);
ok('운수·창고 600명 → 2명(제27호)', HC('o_safe','trans',600).one===2);
ok('도매업 600명 → 1명, 1천명 → 2명(제28~48호)', HC('o_safe','wholesale',600).one===1&&HC('o_safe','wholesale',1000).one===2);
ok('섬유·의복·가죽·인쇄 600명 → 세부 업종에 따라 다름(2명/1명)', HC('o_safe','mfgEtc',600).one===null&&HC('o_safe','mfgEtc',600).rows.map(r=>r.t[r.cur][1]).join()==='2,1');
ok('섬유·의복·가죽·인쇄 100명 → 1명', HC('o_safe','mfgEtc',100).one===1);
ok('부동산업(관리업 제외) 60명 → 기준 미만, 150명 → 1명', HC('o_safe','realty',60).one===null&&HC('o_safe','realty',150).one===1);
ok('금융·보험 → 선임 대상 아님', !!HC('o_safe','fin',500).none);
ok('건설 60억 → 1명, 1,000억 → 2명(앞뒤 15% 1명), 1,600억 → 3명', HC('o_safe','const',30,60).one===1&&HC('o_safe','const',30,1000).one===2&&HC('o_safe','const',30,1000).cons.t[HC('o_safe','const',30,1000).cons.cur][3]===1&&HC('o_safe','const',30,1600).one===3);
ok('건설 1조2천억 → 12명, 2조5천억 → 17명(계산값)', HC('o_safe','const',30,12000).one===12&&HC('o_safe','const',30,25000).one===17);
ok('건설 40억 → 대상 아님', HC('o_safe','const',30,40).one==null);
ok('도소매 600명 → 1명, 5천명 → 2명(제24~43호)', HC('o_health','retail',600).one===1&&HC('o_health','retail',5000).one===2);
ok('제조업(화학 등) 600명 → 2명/1명(목재 등은 제23호)', HC('o_health','mfgHeavy',600).one===null);
ok('제조업(화학 등) 300명 → 1명', HC('o_health','mfgHeavy',300).one===1);
ok('사진 처리업 60명 → 기준 미만, 150명 → 1명', HC('o_health','photo',60).one===null&&HC('o_health','photo',150).one===1);
ok('건설 2,300억 → 공사금액 기준 2명, 1,300명 → 인원 기준 2명', HC('o_health','const',100,2300).hcons.byA===2&&HC('o_health','const',1300,900).hcons.byN===2);
ok('건설 900억·1,300명 → 금액 1명·인원 2명이라 하나로 안 정함', HC('o_health','const',1300,900).one===null);
ok('예술·스포츠·여가 60명 보건관리자 → 확인 필요(골프장 운영업)', J('o_health','leisure',60).st==='cond');
ok('수리·개인 서비스 60명 보건관리자 → 확인 필요(수리업·세탁업)', J('o_health','repair',60).st==='cond');
ok('예술·스포츠·여가 30명 → 비적용', J('o_health','leisure',30).st==='na');
ok('다른 업종은 그대로(도소매 60명 적용)', J('o_health','retail',60).st==='apply');
if(process.argv[3]){ const B=load(process.argv[3]); let n=0,d=0;
  const N=[null,0,3,4.9,5,10,20,49,50,99,100,299,300,499,500,599,600,999,1000,2000,5000], AM=[null,1,20,50,120,150,800,1000,1500,10000];
  for(const s of [null].concat(D.inds.map(x=>x.id))) for(const n0 of N) for(const a of (s==='const'?AM:[null])){
    const p=P(s,n0,a), q=Object.assign({},p);
    D.items.forEach((it,k)=>{ n++; const x=C.judgeItem(it,p,'2026-09-22'), y=B.C.judgeItem(B.D.items[k],q,'2026-09-22'); if(x.st!==y.st||x.why!==y.why)d++; });
    D.arts.forEach((e,k)=>{ if(e.l==='RULE')return; n++; const x=C.judgeArt(e,p), y=B.C.judgeArt(B.D.arts[k],q); if(x.st!==y.st||x.why!==y.why)d++; }); }
  ok('이전판과 판정 비교 '+n.toLocaleString()+'건 중 차이 '+d+'건', d===0); }
console.log(fail?'실패 '+fail+'건':'전체 통과'); process.exit(fail?1:0);
