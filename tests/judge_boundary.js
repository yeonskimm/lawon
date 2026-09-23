// 법ON 경계값 테스트: 인원·공사금액 기준 바로 아래/기준값에서 판정이 법령대로 바뀌는지
// 기대값은 현재 코드가 아니라 법령 원문 기준으로 적음(코드가 틀리면 여기서 실패해야 함)
// 사용: node tests/judge_boundary.js index.html
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const raw=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g,'</');
const core=html.slice(html.indexOf('/*CORE_START*/'),html.indexOf('/*CORE_END*/'));
const C=vm.runInNewContext(core+'\n;({prepare,judgeItem,judgeArt})',{});
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

console.log(fail?('실패 '+fail+'건 / '+cnt+'건'):('전체 통과 '+cnt+'건')); process.exit(fail?1:0);
