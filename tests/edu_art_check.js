// 법ON 조문 화면 교육시간(시행규칙 별표4) 검사 — 사용: node tests/edu_art_check.js index.html  (2026-10-19, 5-44)
// 기대값은 산업안전보건법 시행규칙 [별표 4](개정 2025. 5. 30., 2026-10-19 법제처 현행) 원문 기준 — 코드가 아닌 원문에서 옮김
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/<\\\//g,'</');
const core=h.slice(h.indexOf('/*CORE_START*/'),h.indexOf('/*CORE_END*/')+12);
const C=vm.runInNewContext(core+'\n;({prepare,eduOf:typeof eduOf==="function"?eduOf:null})',{});
const D=C.prepare(JSON.parse(raw)), B=D.bt;
let fail=0,n=0; const ok=(name,c,info)=>{ n++; if(!c){ fail++; console.log('FAIL '+name+(info===undefined?'':'  → '+JSON.stringify(info).slice(0,300))); } };
const sp=t=>(t||'').replace(/\s+/g,'');
const E=k=>C.eduOf?C.eduOf(D,k):null, Z={via:'',secs:[{h:'',rows:[]}]}, Es=k=>E(k)||Z;
const vals=k=>{ const e=E(k); return e?[].concat(...e.secs.map(S=>S.rows.filter(r=>r.t!=='비고').map(r=>sp(r.v)))):[]; };
const heads=k=>{ const e=E(k); return e?e.secs.map(S=>S.h):[]; };
const has=(k,t)=>vals(k).some(v=>v.indexOf(sp(t))>=0);

ok('CORE eduOf 있음',!!C.eduOf);
// 1. 별표4 원문 값(줄 데이터가 원문과 같은지 — 조문 화면은 이 줄을 그대로 보여줌)
const S4=B.tabById.S4, R=id=>B.byId[id]||{};
ok('별표4 구획 5개(1·1의2·2·3·4호)',S4&&S4.secs.length===5,S4&&S4.secs.map(s=>s.h));
const EXP=[['S4.1','매반기 6시간 이상'],['S4.3','매반기 12시간 이상'],['S4.4','1시간 이상'],['S4.5','4시간 이상'],['S4.6','8시간 이상'],['S4.8','2시간 이상'],
  ['S4.10','8시간 이상'],['S4.12','4시간 이상'],['S4.14','연간 16시간 이상'],['S4.15','8시간 이상'],['S4.16','2시간 이상'],
  ['S4.19','신규교육 6시간 이상 · 보수교육 6시간 이상'],['S4.20','신규교육 34시간 이상 · 보수교육 24시간 이상'],['S4.24','신규교육 - · 보수교육 8시간 이상'],
  ['S4.26','2시간 이상(단기간 작업 또는 간헐적 작업에 노무를 제공하는 경우에는 1시간 이상 실시하고, 특별교육을 실시한 경우는 면제)'],['S4.29','28시간 이상']];
EXP.forEach(([id,v])=>ok('별표4 '+id+' '+v,sp(R(id).v)===sp(v),R(id).v));
ok('별표4 구획 관련 조문(원문 괄호)',['제26조제1항, 제28조제1항 관련','제26조제1항 관련','제29조제2항 관련','제95조제1항 관련','제131조제2항 관련'].every((t,i)=>S4.secs[i]&&S4.secs[i].rel===t),S4.secs.map(s=>s.rel));

// 2. 시행규칙 조문이 실제로 별표4를 가리키는지(본문) — 연결 근거
['SR:제26조','SR:제28조','SR:제29조','SR:제95조','SR:제131조'].forEach(k=>ok(k+' 본문에 별표 4',/별표 ?4(와|에)/.test((D.byKey[k]||{}).x||'')));

// 3. 조문 → 표시 구획
ok('법 제29조: 근로자·관리감독자',JSON.stringify(heads('OSH:제29조'))===JSON.stringify(['근로자 안전보건교육','관리감독자 안전보건교육']),heads('OSH:제29조'));
ok('법 제29조: 정기 매반기 12시간·관리감독자 연간 16시간',has('OSH:제29조','매반기 12시간 이상')&&has('OSH:제29조','연간 16시간 이상'));
ok('법 제29조: 건설업 기초교육 줄 없음(제31조 몫)',!!E('OSH:제29조')&&!Es('OSH:제29조').secs[0].rows.some(r=>r.id==='S4.12'));
ok('법 제29조: 비고 2개(근로자·관리감독자)',!!E('OSH:제29조')&&Es('OSH:제29조').secs.every(S=>S.rows.filter(r=>r.t==='비고').length===1));
ok('규칙 제26조 = 법 제29조',JSON.stringify(E('SR:제26조'))===JSON.stringify(E('OSH:제29조')));
ok('법 제31조·규칙 제28조: 건설 일용 4시간만',['OSH:제31조','SR:제28조'].every(k=>{ const e=E(k); return e&&e.secs.length===1&&e.secs[0].rows.length===1&&e.secs[0].rows[0].id==='S4.12'; }));
ok('법 제32조: 직무교육 7줄, 관리감독자 없음',E('OSH:제32조')&&E('OSH:제32조').secs.length===1&&E('OSH:제32조').secs[0].rows.length===7&&!has('OSH:제32조','연간 16시간'));
ok('규칙 제29조 = 법 제32조',JSON.stringify(E('SR:제29조'))===JSON.stringify(E('OSH:제32조')));
ok('법 제77조·규칙 제95조: 특고(최초 2시간·특별·비고)',['OSH:제77조','SR:제95조'].every(k=>{ const e=E(k); return e&&e.secs[0].rows.length===3&&has(k,'2시간 이상(단기간'); }));
ok('규칙 제131조: 성능검사 28시간',has('SR:제131조','28시간 이상')&&vals('SR:제131조').length===1);
ok('법 제16조(관리감독자): 관리감독자 구획만, 근거 법 제29조',E('OSH:제16조')&&E('OSH:제16조').via==='OSH:제29조'&&JSON.stringify(heads('OSH:제16조'))===JSON.stringify(['관리감독자 안전보건교육']));
['OSH:제30조','OSH:제33조','SR:제30조','OSH:제17조','GK:제29조'].forEach(k=>ok(k+' 교육시간 카드 없음',E(k)===null));
ok('연결 조문 모두 앱에 있음',['OSH:제29조','SR:제26조','OSH:제31조','SR:제28조','OSH:제32조','SR:제29조','OSH:제77조','SR:제95조','SR:제131조','OSH:제16조'].every(k=>!!D.byKey[k]));
ok('시행규칙 조문의 모법 = 같은 구획을 보여주는 법 조문',[['SR:제26조','OSH:제29조'],['SR:제28조','OSH:제31조'],['SR:제29조','OSH:제32조'],['SR:제95조','OSH:제77조']].every(([a,b])=>((D.byKey[a]||{}).up||[])[0]===b));

// 4. 별표4를 옮겨 적은 사본(eduTime·주요 의무 edu)이 별표4 줄과 같은지 — 개정 때 한쪽만 고치는 것 방지
const S4v=B.tabRows.S4.filter(r=>r.v).map(r=>sp(r.v.replace(/^[가-힣]\)\s*/gm,'')));
const cp=t=>sp(t.replace(/ \/ /g,''));
D.eduTime.forEach((x,i)=>ok('eduTime['+i+'] = 별표4 줄 ('+x.s+' '+x.c+')',S4v.indexOf(cp(x.t))>=0,x.t));
D.items.forEach(it=>(it.edu||[]).forEach((x,i)=>ok('주요 의무 '+it.id+' edu['+i+'] = 별표4 줄',S4v.indexOf(cp(x.t))>=0,x.t)));

console.log((fail?'실패 '+fail+'건':'통과')+' / '+n+'건');
process.exit(fail?1:0);
