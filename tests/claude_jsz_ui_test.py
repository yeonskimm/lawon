# 법ON '적용 판단' 인원 미입력 카드(요약 + 카드 안 입력) 화면 검사 — 사용: python3 claude_jsz_ui_test.py <파일명.html>
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8767), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8767/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def card(p): return p.evaluate("()=>{const c=[...document.querySelectorAll('main>section.sub:not([hidden]) .jsz')][0]; return c?c.innerText:null;}")
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def run(w, big, shot):
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2)
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1200)
        if big: p.evaluate("()=>{document.documentElement.classList.add('big');document.documentElement.style.fontSize='19px';}")
        tag = '%dpx%s' % (w, ' 크게' if big else '')
        # 산업안전 → 법령 검색 → '정기교육' 조문(산안법 제29조)
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        p.fill('#q', '근로자 안전보건교육'); p.keyboard.press('Enter'); p.wait_for_timeout(700)
        p.evaluate("()=>{const x=document.querySelector('#results [data-art=\"OSH:제29조\"]'); x.click();}"); p.wait_for_timeout(700)
        t = card(p)
        ok(tag + ' 산안법 제29조 요약 문구', t and '상시 5명부터 (일부 업종 제외' in t, t)
        ok(tag + ' 입력 버튼 이름(산안: 인원·업종)', t and '인원·업종 입력' in t, t)
        if shot: p.screenshot(path=shot + '_1.png', full_page=False, clip=None)
        p.evaluate("()=>document.querySelector('main>section.sub:not([hidden]) .jsz').scrollIntoView({block:'center'})"); p.wait_for_timeout(200)
        if shot: p.screenshot(path=shot + '_1.png')
        ok(tag + ' 가로 넘침 없음(접힘)', not wide(p))
        p.click('main>section.sub:not([hidden]) .jsz [data-jin]'); p.wait_for_timeout(300)
        ok(tag + ' 펼치면 입력칸 보임', p.is_visible('main>section.sub:not([hidden]) .jsz [data-jf="n"]'))
        ok(tag + ' 가로 넘침 없음(펼침)', not wide(p))
        if shot: p.screenshot(path=shot + '_2.png')
        p.fill('main>section.sub:not([hidden]) .jsz [data-jf="n"]', '30')
        p.select_option('main>section.sub:not([hidden]) .jsz [data-jf="ind"]', 'mfgHeavy')
        p.click('main>section.sub:not([hidden]) .jsz [data-japply]'); p.wait_for_timeout(600)
        t2 = p.evaluate("()=>[...document.querySelectorAll('main>section.sub:not([hidden]) .card')].map(x=>x.innerText).join('|')")
        ok(tag + ' 판정 후 요약 카드 사라짐', card(p) is None, card(p))
        ok(tag + ' 판정 후 같은 조문 화면 유지', 'html' and p.evaluate("()=>document.getElementById('htitle').textContent").find('제29조') >= 0)
        ok(tag + ' 검색 조건과 연동(인원)', p.evaluate("()=>document.getElementById('n').value") == '30')
        ok(tag + ' 검색 조건과 연동(업종)', p.evaluate("()=>document.getElementById('ind').value") == 'mfgHeavy')
        if shot: p.screenshot(path=shot + '_3.png')
        # 근로기준: 조건 지우고 근기법 제93조
        p.evaluate("()=>{document.querySelectorAll('[data-f]').forEach(x=>x.value='');}")
        p.click('#hback'); p.wait_for_timeout(400)
        p.evaluate("()=>{const b=document.querySelector('[data-clearprof]'); if(b) b.click();}"); p.wait_for_timeout(300)
        p.click('#fieldsw'); p.wait_for_timeout(300)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        p.fill('#q', '취업규칙 신고'); p.keyboard.press('Enter'); p.wait_for_timeout(700)
        p.evaluate("()=>{const x=document.querySelector('#results [data-art=\"GK:제93조\"]'); x.click();}"); p.wait_for_timeout(700)
        t = card(p)
        ok(tag + ' 근기법 제93조 요약', t and '상시 10명부터' in t, t)
        ok(tag + ' 근로기준은 인원만 입력', t and '인원 입력' in t and '업종' not in t, t)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, big in [(390, False), (390, True), (320, True), (430, False)]:
    run(w, big, '/tmp/jsz_%d%s' % (w, 'b' if big else '') if w in (390, 320) else None)
print('실패 %d건' % len(fails) if fails else '전체 통과'); srv.shutdown(); sys.exit(1 if fails else 0)
