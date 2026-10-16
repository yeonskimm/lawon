# 법ON 정의 카드·위반 문구 미리보기·교육시간 비고·개정 안내 줄 삭제 화면 검사(2026-10-16) — 사용: python3 claude_defcard_ui_test.py <tests 기준 파일명.html>
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8770), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8770/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def q(p, t): p.fill('#q', t); p.keyboard.press('Enter'); p.wait_for_timeout(700)
def card(p): return p.evaluate("()=>{const c=document.querySelector('#results .dfc'); return c?c.innerText.replace(/\\s+/g,' ').trim():null;}")
def first_card(p): return p.evaluate("()=>{const r=document.querySelector('#results'); const c=r.querySelector('.card,.list,h3,.fold'); return c&&c.classList.contains('dfc');}")
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def run(w, big):
    tag = '%dpx%s' % (w, ' 크게' if big else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800})
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1200)
        if big: p.evaluate("()=>{document.documentElement.classList.add('big');document.documentElement.style.fontSize='19px';}")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        q(p, '도급인'); c = card(p)
        ok(tag + ' 도급인 정의 카드', c is not None and '"도급인"이란' in c and '산안법 제2조' in c, c)
        ok(tag + ' 개정 시행 안내 줄 없음', p.evaluate("()=>document.getElementById('due').hidden"))
        ok(tag + ' 가로 넘침 없음(정의)', not wide(p))
        q(p, '도급인 뜻'); c = card(p); ok(tag + " '뜻' 떼고 정의", c is not None and '"도급인"이란' in c, c)
        q(p, '산재'); c = card(p); ok(tag + ' 산재 → 산업재해 정의', c is not None and '산업재해' in c and '"산업재해"란' in c, c)
        q(p, '안전'); ok(tag + ' 정의 용어 아니면 카드 없음', card(p) is None)
        q(p, '선임하지 않은')
        sn = p.evaluate("()=>{const x=document.querySelector('#results [data-art=\"OSH:제17조\"] .snip'); return x?x.innerText.trim():null;}")
        ok(tag + ' 위반 문구 미리보기', sn is not None and sn.startswith('과태료 위반행위') and '선임하지 않은' in sn, sn)
        q(p, '정기교육')
        p.evaluate("()=>{document.querySelector('#results [data-item=\"o_edu\"]').click();}"); p.wait_for_timeout(800)
        t = p.evaluate("()=>{const s=document.querySelector('main>section.sub:not([hidden])'); return s?s.innerText:'';}")
        ok(tag + ' 교육시간 비고 3(½)', '2분의 1 이상(별표4 비고 3)' in t, t[:200])
        ok(tag + ' 교육시간 비고 2(면제)', '1주일 동안 같은 사업장에서 같은 업무로' in t)
        ok(tag + ' 별표4 링크', p.evaluate("()=>!!document.querySelector('main>section.sub:not([hidden]) [data-bt=\"S4\"]')"))
        ok(tag + ' 가로 넘침 없음(교육)', not wide(p))
        p.click('#hback'); p.wait_for_timeout(400)
        p.click('#fieldsw'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        q(p, '근로자'); c = card(p)
        ok(tag + ' 근로기준 분야 근로자 → 근기법 제2조 먼저', c is not None and c.find('근기법 제2조') >= 0 and '다른 법령 정의' in c, c)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, big in [(390, False), (320, True), (430, False)]: run(w, big)
print('실패 %d건' % len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
