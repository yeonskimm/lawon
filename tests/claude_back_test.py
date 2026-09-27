# 법ON 뒤로 버튼(안드로이드)·뒤로 스와이프(아이폰) 검사(2026-09-27) — 사용: python3 tests/claude_back_test.py [저장소 폴더]
import os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8767),functools.partial(Q,directory=ROOT))
threading.Thread(target=srv.serve_forever,daemon=True).start()
AND='Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36'
IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
fails=[]
def ok(n,c,i=''):
    print(('PASS ' if c else 'FAIL ')+n+('' if c else '  → '+str(i)))
    if not c: fails.append(n)
def where(p):
    if not p.url.startswith('http://127'): return 'LEFT'
    return p.evaluate("""()=>{const o=['sheet','isheet','csheet','wsheet','asheet','adm'].filter(i=>!document.getElementById(i).hidden);
     let v='sub'; for(const id of ['vStart','vFind','vSite','vBook']){ if(!document.getElementById(id).hidden) v=id; }
     return v+(o.length?'+'+o.join(','):'');}""")
def toast(p): return '' if not p.url.startswith('http://127') else p.evaluate("()=>{const t=document.getElementById('toast');return t.hidden?'':t.textContent}")
def back(p):
    try: p.go_back(timeout=2500)
    except Exception: pass
    p.wait_for_timeout(500)
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for name,ua in (('안드로이드',AND),('아이폰',IOS)):
        ctx=b.new_context(user_agent=ua,viewport={'width':390,'height':800},has_touch=True,is_mobile=True)
        def fresh():
            p=ctx.new_page(); p.goto('about:blank'); p.goto('http://127.0.0.1:8767/index.html'); p.wait_for_timeout(1200); return p
        A=name=='안드로이드'
        # 1 분야 선택 → 조문 → 뒤로 3번
        p=fresh(); p.click('[data-field="labor"]'); p.wait_for_timeout(400); p.fill('#q','휴게'); p.wait_for_timeout(700)
        p.locator('[data-art]').first.click(); p.wait_for_timeout(400)
        back(p); ok(name+' 조문→뒤로=법령 검색', where(p)=='vFind', where(p))
        back(p); ok(name+' 법령 검색→뒤로=분야 선택', where(p)=='vStart', where(p))
        back(p)
        if A:
            ok(name+' 분야 선택→뒤로=종료 안내', where(p)=='vStart' and '한 번 더' in toast(p), (where(p),toast(p)))
            back(p); ok(name+' 안내 후 뒤로=종료', where(p)=='LEFT', where(p))
        else:
            ok(name+' 분야 선택→뒤로=안내 없이 앱 밖(실기기는 무반응)', where(p)=='LEFT', where(p))
        p.close()
        # 2 안내 뒤 2초 지나면 다시 안내
        if A:
            p=fresh(); p.click('[data-field="osh"]'); p.wait_for_timeout(400); back(p); back(p)
            p.wait_for_timeout(2300); back(p); ok(name+' 2초 지나면 다시 안내', where(p)=='vStart' and '한 번 더' in toast(p), (where(p),toast(p))); p.close()
        # 3 첫 화면 계산기 창 → 뒤로 = 창만 닫힘, 입력 유지
        for oid in ('calcOpen','wageOpen','leaveOpen'):
            p=fresh(); p.click('#'+oid); p.wait_for_timeout(400); back(p)
            ok(name+' '+oid+' 창→뒤로=창 닫힘', where(p)=='vStart', where(p)); p.close()
        # 4 창 안 닫기 버튼 → 뒤로 한 번에 다음 단계(헛눌림 없음)
        p=fresh(); p.click('#calcOpen'); p.wait_for_timeout(300); p.click('#csheet .shcard [data-cclose]'); p.wait_for_timeout(400)
        back(p); ok(name+' 닫기 버튼 후 뒤로=헛눌림 없음', (where(p)=='vStart' and '한 번 더' in toast(p)) if A else where(p) in ('vStart','LEFT'), (where(p),toast(p))); p.close()
        # 5 계산기 → 다른 계산기 연달아 열고 뒤로
        p=fresh(); p.click('#wageOpen'); p.wait_for_timeout(300); p.click('#wsheet .shcard [data-wclose]'); p.wait_for_timeout(300); p.click('#leaveOpen'); p.wait_for_timeout(300)
        back(p); ok(name+' 창 바꿔 열고 뒤로=창 닫힘', where(p)=='vStart', where(p)); p.close()
        # 6 법령 검색 탭에서 설정 창 → 뒤로
        p=fresh(); p.click('[data-field="labor"]'); p.wait_for_timeout(300); p.click('#gear'); p.wait_for_timeout(300); back(p)
        ok(name+' 설정 창→뒤로=창 닫힘', where(p)=='vFind', where(p)); back(p); ok(name+' 이어서 뒤로=분야 선택', where(p)=='vStart', where(p)); p.close()
        # 7 설정 창에서 분야 바꾸기 → 뒤로
        p=fresh(); p.click('[data-field="labor"]'); p.wait_for_timeout(300); p.click('#gear'); p.wait_for_timeout(300); p.click('[data-field-set="osh"]'); p.wait_for_timeout(500)
        back(p); ok(name+' 설정에서 분야 바꾼 뒤 뒤로=분야 선택', where(p)=='vStart', where(p)); p.close()
        # 8 법령집 탭·조문 2단 → 홈 버튼 → 뒤로
        p=fresh(); p.click('[data-field="labor"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="book"]'); p.wait_for_timeout(400)
        back(p); ok(name+' 법령집 탭→뒤로=분야 선택', where(p)=='vStart', where(p)); p.close()
        p=fresh(); p.click('[data-field="labor"]'); p.wait_for_timeout(300); p.fill('#q','해고'); p.wait_for_timeout(700)
        p.locator('[data-art]').first.click(); p.wait_for_timeout(400)
        if p.locator('[data-home]:visible').count():
            p.locator('[data-home]:visible').first.click(); p.wait_for_timeout(600); ok(name+' 홈 버튼=분야 선택', where(p)=='vStart', where(p))
            back(p)
            ok(name+' 홈 버튼 뒤 뒤로', (where(p)=='vStart' and '한 번 더' in toast(p)) if A else where(p) in ('vStart','LEFT'), (where(p),toast(p)))
        p.close()
        # 9 산업안전 적용 확인: 업종 선택 창 → 뒤로
        p=fresh(); p.click('[data-field="osh"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="site"]'); p.wait_for_timeout(400)
        io=p.locator('[data-iopen]:visible, [data-icat]:visible')
        if io.count():
            io.first.click(); p.wait_for_timeout(400)
            if 'isheet' in where(p):
                back(p); ok(name+' 업종 창→뒤로=창 닫힘', where(p)=='vSite', where(p))
                back(p); ok(name+' 이어서 뒤로=분야 선택', where(p)=='vStart', where(p))
        p.close()
        # 10 관리자 창
        p=fresh(); [p.click('#vStart .hero') for _ in range(5)]; p.wait_for_timeout(300)
        ok(name+' 관리자 창 열림', 'adm' in where(p), where(p)); back(p); ok(name+' 관리자 창→뒤로=닫힘', where(p)=='vStart', where(p))
        ok(name+' 관리자 닫은 뒤 화면 스크롤 복구', p.evaluate("document.body.style.overflow")=='' ); p.close()
        ctx.close()
    b.close()
print('실패 %d건'%len(fails)); sys.exit(1 if fails else 0)
