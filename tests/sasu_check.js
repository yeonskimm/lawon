// 법ON 수사 법령 수록 검사(2026-10-21, 작업안내 5-52) — 사용: node tests/sasu_check.js index.html
// 사법경찰직무법·특별사법경찰관 협력규정·협력규칙·수사준칙: 조문 수, 원문 핵심 문구(한국법MCP 2026-10-21 확인), 개정 예정 단계,
// 수사준칙 준용 표시(협력규정 제5조 원문), 서식(앱 미수록) 연결, 검색, 하위 줄·하단 고지·분야 법령
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/<\\\//g,'</');
const core=h.slice(h.indexOf('/*CORE_START*/'),h.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,search,applyDue,missOf:typeof missOf==="function"?missOf:null})',{});
const D=C.prepare(C.applyDue(JSON.parse(raw),'2026-10-21'));
let fail=0, n=0; const ok=(m,c,i)=>{ n++; console.log((c?'PASS ':'FAIL ')+m+(c||i===undefined?'':'  → '+JSON.stringify(i).slice(0,300))); if(!c)fail++; };
const A=k=>D.byKey[k], X=k=>(A(k)||{}).x||'', CNT=l=>D.arts.filter(e=>e.l===l).length, L=D.meta.laws;
const SASU=['JPA','SPC','SPCR','ICR'];
if(!SASU.every(c=>L[c])){ ok('수사 법령 4개 수록(사법경찰직무법·협력규정·협력규칙·수사준칙)',false,SASU.filter(c=>!L[c])); console.log('\n실패 '+fail+'건'); process.exit(1); }

// ── 1. 법령 정보·조문 수 ──
const NAME={JPA:'사법경찰관리의 직무를 수행할 자와 그 직무범위에 관한 법률',SPC:'검사와 특별사법경찰관의 상호협력에 관한 규정',SPCR:'검사와 특별사법경찰관의 상호협력에 관한 규칙',ICR:'검사와 사법경찰관의 상호협력과 일반적 수사준칙에 관한 규정'};
for(const c of SASU) ok(c+' 법령 이름·절차 규정 표시(적용 판단 없음·현행 고지)',L[c]&&L[c].name===NAME[c]&&L[c].nj===1&&L[c].now===1&&L[c].sasu===1,L[c]);
ok('법령 순서: 노동감독관 직무집행법 다음 사법경찰직무법 → 협력규정 → 협력규칙 → 수사준칙',Object.keys(L).join().includes('LIO,JPA,SPC,SPCR,ICR'),Object.keys(L).join());
ok('조문 수(삭제 조문 제외): 사법경찰직무법 13 · 협력규정 35 · 협력규칙 88 · 수사준칙 88(2027-08-05 신설 2개 포함)',CNT('JPA')===13&&CNT('SPC')===35&&CNT('SPCR')===88&&CNT('ICR')===88,SASU.map(CNT));
ok('삭제 조문은 수록하지 않음(사법경찰직무법 제2조·제8조, 수사준칙 제15조·제18조)',!A('JPA:제2조')&&!A('JPA:제8조')&&!A('ICR:제15조')&&!A('ICR:제18조'));
ok('판 표기: 법률 제21995호·대통령령 제36706호·법무부령 제1170호·대통령령 제36704호(모두 2026-10-02 시행)',/제21995호.*2026-10-02 시행/.test(L.JPA.ver)&&/제36706호.*2026-10-02 시행/.test(L.SPC.ver)&&/제1170호.*2026-10-02 시행/.test(L.SPCR.ver)&&/제36704호.*2026-10-02 시행/.test(L.ICR.ver));
ok('수사준칙 장·절 경로(원문): 제19조 제3장 제3절 임의수사, 제27조 제4절 강제수사, 제62조 제4장 제3절, 제66조 제5장 보칙',
  A('ICR:제19조').p.join('|')==='제3장 수사|제3절 임의수사'&&A('ICR:제27조').p.join('|')==='제3장 수사|제4절 강제수사'&&A('ICR:제62조').p.join('|')==='제4장 사건송치와 수사종결|제3절 사건불송치와 재수사요구'&&A('ICR:제66조').p.join('|')==='제5장 보칙');
ok('협력규칙 장·절(원문): 제21조 제2장 제4절 임의수사, 제87조 제4장 장부와 비치서류',A('SPCR:제21조').p.join('|')==='제2장 수사|제4절 임의수사'&&A('SPCR:제87조').p.join('|')==='제4장 장부와 비치서류');
ok('호·목 줄 앞 한 칸(앱 표기)',X('JPA:제6조의2').includes('\n 1. 「근로기준법」')&&X('SPCR:제87조').includes('\n 1. 제76조제1항제1호: 영구'));

// ── 2. 원문 핵심 문구 ──
ok('사법경찰직무법 제6조의2①: 「근로기준법」에 따른 근로감독관 · 19개 법률(산재보험법 제127조제3항제3호만)',X('JPA:제6조의2').includes('「근로기준법」에 따른 근로감독관은 그의 관할 구역에서 발생하는')&&X('JPA:제6조의2').includes('19. 「산업재해보상보험법」(제127조제3항제3호만 해당한다)')&&X('JPA:제6조의2').includes('18. 「중대재해 처벌 등에 관한 법률」(제6조 및 제7조만 해당한다)'));
ok('사법경찰직무법 제6조의2②: 8급ㆍ9급 … 지방공소청장이 지명한 자는 사법경찰리',X('JPA:제6조의2').includes('지방공소청장이 지명한 자는 제1항의 범죄에 관하여 사법경찰리의 직무를 수행한다'));
ok('협력규정 제5조①: 수사준칙 준용 목록 원문',X('SPC:제5조').includes('수사준칙 제3조, 제4조, 제4조의2, 제7조의2, 제3장제1절(제12조제2항은 제외한다), 제16조(제5항은 제외한다), 제16조의2제1항, 제3장제3절(제21조제2항제4호는 제외한다), 제3장제4절, 제3장제5절, 제52조, 제55조부터 제60조까지'));
ok('협력규정 제15조①10호 바목: 「근로기준법」 위반범죄 및 같은 법 제102조제5항의 노동 관계 법령 위반범죄 — 수사개시 통보',X('SPC:제15조').includes('「근로기준법」 위반범죄 및 같은 법 제102조제5항의 노동 관계 법령 위반범죄')&&X('SPC:제15조').includes('지방공소청장 또는 지청장에게 수사개시 사실을 통보해야 한다'));
ok('협력규정 제29조: 고소ㆍ고발 수리한 날부터 3개월 이내',X('SPC:제29조').includes('고소나 고발을 수리한 날부터 3개월 이내에 수사를 마쳐야 한다'));
ok('수사준칙 제21조 심야조사 오후 9시~오전 6시 · 제22조 총조사시간 12시간·실제 조사 8시간',X('ICR:제21조').includes('오후 9시부터 오전 6시까지')&&X('ICR:제22조').includes('12시간을 초과하지 않도록')&&X('ICR:제22조').includes('8시간을 초과하지 않도록'));
ok('협력규칙 제21조 출석요구서 별지 제16호서식 · 제26조 진술거부권 고지 확인서 별지 제30호서식 · 제29조 영상녹화 고지',X('SPCR:제21조').includes('별지 제16호서식의 출석요구서')&&X('SPCR:제26조').includes('별지 제30호서식의 진술거부권 및 변호인 조력권 고지 등 확인서')&&X('SPCR:제29조').includes('조사자 및 법 제243조에 따른 참여자'));
ok('협력규칙 제87조 보존기간 영구·25년·5년·3년·2년',['영구','25년','5년','3년','2년'].every(w=>X('SPCR:제87조').includes(w)));

// ── 3. 개정 예정·시행 전 조문 ──
const j6=A('JPA:제6조의2');
ok('사법경찰직무법 제6조의2: 2026-12-08 개정 예정(제목 근로감독관 등 → 노동감독관 등, 「노동감독관 직무집행법」 제2조제1호에 따른 노동감독관)',j6.t==='근로감독관 등'&&j6.chg&&j6.chg.date==='2026-12-08'&&j6.chg.t==='노동감독관 등'&&j6.chg.x.includes('「노동감독관 직무집행법」 제2조제1호에 따른 노동감독관은')&&/법률 제21534호/.test(j6.chg.note),j6.chg);
ok('수사준칙 제48~50조(수사의 경합): 2027-02-05 삭제 예정',['제48조','제49조','제50조'].every(no=>{const c=A('ICR:'+no).chg; return c&&c.date==='2027-02-05'&&c.kind==='삭제';}));
ok('수사준칙 제58조·제62조: 2027-08-05 개정 예정(제2항)',['제58조','제62조'].every(no=>{const c=A('ICR:'+no).chg; return c&&c.date==='2027-08-05'&&c.kind==='개정'&&c.x;}));
ok('수사준칙 제26조의2·제38조의2: 2027-08-05 시행 예정(제26조의2는 법 제244조의2 영상녹화 부분 2026-10-02 시행 안내)',/^2027-08-05 시행 예정/.test(A('ICR:제26조의2').fut||'')&&/영상녹화 부분은 2026-10-02 시행/.test(A('ICR:제26조의2').fut)&&/^2027-08-05 시행 예정/.test(A('ICR:제38조의2').fut||''));
ok('협력규정 제7조(수사의 경합): 2027-02-05 시행 예정(부칙 제1조 단서)',/^2027-02-05 시행 예정.*부칙 제1조 단서/.test(A('SPC:제7조').fut||''));
{ const D2=C.prepare(C.applyDue(JSON.parse(raw),'2026-12-08')), e=D2.byKey['JPA:제6조의2'];
  ok('2026-12-08부터 사법경찰직무법 제6조의2 제목·본문이 개정 후로(개정 전 제목은 old에)',e.t==='노동감독관 등'&&e.x.includes('노동감독관 직무집행법')&&e.old&&e.old.t==='근로감독관 등'&&e.ht.includes('노동감독관'),[e.t,e.old&&e.old.t]); }
{ const D3=C.prepare(C.applyDue(JSON.parse(raw),'2027-08-05')), e=D3.byKey['ICR:제26조의2'], d=D3.byKey['ICR:제48조'];
  ok('2027-08-05부터 수사준칙 제26조의2 시행 표시 해제 · 제48조는 삭제 단계 반영',!e.fut&&e.futDone&&d.old&&d.old.del,[e.fut,d.old]); }
ok("시행 예정일 목록(meta.pending)에 2027-02-05·2027-08-05",D.meta.pending.includes('2027-02-05')&&D.meta.pending.includes('2027-08-05'));

// ── 4. 수사준칙 준용(협력규정 제5조) ──
const ICR=D.arts.filter(e=>e.l==='ICR'), JY=k=>(A('ICR:'+k).jy||{});
ok('수사준칙 모든 조문에 준용 표시',ICR.every(e=>e.jy&&/^(all|part|no)$/.test(e.jy.k)));
const PART={'제12조':'제2항 제외','제16조':'제5항 제외','제16조의2':'제1항만','제21조':'제2항제4호 제외','제60조':'제6항 제외'};
ok('일부 준용 5개(제12조②·제16조⑤·제21조②4호·제60조⑥ 제외, 제16조의2는 ①만)',Object.keys(PART).every(k=>JY(k).k==='part'&&JY(k).n===PART[k])&&ICR.filter(e=>e.jy.k==='part').length===5);
const NO=['제1조','제2조','제5조','제6조','제7조','제8조','제8조의2','제8조의3','제9조','제17조','제48조','제49조','제50조','제51조','제53조','제53조의2','제54조','제62조','제63조','제64조','제64조의2','제64조의3','제65조','제68조','제70조'];
ok('준용 제외 25개(협력규정 제5조에 없는 조문: 협력·검시·수사의 경합·불송치·재수사 등)',NO.every(k=>JY(k).k==='no')&&ICR.filter(e=>e.jy.k==='no').length===NO.length,ICR.filter(e=>e.jy.k==='no').map(e=>e.no));
ok('제3장 제1·3·4·5절 조문은 모두 준용(일부 준용 제외)',ICR.filter(e=>e.p[0]==='제3장 수사'&&/^제[1345]절/.test(e.p[1]||'')).every(e=>e.jy.k!=='no'));
ok('제3조·제4조·제52조·제55~59조·제61조·제65조의2·제71조 준용',['제3조','제4조','제52조','제55조','제56조','제57조','제58조','제59조','제61조','제65조의2','제71조'].every(k=>JY(k).k==='all'));
ok('준용 읽기 안내: 제55조 송치 · 제7조의2 수사기관의 장(제5조제2항)',/형사소송법 제245조의10제5항/.test(JY('제55조').n||'')&&/수사기관의 장/.test(JY('제7조의2').n||''));
ok('준용 안내의 법령 이름은 줄이지 않음(특별사법경찰관 협력규정)',['제7조의2','제61조의2','제65조의2'].every(k=>/^"수사기관의 장"은 특별사법경찰관 협력규정 제7조 각 호의 구분에 따른 사람으로 봄$/.test(JY(k).n||''))&&ICR.every(e=>!/(^|[^관] ?)협력규정/.test((e.jy.n||'').replace(/특별사법경찰관 협력규정/g,''))));
ok('준용 제외 조문·다른 기관 조문 검색 점수 0.3(사법경찰직무법 제3~10조)',ICR.filter(e=>e.jy.k==='no').every(e=>e.sw===0.3)&&['제3조','제4조','제5조','제6조','제7조','제9조','제10조'].every(k=>A('JPA:'+k).sw===0.3)&&!A('JPA:제6조의2').sw&&!A('JPA:제1조').sw);

// ── 5. 서식(앱 미수록) ──
const M=(D.bt.miss||{}).SPCR||[];
ok('협력규칙 서식 147개(앱 미수록) — 번호·제목·법제처 서식 파일(PDF)',M.length===147&&M.every(x=>x[3]==='f'&&/^https:\/\/www\.law\.go\.kr\/LSW\/flDownload\.do\?flSeq=\d+$/.test(x[4]||''))&&M[15][0]==='16'&&M[15][1].includes('출석요구'),M.slice(15,16));
ok('협력규칙 본문이 가리키는 서식은 모두 목록에 있음',D.arts.filter(e=>e.l==='SPCR').every(e=>[...e.x.matchAll(/별지\s*제(\d+)호(의\d+)?\s*서식/g)].every(m=>M.some(x=>x[0]===m[1]+(m[2]||'')))));
if(C.missOf){ const mo=C.missOf(D,A('SPCR:제21조')).map(v=>(v.f?'f':'b')+v.n).join(); ok('협력규칙 제21조 → 서식 16·17·18 원문 연결(CORE missOf)',mo==='f16,f17,f18',mo); }

// ── 6. 검색 ──
const LAB=['GK','GKD','GKR','MW','MWD','MWR','RET','RETD','RETR','EQ','EQD','EQR','FT','FTD','FTR','DISP','DISPD','DISPR','LMC','LMCD','FW','FWD','TU','TUD','TUR','GAM','LIO','JPA','SPC','SPCR','ICR','MWS'];
const OSH=['OSH','SD','SR','RULE','LIC','SAPA','SAPAD','OAM','LIO','JPA','SPC','SPCR','ICR','CSC','RAG','EDU','CSL','HRS','HRC','HRP','PSM','GRD','SCP','SIP','MSD'];
const ord=Object.keys(L), top=(q,g)=>C.search(D,q,'',ord,g).arts.map(e=>e.l+':'+e.no);
// 수사 법령은 같은 분야의 법령 조문(집무규정·직무집행법 포함) 뒤에 붙음 → 집무규정이 같은 말을 쓰면 그 뒤 순위(근로기준, 산업안전). 99 = 결과에 포함
const SQ=[['심야조사','ICR:제21조',1,1],['장시간 조사','ICR:제22조',2,1],['영상녹화','SPCR:제29조',1,1],['진술거부권','SPCR:제26조',2,2],['긴급체포','SPCR:제33조',2,2],['송치서류','SPCR:제69조',3,2],['수사개시 통보','SPC:제15조',2,3],
  ['피신조서','SPCR:제25조',3,1],['내사','SPCR:제4조',99,3],['특사경','SPC:제2조',99,1],['수사기간','SPC:제29조',2,1],['보존기간','SPCR:제87조',4,3],['압수수색','SPCR:제43조',2,2],['수사지휘','SPC:제19조',3,1],['수사준칙 출석요구','ICR:제19조',1,1],['협력규칙 영상녹화','SPCR:제29조',1,1]];
for(const [q,k,nl,no] of SQ) for(const [f,g,n0] of [['근로기준',LAB,nl],['산업안전',OSH,no]]){ const r=C.search(D,q,'',ord,g), t=r.arts.map(e=>e.l+':'+e.no); ok(`검색 ${q} (${f}) → ${k} ${n0===99?'결과에 포함':n0+'위 안'}`,t.slice(0,n0===99?80:n0).includes(k),t.slice(0,6)); }
{ const t=top('불이익',LAB); ok("'불이익'(근로기준): 기존 분야 결과(남녀고용평등법 제29조의7) 먼저, 수사준칙 제4조(불이익 금지)는 뒤",t[0]==='EQ:제29조의7'&&t.includes('ICR:제4조'),t.slice(0,6)); }
for(const [q,c] of [['사법경찰직무법','JPA'],['특별사법경찰관 협력규정','SPC'],['협력규칙','SPCR'],['수사준칙','ICR']]){ const r=C.search(D,q,'',ord,LAB); ok(`법령 이름 ${q} → 그 법령 조문 전부`,r.total===CNT(c)&&r.arts.every(e=>e.l===c),[r.total,CNT(c)]); }
{ const r=C.search(D,'석면','',ord,LAB), t=r.arts.map(e=>e.l+':'+e.no);
  ok("'석면'(근로기준): 사법경찰직무법 제6조(다른 기관)는 분야·다른 분야 결과 뒤(lowN)",r.lowN>0&&t.indexOf('JPA:제6조')>t.indexOf('OSH:제119조'),[r.lowN,t.indexOf('JPA:제6조'),t.indexOf('OSH:제119조')]); }
{ const r=C.search(D,'사법경찰직무법 식품','',ord,LAB); ok("법령 이름을 넣으면 다른 기관 조문도 그대로(lowN 0)",r.total>0&&r.lowN===0&&r.arts.every(e=>e.l==='JPA'),[r.total,r.lowN]); }
{ const t=top('출석요구',LAB); ok("'출석요구'(근로기준): 분야 법령 조문(직무집행법·집무규정) 먼저, 수사 법령은 뒤",t.indexOf('LIO:제10조')<t.indexOf('SPCR:제21조')&&t.indexOf('GAM:제8조')<t.indexOf('ICR:제19조'),t.slice(0,6)); }
ok('용어사전 4개: 피신조서·내사·특사경·수사지휘',['피신조서','내사','특사경','수사지휘'].every(k=>D.syn[k]));

// ── 7. 화면 코드(문자열) ──
ok('분야 법령: 직무집행법 다음 사법경찰직무법·협력규정·협력규칙·수사준칙(두 분야)',h.includes("'GAM','LIO','JPA','SPC','SPCR','ICR','MWS']")&&h.includes("'OAM','LIO','JPA','SPC','SPCR','ICR','CSC'"));
ok('법령집 하위 줄: 협력규칙(par SPC)',L.SPCR.par==='SPC'&&/if\(L\.par\)return L\.par===pk;/.test(h));
ok('하단 고지: 절차 규정(now)은 현행 법령',h.includes('id="footm"')&&h.includes("'국가법령정보센터에서 현행 법령을 확인하시기 바랍니다.'")&&L.GAM.now===1&&L.OAM.now===1&&!L.LIO.now&&!L.GK.now);
ok('조문 화면: 준용 카드(jyCard)·목록 표시(jyLab)·그 밖의 수사 법령 조문 접힘(ol)',/function jyCard\(e\)/.test(h)&&/function jyLab\(e\)/.test(h)&&h.includes("foldSec('ol','그 밖의 수사 법령 조문'"));
console.log(fail?`\n실패 ${fail}건 / ${n}건`:`\n전체 통과 ${n}건`); process.exit(fail?1:0);
