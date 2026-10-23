# 법ON 서비스워커 저장본 우선 검사(2026-10-23) — 사용: python3 tests/claude_sw_ui_test.py [저장소 폴더]
# 앱 화면은 저장본을 바로 띄우고(느린 서버·오프라인에서도 기다리지 않음), 새 판은 뒤에서 받아
# 연 지 5초 안·첫 화면이면 새로고침, 5초가 지났거나 쓰는 중이면 안내 띠만 띄우는지 확인
# 저장소 파일은 건드리지 않고 임시 폴더에 복사해 그 안에서 '새 판'을 만듦
import os, sys, time, shutil, tempfile, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP=tempfile.mkdtemp(prefix='lawon_sw_')
for f in ('index.html','service-worker.js','manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png'):
    shutil.copy(os.path.join(ROOT,f),TMP)
DELAY={'s':0.0}   # index.html 응답 지연(초) — 현장 약한 신호 흉내
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
    def do_GET(self):
        if self.path.split('?')[0].endswith(('/','index.html')) and DELAY['s']: time.sleep(DELAY['s'])
        return super().do_GET()
socketserver.ThreadingTCPServer.allow_reuse_address=True
srv=socketserver.ThreadingTCPServer(('127.0.0.1',8783),functools.partial(Q,directory=TMP))
srv.daemon_threads=True
threading.Thread(target=srv.serve_forever,daemon=True).start()
URL='http://127.0.0.1:8783/index.html'
SRC=open(os.path.join(TMP,'index.html'),encoding='utf-8').read()
N=[0]
def new_version():   # 서버의 index.html을 새 판으로(표시 meta + 수정 시각 → Last-Modified가 달라짐)
    N[0]+=1; p=os.path.join(TMP,'index.html')
    open(p,'w',encoding='utf-8').write(SRC.replace('</head>','<meta name="lawon-test" content="v%d"></head>'%N[0],1))
    t=time.time()+N[0]*100; os.utime(p,(t,t)); return 'v%d'%N[0]
fails=[]
def ok(n,c,i=''):
    print(('PASS ' if c else 'FAIL ')+n+('' if c else '  → '+str(i)))
    if not c: fails.append(n)
def ver(p):
    return p.evaluate("()=>{const m=document.querySelector('meta[name=lawon-test]');return m?m.content:'v0'}")
def shown(p,sel):
    return p.evaluate("(s)=>!document.querySelector(s).hidden",sel)
def open_timed(p):   # 새로 열기 → 분야 선택 화면이 보일 때까지 걸린 초
    t=time.time(); p.goto(URL,wait_until='commit'); p.wait_for_selector('[data-field="labor"]',state='visible',timeout=20000); return time.time()-t
try:
  with sync_playwright() as pw:
    b=pw.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':800},has_touch=True,is_mobile=True)
    p=ctx.new_page(); p.goto(URL); p.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller",timeout=15000)
    p.wait_for_function("caches.keys().then(k=>k.includes('lawon-v8'))",timeout=15000)
    ok('설치 — 저장소 lawon-v8, 서비스워커 제어', True)
    # 1 느린 서버(4초) — 저장본으로 바로 열림(옛 방식은 3초 기다림)
    DELAY['s']=4
    sec=open_timed(p); ok('느린 서버 4초 — 2초 안에 열림(%.1f초)'%sec, sec<2.0, sec)
    p.wait_for_timeout(4500); DELAY['s']=0
    # 2 오프라인 — 저장본
    ctx.set_offline(True); sec=open_timed(p); ok('오프라인 — 저장본으로 열림(%.1f초)'%sec, sec<2.0, sec); ctx.set_offline(False)
    # 3 새 판(받기 1.5초) — 옛 판이 먼저, 5초 안 첫 화면이면 새로고침·안내 문구
    v=new_version(); DELAY['s']=1.5; open_timed(p); first=ver(p)
    ok('새 판 올린 뒤 처음 열 때 옛 판 먼저', first!=v, first)
    try: p.wait_for_function("(v)=>{const m=document.querySelector('meta[name=lawon-test]');return m&&m.content===v}",arg=v,timeout=8000); got=v
    except Exception: got=ver(p)
    ok('5초 안·첫 화면 — 새 판으로 자동 새로고침', got==v, got)
    ok('새로고침 뒤 \'최신 버전으로 업데이트했습니다.\'', '최신 버전' in p.evaluate("document.getElementById('toast').textContent"))
    ok('새로고침 뒤 안내 띠 없음', not shown(p,'#updbar'))
    DELAY['s']=0; p.wait_for_timeout(2500)   # 앞 단계에서 지연 중이던 뒤쪽 받기가 끝나기를 기다림(안 기다리면 그 받기가 다음 단계의 새 판을 저장본에 넣음)
    p.wait_for_timeout(500); sec=open_timed(p); ok('다시 열면 새 판 그대로(%s)'%ver(p), ver(p)==v)
    # 4 새 판 + 느린 서버(6초) — 받기가 5초를 넘으면 새로고침 대신 안내 띠
    v=new_version(); DELAY['s']=6; open_timed(p); old=ver(p)
    p.wait_for_function("!document.getElementById('updbar').hidden",timeout=15000)
    p.wait_for_timeout(1000)
    ok('받기 5초 넘음 — 새로고침 안 함(옛 판 유지)', ver(p)==old and old!=v, (old,ver(p)))
    ok('받기 5초 넘음 — 안내 띠 표시', shown(p,'#updbar'))
    DELAY['s']=0
    p.click('#updgo'); p.wait_for_function("(v)=>{const m=document.querySelector('meta[name=lawon-test]');return m&&m.content===v}",arg=v,timeout=8000)
    ok('안내 띠 \'지금 적용\' — 새 판', ver(p)==v)
    p.wait_for_timeout(2500)
    # 5 새 판 + 쓰는 중(5초 안이어도 검색 중) — 안내 띠
    v=new_version(); DELAY['s']=1.5; open_timed(p); old=ver(p)
    p.click('[data-field="osh"]'); p.wait_for_timeout(200)
    p.evaluate("()=>{const t=[...document.querySelectorAll('nav button, [data-tab]')].find(x=>x.innerText.trim()==='법령 검색'); if(t)t.click();}")
    p.fill('#q','안전모')
    p.wait_for_function("!document.getElementById('updbar').hidden",timeout=15000); p.wait_for_timeout(800)
    ok('검색 중 — 새로고침 안 함', ver(p)==old and p.evaluate("document.getElementById('q').value")=='안전모', (ver(p),old))
    ok('검색 중 — 안내 띠 표시', shown(p,'#updbar'))
    DELAY['s']=0
    b.close()
finally:
    srv.shutdown(); shutil.rmtree(TMP,ignore_errors=True)
print('\n'+('✅ 모두 통과' if not fails else '❌ 실패 %d: %s'%(len(fails),', '.join(fails))))
sys.exit(1 if fails else 0)
