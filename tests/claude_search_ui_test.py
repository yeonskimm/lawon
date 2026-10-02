# 법ON 검색 보강 화면 검사(2026-10-02) — 사용: python3 tests/claude_search_ui_test.py <저장소 폴더>
# 0건·소수 결과 화면: 스크립트 오류, 뺀 말 표시, 검색어별 결과가 수록 법령보다 위, 수록 법령 접힘, 줄 누르면 그 말로 다시 검색, 가로 넘침(390px, 320px 글자 크게)
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
ROOT=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
srv=socketserver.TCPServer(('127.0.0.1',8791),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
fails=[]
def ok(n,c,i=''):
    print(('PASS ' if c else 'FAIL ')+n+('' if c else '  → '+str(i)[:300]))
    if not c: fails.append(n)
JS="""()=>{const R=document.getElementById('results'), t=R.innerText, fb=R.querySelector('.andfb'), lf=R.querySelector('.lawsx');
 return {t, rows:[...R.querySelectorAll('.andfb .row')].map(x=>x.innerText.replace(/\\s+/g,' ')), lawOpen: lf?lf.open:null,
  order: (fb&&lf)? !!(fb.querySelector('.list').compareDocumentPosition(lf)&4):null, ov: document.documentElement.scrollWidth>innerWidth+1}}"""
CASES=[ # 분야, 검색어, 있어야 할 글, 없어야 할 글, 검색어별 줄 수
 ('osh','지게차 안전관리',['두 말이 함께 있는 조문 없음','검색어별 결과','수록 법령'],['에 대한 검색 결과가 없습니다'],2),
 ('osh','안전난간 없음',['‘없음’ 제외하고 검색','안전난간의 구조'],['검색어별 결과'],0),
 ('osh','지게차 후진하다 사고',['‘하다’ 제외하고 검색','검색어가 모두 함께 있는 조문 없음','검색어별 결과'],[],3),
 ('osh','관리감독자 교육 몇시간',['‘몇’ 제외하고 검색','교육시간'],[],0),
 ('labor','5인미만 야간수당',['모두 포함','검색어별 결과','근기법 제11조'],[],2),
 ('osh','지게차 작업계획서',['차량계 하역운반기계','작업계획서의 작성'],['검색어별 결과'],0),
 ('osh','건설현장 안전난간',['두 말이 함께 있는 조문 없음','건설현장'],['제외하고 검색'],2),
 ('osh','헤드가드없는쇠망치',['에 대한 검색 결과가 없습니다','수록 법령'],[],0),
]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for f,q,must,mustnot,nrows in CASES:
        for w,big in [(390,False),(320,True)]:
            c=b.new_context(viewport={'width':w,'height':760}); p=c.new_page(); errs=[]
            p.on('pageerror',lambda e: errs.append(str(e))); p.on('console',lambda m: m.type=='error' and errs.append(m.text))
            p.goto('http://127.0.0.1:8791/index.html'); p.wait_for_timeout(600)
            if big: p.evaluate("()=>{document.documentElement.style.fontSize='120%'}")
            p.click('.pick[data-field="%s"]'%f); p.wait_for_timeout(200); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200)
            p.fill('#q',q); p.wait_for_timeout(600)
            r=p.evaluate(JS); tag='%s %dpx'%(q,w)
            ok(tag+' 오류 없음', not errs, errs)
            miss=[m for m in must if m not in r['t']]; bad=[m for m in mustnot if m in r['t']]
            ok(tag+' 표시', not miss and not bad, ('없음:',miss,'있으면 안 됨:',bad, r['t'][:400]))
            ok(tag+' 검색어별 줄 %d'%nrows, len(r['rows'])==nrows, r['rows'])
            if r['lawOpen'] is not None: ok(tag+' 수록 법령은 접힘', r['lawOpen'] is False)
            if r['order'] is not None: ok(tag+' 검색어별 결과가 수록 법령보다 위', r['order'])
            ok(tag+' 가로 넘침 없음', not r['ov'])
            if nrows and w==390:
                first=p.evaluate("()=>{const x=document.querySelector('#results .andfb .row:not([disabled])'); return x?x.dataset.q:''}")
                p.click('#results .andfb .row:not([disabled])'); p.wait_for_timeout(500)
                ok(tag+' 줄 누르면 그 말로 다시 검색', p.input_value('#q')==first and first!='', (p.input_value('#q'),first))
            c.close()
    b.close()
print('실패 %d건'%len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
