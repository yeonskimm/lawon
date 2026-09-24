# -*- coding: utf-8 -*-
"""법ON: 화면 구성 업그레이드 (2026-09-25)
1. 검색 결과
   - 선택 분야: '○○ 분야 주요 의무' → '○○ 분야 조문' → 별표 순, 두 구획 모두 접고 펼 수 있음(기본 펼침)
   - 다른 분야: 맨 아래 한 구획('근로기준 분야  주요 의무 2 · 조문 11')으로 모아 기본 접힘
     (선택 분야 결과가 하나도 없으면 펼친 상태로 시작)
   - 접힘 상태는 같은 검색어·분야·법령 칩 동안만 기억, 검색어가 바뀌면 기본값으로
   - 법령 칩 줄을 검색창 아래에 고정(스크롤해도 보임)
2. 법령집
   - '별표' 구획을 없애고 각 법령 줄에 '조문 125 / 별표 1' 표시
   - 조문 없이 별표만 수록된 법령(기간제법 시행령)은 모법 아래 하위 줄로
   - 법령 첫 화면에 [조문 | 별표] 탭(그 법령에 별표가 있을 때만)
   - '그 밖의 법령'(다른 분야)은 접힌 구획, 앱 실행 동안 상태 기억
사용: python3 claude_patch_layout_20260925.py 입력.html 출력.html
전제: claude_patch_chip_items_20260924.py 적용본(미적용본도 처리)
"""
import sys
src, dst = sys.argv[1], sys.argv[2]
t = open(src, encoding='utf-8').read()

def rep(old, new, label):
    global t
    n = t.count(old)
    if n != 1:
        sys.exit('중단[%s]: 기준 문자열 %d번(기대 1번)' % (label, n))
    t = t.replace(old, new)

def cut(start_cands, end_mark, new, label):
    """start 후보 중 하나(정확히 1번)부터 end_mark가 있는 줄 끝까지 교체"""
    global t
    hit = [s for s in start_cands if t.count(s) == 1]
    if len(hit) != 1:
        sys.exit('중단[%s]: 시작 기준을 특정하지 못함' % label)
    a = t.index(hit[0])
    b = t.find(end_mark, a)
    if b < 0 or t.count(end_mark) != 1:
        sys.exit('중단[%s]: 끝 기준 %d번' % (label, t.count(end_mark)))
    b = t.index('\n', b) + 1
    t = t[:a] + new + t[b:]

# ── 1. 검색 결과: 주요 의무 ~ 별표 구간 교체 ──
NEW_RES = r"""    if(st.law){ var LN=(D.meta.laws[st.law]||{}).name; r.items=r.items.filter(function(it){return (it.refs||[]).some(function(x){return x.law===LN;});}); }   // 법령 칩: 그 법령 주요 의무만
    // 2026-09-25: 선택 분야(주요 의무 → 조문 → 별표)를 먼저, 다른 분야는 맨 아래 접힌 구획 하나로
    var FNi=FIELD[st.field], split=!!(FNi&&fl&&!st.law), othF=st.field==='osh'?'근로기준':'산업안전';
    var ownI=split?r.items.filter(function(it){return it.f===st.field;}):r.items, othI=split?r.items.filter(function(it){return it.f!==st.field;}):[];
    var itList=function(L){ return '<div class="list">'+L.map(function(it){return rowItem(it);}).join('')+'</div>'; };
    var cntS=function(n,shown){ return n>shown?n+'건 중 위 '+shown+'건':n+'건'; };
    var bs=(nB&&!st.law)?'<h3 class="gl">별표 <span>'+nB+'건</span></h3><div class="list">'+bh.slice(0,3).map(rowBtHit).join('')+'</div>'+(nB>3?'<button type="button" class="morebtn" data-law="BT">별표 '+nB+'건 모두 보기'+CHEV+'</button>':''):'';   // 별표는 3건까지, 나머지는 '별표' 칩으로
    var artList=function(arts){   // 같은 결과에 모법 조문이 있으면 시행령·시행규칙은 그 줄 아래로 묶음(법전 순서)
      var inR={}, kids={}, done={}; arts.forEach(function(e){inR[e.l+':'+e.no]=1;});
      var gk=function(e){ var pk=e.pa?e.pa.l+':'+e.pa.no:''; return (pk&&inR[pk])?pk:e.l+':'+e.no; };
      arts.forEach(function(e){ var g=gk(e); if(g!==e.l+':'+e.no)(kids[g]=kids[g]||[]).push(e); });
      return arts.map(function(e){ var g=gk(e); if(done[g])return ''; done[g]=1; var P=D.byKey[g];
        return rowArt(P,{law:true,path:true,snip:snippet(P,st.q)})+(kids[g]?kids[g].map(function(x){return subRow(x);}).join(''):''); }).join(''); };
    var own=r.arts, oth=[], inN=r.total, othN=0;
    if(split){ own=r.arts.filter(function(e){return fl.indexOf(e.l)>=0;}); oth=r.arts.filter(function(e){return fl.indexOf(e.l)<0;}); inN=r.inN; othN=r.total-inN; }
    foldKey(st.q+'|'+st.field+'|'+st.law);
    if(split){
      if(ownI.length)h+=foldSec('oi',FNi.name+' 분야 주요 의무',ownI.length+'건',itList(ownI),true);
      if(own.length)h+=foldSec('oa',FNi.name+' 분야 조문',cntS(inN,own.length),'<div class="list">'+artList(own)+'</div>',true);
      h+=bs;
      var ob='', parts=[];
      if(othI.length){ ob+='<h3 class="gl in">주요 의무 <span>'+othI.length+'건</span></h3>'+itList(othI); parts.push('주요 의무 '+othI.length); }
      if(oth.length)ob+='<h3 class="gl in">조문 <span>'+cntS(othN,oth.length)+'</span></h3><div class="list">'+artList(oth)+'</div>';
      else if(othN>0)ob+='<p class="andq">조문 '+othN+'건은 위 법령 칩에서 볼 수 있습니다.</p>';
      if(othN>0)parts.push('조문 '+othN);
      if(ob)h+=foldSec('ox',othF+' 분야',parts.join(' · '),ob,!(ownI.length||own.length||nB));
    }else{
      if(ownI.length)h+='<h3 class="gl">주요 의무 <span>'+ownI.length+'건</span></h3>'+itList(ownI);
      if(own.length)h+='<h3 class="gl">조문 <span>'+cntS(inN,own.length)+'</span></h3><div class="list">'+artList(own)+'</div>';
      h+=bs;
    }
"""
cut(["    if(st.law){ var LN=(D.meta.laws[st.law]",
     "    if(st.field)r.items=r.items.filter(function(it){return it.f===st.field;})"],
    "    h+=bs;   // 2026-09-23:", NEW_RES, '검색 결과')

# 검색 결과를 그린 뒤 검색창 높이를 기록(법령 칩 줄 고정 위치)
rep("    $('results').innerHTML=andWrap(((r.notes&&r.notes.length)?'<div class=\"card\"><p class=\"why sm\">'+r.notes.map(esc).join('<br>')+'</p></div>':'')+h,r,nB);\n  }\n",
    "    $('results').innerHTML=andWrap(((r.notes&&r.notes.length)?'<div class=\"card\"><p class=\"why sm\">'+r.notes.map(esc).join('<br>')+'</p></div>':'')+h,r,nB);\n    setSbH();\n  }\n",
    '결과 끝')

# 접는 구획 도구
rep("  function renderResults(){\n",
r"""  // ── 접는 구획(2026-09-25). 검색: 같은 검색어·분야·칩 동안만 기억 / 법령집(b:): 앱 실행 동안 기억 ──
  var FOLD={k:null,o:{}}, FOLDB={};
  function foldKey(k){ if(FOLD.k!==k){FOLD.k=k;FOLD.o={};} }
  function foldSec(key,title,meta,body,def){ var S=key.charAt(0)==='b'?FOLDB:FOLD.o, op=(key in S)?S[key]:def;
    return '<div class="fsec"><button type="button" class="gl fold" data-fold="'+key+'" aria-expanded="'+op+'">'+esc(title)+(meta?' <span>'+esc(meta)+'</span>':'')+'<i class="fdd" aria-hidden="true"></i></button><div class="fbody"'+(op?'':' hidden')+'>'+body+'</div></div>'; }
  function setSbH(){ var sb=document.querySelector('#vFind .sbar'); if(sb&&sb.offsetHeight)document.documentElement.style.setProperty('--sbh',sb.offsetHeight+'px'); }
  function renderResults(){
""", '접기 도구')

# ── 2. 법령집 첫 화면 ──
NEW_BOOK = r"""  function btTabsOf(k){ return BT.tabs.filter(function(T){return T.law===k;}); }
  function renderBookRoot(){   // 2026-09-25: 별표는 각 법령 줄에 수만 표시(법령 안 '별표' 탭), 다른 분야 법령은 접힌 구획
    var ord=lawOrder(), F=FIELD[st.field], nF=F?F.first.filter(function(k){return D.meta.laws[k];}).length:0;
    var isSub=function(k,pk){ var L=D.meta.laws[k], pv=pk?D.meta.laws[pk]:null; return /\s(시행령|시행규칙)$/.test(L.name)&&!!pv&&L.name.indexOf(pv.name.replace(/\s(시행령|시행규칙)$/,''))===0; };
    var row=function(k,sub){ var L=D.meta.laws[k], nb=btTabsOf(k).length;
      return '<button type="button" class="brow'+(sub?' sub':'')+'" data-bk="'+k+'"><span class="bn"><b>'+esc(L.name)+'</b><small>'+esc(lawTag(k))+'</small></span><span class="bm">조문 '+(CNT[k]||0)+(nb?'<small>별표 '+nb+'</small>':'')+'</span>'+CHEV+'</button>'; };
    var btOnly=function(k){ var ts=btTabsOf(k);   // 조문 없이 별표만 수록된 하위 법령
      return '<button type="button" class="brow sub" data-btl="'+k+'"><span class="bn"><b>'+esc(BTL[k].name)+'</b><small>별표만 수록</small></span><span class="bm">별표 '+ts.length+'</span>'+CHEV+'</button>'; };
    var list=function(arr){ var out='', mom=null;
      var flush=function(){ if(mom)Object.keys(BTL).forEach(function(c){ if(c!==mom&&BTL[c].par===mom&&!D.meta.laws[c]&&btTabsOf(c).length)out+=btOnly(c); }); mom=null; };
      arr.forEach(function(k,i){ var sub=i>0&&isSub(k,arr[i-1]); if(!sub){flush();mom=k;} out+=row(k,sub); });
      flush(); return '<div class="list">'+out+'</div>'; };
    var A=nF?ord.slice(0,nF):ord, B=nF?ord.slice(nF):[];
    var h='<h3 class="gl top">'+esc(F?F.name:'수록 법령')+'</h3>'+list(A);
    if(B.length)h+=foldSec('b:oth','그 밖의 법령',B.length+'개',list(B),false);
    $('book').innerHTML=h;
"""
cut(["  function renderBookRoot(){\n"], "    $('book').innerHTML=h;\n", NEW_BOOK, '법령집 첫 화면')

# ── 3. 법령 첫 화면: [조문 | 별표] 탭 ──
rep("      :'<h2 class=\"dt\">'+esc(L.name)+'</h2><p class=\"bver\">'+esc(lawTag(s.law))+'</p>')+'<p class=\"bver\">조문 '+g.arts.length+'</p></div>';\n",
r"""      :'<h2 class="dt">'+esc(L.name)+'</h2><p class="bver">'+esc(lawTag(s.law))+'</p>')+'<p class="bver">조문 '+g.arts.length+'</p></div>';
    var bts=s.path.length?[]:btTabsOf(s.law);   // 2026-09-25: 그 법령에 별표가 있으면 [조문 | 별표] 탭
    if(bts.length){ var tb=s.tab==='bt';
      h+='<div class="seg bktab" role="tablist"><button type="button" role="tab" data-bktab="art" aria-selected="'+!tb+'">조문 '+g.arts.length+'</button><button type="button" role="tab" data-bktab="bt" aria-selected="'+tb+'">별표 '+bts.length+'</button></div>';
      if(tb){ en.segs=null;
        h+='<div class="list mt">'+bts.map(function(T){ return '<button type="button" class="brow" data-bt="'+T.id+'"><span class="bn"><b>별표 '+esc(T.n)+' '+esc(T.t)+'</b><small>'+esc(btRel(T))+'</small></span>'+CHEV+'</button>'; }).join('')+'</div>'
          +'<p class="andq">'+esc(fmtD(btDates(bts).join('·'))+' 내려받은 원문 기준 · 그 밖의 별표는 국가법령정보센터에서 확인')+'</p>';
        en.el.innerHTML=h; return; } }
""", '법령 탭')

# 법 첫 화면 맨 아래 별표 줄: 각 법령 탭으로 옮겼으므로 '별표만 수록' 하위 법령만 남김
rep("  function btlRowsFor(law){ var ks=Object.keys(BTL).filter(function(k){return BTL[k].par===law&&BT.tabs.some(function(T){return T.law===k;});}); if(!ks.length)return '';",
    "  function btlRowsFor(law){ var ks=Object.keys(BTL).filter(function(k){return BTL[k].par===law&&!D.meta.laws[k]&&BT.tabs.some(function(T){return T.law===k;});}); if(!ks.length)return '';",
    '법 아래 별표')

# ── 4. 이벤트: 접기·탭 ──
rep("  $('iq').addEventListener('input',renderIList);\n",
r"""  $('iq').addEventListener('input',renderIList);
  document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-fold],[data-bktab]'); if(!b)return;   // 2026-09-25
    if(b.hasAttribute('data-bktab')){ var en=topOf(nav); if(en&&en.spec.type==='bk'){ en.spec.tab=b.getAttribute('data-bktab'); renderSub(en); } return; }
    var k=b.getAttribute('data-fold'), op=b.getAttribute('aria-expanded')!=='true', bd=b.nextElementSibling;
    b.setAttribute('aria-expanded',String(op)); if(bd)bd.hidden=!op; (k.charAt(0)==='b'?FOLDB:FOLD.o)[k]=op;
    if(!op){ var lim=$('hdr').offsetHeight, sb=nav==='find'&&!topOf('find')?document.querySelector('#vFind .sbar'):null, fc=sb?document.querySelector('#results .fl'):null;
      if(sb)lim+=sb.offsetHeight+(fc?fc.offsetHeight:0);
      var top=b.getBoundingClientRect().top; if(top<lim)window.scrollTo(0,(window.pageYOffset||0)+top-lim-6); } });   // 접은 제목이 화면 위로 사라지지 않게
""", '이벤트')

rep("  window.addEventListener('resize',setHdrH);\n",
    "  window.addEventListener('resize',function(){ setHdrH(); setSbH(); });\n", '크기 변경')

# ── 5. 스타일 ──
CSS = r"""
/* 2026-09-25: 접는 구획, 법령 칩 줄 고정, 법령집 조문·별표 수, 법령 [조문|별표] 탭 */
.gl.fold{width:100%;min-height:44px;margin-bottom:2px;align-items:center;text-align:left;font-size:.8125rem;font-weight:700;color:var(--ink2)}
.gl.fold::after{order:1}
.gl.fold .fdd{order:2;flex:none;width:7px;height:7px;margin:0 8px 0 2px;border-right:1.8px solid var(--ink3);border-bottom:1.8px solid var(--ink3);transform:translateY(-2px) rotate(45deg);transition:transform .15s}
.gl.fold[aria-expanded="true"] .fdd{transform:translateY(2px) rotate(-135deg)}
.gl.fold[aria-expanded="false"]{color:var(--ink)}
.gl.fold:focus-visible{outline:2px solid var(--pri);outline-offset:2px;border-radius:4px}
.fbody>.gl.in:first-child{margin-top:4px}
.gl.in{margin-top:18px}
.fl{position:sticky;top:calc(var(--hdrh) + var(--sbh,64px));z-index:15;background:var(--bg);margin-top:4px;padding-top:4px;padding-bottom:8px}
.brow .bm{text-align:right;line-height:1.35}
.brow .bm small{display:block;margin-top:1px;font-size:inherit}
.seg.bktab{margin-top:12px}
@media (prefers-reduced-motion:reduce){.gl.fold .fdd{transition:none}}
"""
i = t.find('</style>')
if i < 0: sys.exit('중단[스타일]: </style> 없음')
t = t[:i] + CSS + t[i:]

open(dst, 'w', encoding='utf-8').write(t)
print('저장:', dst)
