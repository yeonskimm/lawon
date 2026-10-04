// 법ON 경계값 테스트: 인원·공사금액 기준 바로 아래/기준값에서 판정이 법령대로 바뀌는지
// 기대값은 현재 코드가 아니라 법령 원문 기준으로 적음(코드가 틀리면 여기서 실패해야 함)
// 사용: node tests/judge_boundary.js index.html
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,judgeItem,judgeArt,sizeSum:typeof sizeSum==="function"?sizeSum:null,nwbNote:typeof nwbNote==="function"?nwbNote:null,sameSanc:typeof sameSanc==="function"?sameSanc:null,ruleSanc,applyDue})',{});
const D=C.prepare(JSON.parse(raw));
const TODAY='2026-09-23';
const P=(ind,n,amt)=>{const s=ind&&D.inds.find(x=>x.id===ind); if(ind&&!s)throw new Error('업종 없음: '+ind);
  return {n,amt:amt==null?null:amt,ind:s?s.g:'',ov:s&&s.ov||null,today:TODAY};};
const IT=id=>{const x=D.items.find(i=>i.id===id); if(!x)throw new Error('항목 없음: '+id); return x;};
const AR=k=>{const x=D.byKey[k]; if(!x)throw new Error('조문 없음: '+k); return x;};
let fail=0,cnt=0;
const chk=(name,got,exp)=>{cnt++; const ok=got===exp; if(!ok)fail++; if(!ok||process.env.VERBOSE)console.log((ok?'PASS':'FAIL')+'  '+name+'  기대 '+exp+' / 실제 '+got);};
// 항목: [id, 업종, 기준 아래 인원, 기준 인원, (건설 공사금액 아래, 기준)]
const item=(id,ind,lo,hi,label)=>{chk(label+' '+lo+'명 → 비적용',C.judgeItem(IT(id),P(ind,lo),TODAY).st,'na'); chk(label+' '+hi+'명 → 적용',C.judgeItem(IT(id),P(ind,hi),TODAY).st,'apply');};
const amt=(id,lo,hi,label)=>{chk(label+' 건설 '+lo+'억 → 비적용',C.judgeItem(IT(id),P('const',30,lo),TODAY).st,'na'); chk(label+' 건설 '+hi+'억 → 적용',C.judgeItem(IT(id),P('const',30,hi),TODAY).st,'apply');};
const art=(k,n,exp,label)=>chk(label+' '+n+'명 → '+(exp==='na'?'비적용':'적용'),C.judgeArt(AR(k),P('',n)).st,exp);

// ── 근로기준 분야: 5명 기준(근기법 제11조, 시행령 별표1) ──
art('GK:제17조',4,'apply','근기법 제17조 근로조건 명시'); art('GK:제36조',4,'apply','근기법 제36조 금품청산');
art('GK:제26조',4,'apply','근기법 제26조 해고예고');     art('GK:제54조',4,'apply','근기법 제54조 휴게');
art('GK:제56조',4,'na','근기법 제56조 가산수당');         art('GK:제56조',5,'apply','근기법 제56조 가산수당');
art('GK:제60조',4,'na','근기법 제60조 연차');             art('GK:제60조',5,'apply','근기법 제60조 연차');
art('GK:제76조의2',4,'na','근기법 제76조의2 괴롭힘');     art('GK:제76조의2',5,'apply','근기법 제76조의2 괴롭힘');
art('GK:제93조',9,'na','근기법 제93조 취업규칙');         art('GK:제93조',10,'apply','근기법 제93조 취업규칙');
art('FT:제4조',4,'na','기간제법 제4조');                  art('FT:제4조',5,'apply','기간제법 제4조');
// 인원 기준이 있는 조문: '적용' 문구에 그 기준을 표시(규모 요건 없음·5명 기준으로 나오지 않게)
chk('근참법 제4조 30명 문구',C.judgeArt(AR('LMC:제4조'),P('',30)).why,'상시 30명 이상');
chk('근기법 제93조 10명 문구',C.judgeArt(AR('GK:제93조'),P('',10)).why,'상시 10명 이상');
chk('중처법 제4조 5명 문구',C.judgeArt(AR('SAPA:제4조'),P('',5)).why,'상시 5명 이상');
chk('근기법 제56조 5명 문구(5명 기준 조문은 그대로)',C.judgeArt(AR('GK:제56조'),P('',5)).why,'상시 5명 이상 사업장 기준 적용');
item('l_ft4','',4,5,'기간제 2년 초과 사용 제한');
item('l_lmc','',29,30,'노사협의회');

// ── 산업안전 분야: 인원 기준 ──
item('o_sup','',4,5,'관리감독자');
item('o_sapa','',4,5,'중처법 확보의무');
item('o_edu','mfgHeavy',4,5,'근로자 정기교육(제조)');
item('o_resp','mfgHeavy',49,50,'안전보건관리책임자(제조)');
item('o_resp','wholesale',99,100,'안전보건관리책임자(도매)');
item('o_resp','fin',299,300,'안전보건관리책임자(금융)');
item('o_safe','mfgHeavy',49,50,'안전관리자(제조)');
item('o_health','mfgHeavy',49,50,'보건관리자(제조)');
item('o_comm','mfgHeavy',49,50,'산업안전보건위원회(화학·금속 등)');
item('o_comm','mfgLight',99,100,'산업안전보건위원회(식료품 등)');
item('o_reg','mfgHeavy',99,100,'안전보건관리규정(제조)');
item('o_charge','mfgHeavy',19,20,'안전보건관리담당자 하한');
chk('안전보건관리담당자 49명 → 적용',C.judgeItem(IT('o_charge'),P('mfgHeavy',49),TODAY).st,'apply');
chk('안전보건관리담당자 50명 → 비적용',C.judgeItem(IT('o_charge'),P('mfgHeavy',50),TODAY).st,'na');
item('o_board','',499,500,'이사회 보고');
item('o_disc','',499,500,'안전보건 현황 공시');
// 현황 공시(산안법 제10조의2제1항, 시행령 제12조의2제1항): 건설업은 인원이 아닌 연간 건설공사 금액(개별 공사금액 아님), 공공기관·지방공사·지방공단은 인원 무관
chk('현황 공시 건설업 100명 → 추가 확인',C.judgeItem(IT('o_disc'),P('const',100),TODAY).st,'cond');
chk('현황 공시 건설업 600명 → 추가 확인(인원 기준 아님)',C.judgeItem(IT('o_disc'),P('const',600),TODAY).st,'cond');
chk('현황 공시 건설업 600명·공사금액 2,000억 → 추가 확인(개별 공사금액으로 판정 안 함)',C.judgeItem(IT('o_disc'),P('const',600,2000),TODAY).st,'cond');
chk('현황 공시 건설업 인원 미입력 → 추가 확인',C.judgeItem(IT('o_disc'),P('const',null),TODAY).st,'cond');
{ const w=C.judgeItem(IT('o_disc'),P('mfgHeavy',499),TODAY).why; chk('현황 공시 제조 499명 문구: 공공기관·지방공사·지방공단 예외 표시, 건설업 단서 없음',/공공기관·지방공사·지방공단/.test(w)&&!/건설업/.test(w),true); }
{ const w=C.judgeItem(IT('o_disc'),P('',499),TODAY).why; chk('현황 공시 업종 미선택 499명 문구: 기관 예외·건설업 금액 단서 모두 표시',/공공기관/.test(w)&&/1천200억원/.test(w),true); }
{ const j=C.judgeItem(IT('o_disc'),P('',600),TODAY); chk('현황 공시 업종 미선택 600명 → 적용(건설업 단서 표시)',j.st==='apply'&&/1천200억원/.test(j.why),true); }
chk('현황 공시 조문(법 제10조의2) 건설업 600명 → 추가 확인',C.judgeArt(AR('OSH:제10조의2'),P('const',600)).st,'cond');
chk('이사회 보고 건설업 600명 → 적용(시행령 제13조는 500명 이상 회사 포함)',C.judgeItem(IT('o_board'),P('const',600),TODAY).st,'apply');
chk('안전관리자(금융) 1,000명 → 비적용',C.judgeItem(IT('o_safe'),P('fin',1000),TODAY).st,'na');

// ── 산업안전 분야: 건설 공사금액 기준 ──
amt('o_resp',19,20,'안전보건관리책임자');
amt('o_safe',49,50,'안전관리자');
amt('o_comm',119,120,'산업안전보건위원회');
amt('o_health',799,800,'보건관리자');
chk('보건관리자 건설 공사금액 미입력·600명 → 적용',C.judgeItem(IT('o_health'),P('const',600,null),TODAY).st,'apply');

// ── 입력 누락 시 단정하지 않는지 ──
chk('인원 미입력 → 판정 보류',C.judgeItem(IT('o_safe'),P('mfgHeavy',null),TODAY).st,'unk');
chk('업종 미선택 → 확인 필요',C.judgeItem(IT('o_safe'),P('',100),TODAY).st,'cond');

// ── 인원 미입력 때 규모별 요약(2026-10-03, sizeSum): 문구가 실제 판정과 맞는지 ──
if(!C.sizeSum){ chk('sizeSum 함수 있음',false,true); } else {
const SI=(id,only)=>{const r=C.sizeSum(D,p=>C.judgeItem(IT(id),p,TODAY),TODAY,only||''); return r&&r.t;};
const SA=(k,only)=>{const r=C.sizeSum(D,p=>C.judgeArt(AR(k),p),TODAY,only||''); return r&&r.t;};
chk('요약 근기법 제56조',SA('GK:제56조'),'상시 5명부터');
chk('요약 근기법 제17조',SA('GK:제17조'),'규모와 관계없이 적용');
chk('요약 근기법 제93조',SA('GK:제93조'),'상시 10명부터');
chk('요약 근참법 제4조',SA('LMC:제4조'),'상시 30명부터');
chk('요약 기간제법 제4조',SA('FT:제4조'),'상시 5명부터');
chk('요약 중처법 제4조',SA('SAPA:제4조'),'상시 5명부터');
chk('요약 정기교육',SI('o_edu'),'상시 5명부터 (일부 업종 제외)');
chk('요약 관리감독자',SI('o_sup'),'상시 5명부터 (일부 업종 제외)');
chk('요약 안전보건관리책임자',SI('o_resp'),'상시 50명부터 (일부 업종 제외 · 건설업 별도)');
chk('요약 안전보건관리담당자',SI('o_charge'),'상시 20~49명 (일부 업종만)');
chk('요약 기술지도',SI('o_tech'),'건설업만 해당 (공사금액 기준)');
chk('요약 안전관리자',SI('o_safe'),'상시 50명부터 (일부 업종 제외 · 건설업 별도)');
chk('요약 이사회 보고',SI('o_board'),'상시 500명부터 (일부 업종 제외 · 건설업 별도)');
chk('요약 산업안전보건위원회',SI('o_comm'),'상시 50명부터 (일부 업종 제외 · 건설업 별도)');
chk('요약 정기교육(금융업 선택)',SI('o_edu','fin'),'이 업종은 대상 아님');
chk('요약 산안법 제29조(금융업 선택)',SA('OSH:제29조','fin'),'이 업종은 일부 적용');
chk('요약 안전관리자(도매업 선택)',SI('o_safe','wholesale'),'상시 50명부터');
chk('요약 안전보건관리책임자(금융업 선택)',SI('o_resp','fin'),'상시 300명부터');
// 모든 조문·주요 의무 × 업종: '상시 N명 이상 적용' 요약이면 N-1명은 적용 아님(일부 적용이면 요약에도 '일부 적용'), N명·1000명은 적용
let pc=0,pf=0; const PI=(s,n)=>({n,amt:null,ind:s.g,id:s.id,ov:s.ov||null,today:TODAY});
const prop=(lab,jf)=>D.inds.filter(s=>s.g!=='const').forEach(s=>{ const r=C.sizeSum(D,jf,TODAY,s.id), m=r&&/^상시 (\d+)명부터(?! 추가)/.exec(r.t); if(!m)return; const N=+m[1]; pc++;
  const b=jf(PI(s,N-1)), ok=(b.st!=='apply'||!!b.part)===true&&(!!b.part===/명 미만은 일부 적용/.test(r.t)||b.st!=='apply')&&jf(PI(s,N)).st==='apply'&&jf(PI(s,1000)).st==='apply'; if(!ok){pf++; console.log('FAIL  요약 기준 불일치 '+lab+' '+s.id+' '+r.t);} });
D.items.forEach(it=>prop(it.id,p=>C.judgeItem(it,p,TODAY)));
D.arts.filter(e=>/^(GK|OSH|SD|SR|LMC|FT|SAPA)$/.test(e.l)&&!e.nj).forEach(e=>prop(e.l+':'+e.no,p=>C.judgeArt(e,p)));
cnt++; if(pf||pc<100)fail++; if(pf||process.env.VERBOSE)console.log((pf?'FAIL':'PASS')+'  요약 기준 대조 '+pc+'건 중 불일치 '+pf);
}

// ── 2026-10-04 업종 판정 정비(한국법MCP 별표 원문 대조) ──
// 연구개발업: 시행령 별표2 제30호·별표9 제17호·시행규칙 별표2 제8호는 '연구개발업은 제외' → 300명이 아니라 100명
item('o_resp','lab',99,100,'연구개발업 안전보건관리책임자'); item('o_comm','lab',99,100,'연구개발업 산업안전보건위원회'); item('o_reg','lab',99,100,'연구개발업 안전보건관리규정');
item('o_resp','prof',299,300,'전문·과학·기술 서비스 안전보건관리책임자(300명 유지)');
// 학교 외 교육서비스업: 시행령 별표1 제5호(제2장제1절·제2절, 제3장, 제5장제2절 적용 제외)
const PE=(n)=>{const s=D.inds.find(x=>x.id==='edu'); return {n,amt:null,ind:s.g,id:s.id,ov:s.ov,today:TODAY};};
for(const id of ['o_resp','o_sup','o_safe','o_health','o_doc','o_comm','o_reg','o_edu','o_edu3','o_board','o_charge','o_gen','o_63']){ const j=C.judgeItem(IT(id),PE(300),TODAY); chk('교육서비스업 300명 '+id+' → 적용 제외',j.st+(j.ex?'·ex':''),'na·ex'); }
for(const id of ['o_ra','o_hc','o_54','o_57']) chk('교육서비스업 '+id+' → 적용',C.judgeItem(IT(id),PE(300),TODAY).st,'apply');
chk('교육서비스업 인원 미입력이어도 안전관리자 적용 제외',C.judgeItem(IT('o_safe'),PE(null),TODAY).st,'na');
chk('교육서비스업 산안법 제29조 → 적용 제외',C.judgeArt(AR('OSH:제29조'),PE(100)).st,'na');
chk('교육서비스업 산안법 제17조 → 적용 제외',C.judgeArt(AR('OSH:제17조'),PE(100)).st,'na');
chk('교육서비스업 산안법 제64조 → 제1항제6호만',C.judgeArt(AR('OSH:제64조'),PE(100)).part,'제1항제6호(위생시설 장소 제공·이용 협조)만 적용');
chk('교육서비스업 산안법 제36조 → 적용',C.judgeArt(AR('OSH:제36조'),PE(100)).st,'apply');
chk('교육서비스업 산안법 제73조(제5장제3절) → 제외 안 함',C.judgeArt(AR('OSH:제73조'),PE(100)).st!=='na'||C.judgeArt(AR('OSH:제73조'),PE(100)).why.indexOf('별표1 제5호')<0,true);
chk('교육서비스업 시행령 제16조(모법 제17조) → 적용 제외',C.judgeArt(AR('SD:제16조'),PE(100)).st,'na');
chk('공공행정·학교 50명 안전관리자 → 적용(현업)',C.judgeItem(IT('o_safe'),P('public',50),TODAY).st,'apply');
if(C.sizeSum){ chk('요약 관리감독자(교육서비스업 선택)',(C.sizeSum(D,p=>C.judgeItem(IT('o_sup'),p,TODAY),TODAY,'edu')||{}).t,'이 업종은 대상 아님'); }
// ── 2026-10-04 제재 표시: 반의사불벌, 안전보건규칙 제1편 사망 벌칙, 개정 예정 제재 비교 ──
if(!C.nwbNote||!C.sameSanc){ chk('nwbNote·sameSanc 함수 있음',false,true); } else {
const S0=k=>AR(k).s[0];
chk('반의사불벌 근기법 제36조(제109조제1항)',C.nwbNote(S0('GK:제36조'),'GK'),'반의사불벌(근로기준법 제109조제2항) · 명단 공개 체불사업주의 공개 기간 중 위반은 제외');
chk('반의사불벌 근기법 제36조 10. 8. 이후(제107조제1항)',C.nwbNote(AR('GK:제36조').sn.list[0],'GK'),'반의사불벌(근로기준법 제107조제2항) · 명단 공개 체불사업주의 공개 기간 중 위반은 제외');
chk('반의사불벌 아님 근기법 제65조(같은 제109조제1항)',C.nwbNote(S0('GK:제65조'),'GK'),'');
chk('반의사불벌 근기법 제52조제2항제2호만',C.nwbNote(AR('GK:제52조').s[0],'GK')!==''&&C.nwbNote(AR('GK:제52조').s[1],'GK')==='',true);
chk('반의사불벌 퇴직급여법 제9조',C.nwbNote(S0('RET:제9조'),'RET'),'반의사불벌(퇴직급여법 제43조 단서) · 명단 공개 체불사업주의 공개 기간 중 위반은 제외');
const lr=IT('l_ret').s; chk('반의사불벌 주요 의무 퇴직금(현행)',C.nwbNote(lr[0],'')!=='',true); chk('반의사불벌 주요 의무 퇴직금(종전 조항은 표시 안 함)',C.nwbNote(lr[1],''),'');
chk('반의사불벌 과태료는 표시 안 함',C.nwbNote({kind:'과태료',basis:'제109조제1항',qual:'제36조'},'GK'),'');
chk('개정 예정 제재 같음(근기법 제13조 문구 정비)',C.sameSanc(AR('GK:제13조').s,AR('GK:제13조').sn.list),true);
chk('개정 예정 제재 다름(근기법 제36조 벌칙 이동)',C.sameSanc(AR('GK:제36조').s,AR('GK:제36조').sn.list),false);
chk('개정 예정 제재 다름(근기법 제104조 위반 범위)',C.sameSanc(AR('GK:제104조').s,AR('GK:제104조').sn.list),false);
}
{ const L=(C.ruleSanc(D,AR('RULE:제42조'))||{list:[]}).list.map(z=>z.basis).join('|');
  chk('안전보건규칙 제42조(제1편) 사망 시 제167조제1항',/제167조제1항/.test(L),true); chk('안전보건규칙 제42조(제1편) 근로자 준수의무 과태료',/제175조제6항제3호/.test(L),true);
  const L2=(C.ruleSanc(D,AR('RULE:제79조'))||{list:[]}).list.map(z=>z.basis).join('|'); chk('안전보건규칙 제79조(조문별 연결)는 그대로 — 제167조 없음',/제167조/.test(L2),false); }
console.log(fail?('실패 '+fail+'건 / '+cnt+'건'):('전체 통과 '+cnt+'건')); process.exit(fail?1:0);
