// 법ON 조문 화면 교육시간(시행규칙 별표4) 검사 — 사용: node tests/edu_art_check.js index.html  (2026-10-19, 5-44)
// 기대값은 산업안전보건법 시행규칙 [별표 4](개정 2025. 5. 30., 2026-10-19 법제처 현행) 원문 기준 — 코드가 아닌 원문에서 옮김
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/<\\\//g,'</');
const core=h.slice(h.indexOf('/*CORE_START*/'),h.indexOf('/*CORE_END*/')+12);
const C=vm.runInNewContext(core+'\n;({prepare,eduOf:typeof eduOf==="function"?eduOf:null,EDU_NOTE:typeof EDU_NOTE==="undefined"?null:EDU_NOTE,EDU_GL:typeof EDU_GL==="undefined"?null:EDU_GL})',{});
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

// 5. 접힌 비고 줄 안내(5-84) — 안내 낱말이 모두 그 비고 원문에 있는지(별표 4가 바뀌면 안내도 다시 봄)
ok('CORE EDU_NOTE 있음',!!C.EDU_NOTE);
const NOTE_EXP={'S4.13':'교육 면제 · 교육시간 2분의 1 이상','S4.18':'교육시간 2분의 1 이상','S4.28':'유해화학물질 안전교육'};
Object.keys(NOTE_EXP).forEach(id=>{ const t=(C.EDU_NOTE||{})[id]; ok('비고 안내 '+id,t===NOTE_EXP[id],t);
  const x=sp(R(id).x); ok('비고 안내 낱말이 원문에 '+id,!!t&&R(id).t==='비고'&&t.split(/\s*·\s*|\s+/).every(w=>x.indexOf(w)>=0),t); });
ok('비고 안내 대상 = 조문 카드에 나오는 비고 줄',JSON.stringify(Object.keys(C.EDU_NOTE||{}).sort())===JSON.stringify([...new Set([].concat(...Object.keys({'OSH:제29조':1,'OSH:제16조':1,'OSH:제77조':1}).map(k=>[].concat(...Es(k).secs.map(S=>S.rows.filter(r=>r.t==='비고').map(r=>r.id))))))].sort()));
// 6. 비고가 가리키는 곳 풀이(5-85) — 짝이 원문과 맞는지(별표 4 줄 목 이름, 시행령 별표 1 제1호, 시행령 제67조제13호라목)
const GL=C.EDU_GL||{};
ok('CORE EDU_GL 있음',!!C.EDU_GL);
ok('풀이 대상 = 비고 안내 대상',JSON.stringify(Object.keys(GL).sort())===JSON.stringify(Object.keys(NOTE_EXP).sort()),Object.keys(GL));
const nlines=id=>(R(id).x||'').replace(/^비고:?\s*/,'').replace(/\n\s*/g,'\n').replace(/^\d+\.\s*삭제\s*<[^<>\n]*>\n?/gm,'').trim().split('\n');
const mok=t=>t.split(' · ').map(x=>/^([가-힣])목 (.+)$/.exec(x)).map(m=>m?[m[1],m[2]]:null);
const names={'S4.13':new Set(S4.secs[0].rows.map(id=>R(id).up).filter(Boolean)),'S4.18':new Set(S4.secs[1].rows.map(id=>R(id).t))};
Object.keys(GL).forEach(id=>{ const L=nlines(id);
  GL[id].forEach((g,gi)=>{ const nm=id+' 풀이 '+(gi+1)+' '+g.k;
    if(g.at)ok(nm+' 붙는 줄 하나',L.filter(l=>l.indexOf(g.at)===0).length===1,L.filter(l=>l.indexOf(g.at)===0));
    const line=g.at?L.find(l=>l.indexOf(g.at)===0):L.join(' ');
    if(g.k==='위 표'){ const M=mok(g.t);
      ok(nm+' 목 이름이 별표 4 표와 같음',M.every(m=>m&&names[id].has(m[0]+'. '+m[1])),M);
      const ref=/위 표의 ([가-힣])목 또는 ([가-힣])목/.exec(line), rng=/위 표의 ([가-힣])목부터 ([가-힣])목까지/.exec(line), H='가나다라마바사';
      const want=ref?[ref[1],ref[2]]:rng?H.slice(H.indexOf(rng[1]),H.indexOf(rng[2])+1).split(''):null;
      ok(nm+' 원문이 가리키는 목과 같음',!!want&&JSON.stringify(M.map(m=>m&&m[0]))===JSON.stringify(want),[want,M]); }
    else if(g.k==='영 별표 1 제1호'){ const r=B.byId[g.br]||{}, laws=g.t.match(/「[^」]+」/g)||[];
      ok(nm+' 시행령 별표 1 제1호 줄',g.br==='SD1.1'&&r.tb==='SD1'&&r.no==='1');
      ok(nm+' 법 이름이 모두 제1호 각 목 원문에',laws.length===((r.sub||'').match(/^[가-힣]\./gm)||[]).length&&laws.every(x=>(r.sub||'').indexOf(x+' 적용 사업')>=0),[laws,r.sub]);
      ok(nm+' 원문이 영 별표 1 제1호를 가리킴',/영 별표 1 제1호/.test(L.join(' '))||id==='S4.18'); }
    else if(g.k==='제1호의 비고 제3호 각 목'){ const L13=nlines('S4.13');
      ok(nm+' 각 목 = 제1호 비고 3의 가·나목 원문',g.t.split('\n').every(x=>L13.indexOf(x)>=0)&&g.t.split('\n').length===2,g.t);
      ok(nm+' 원문이 제1호의 비고 제3호를 가리킴',line.indexOf('제1호의 비고 제3호 각 목')>=0); }
    else if(g.k==='영 제67조제13호라목'){ const a=(D.byKey[g.art]||{}).x||'';
      ok(nm+' 시행령 제67조 제13호 화물차주·라목 위험물질 운송',g.art==='SD:제67조'&&/13\.[^\n]*화물차주/.test(a)&&sp(a).indexOf(sp('라. 「자동차관리법」 제3조제1항제3호의 일반형 화물자동차나 특수용도형 화물자동차로 「물류정책기본법」 제29조제1항 각 호의 위험물질을 운송하는 사람'))>=0);
      ok(nm+' 풀이 낱말이 제67조 원문에',g.t.split(/\s+/).every(w=>sp(a).indexOf(w)>=0),g.t);
      ok(nm+' 원문이 영 제67조제13호라목을 가리킴',line.indexOf('영 제67조제13호라목')>=0); }
    else ok(nm+' 알 수 없는 풀이',false,g); }); });
console.log((fail?'실패 '+fail+'건':'통과')+' / '+n+'건');
process.exit(fail?1:0);
