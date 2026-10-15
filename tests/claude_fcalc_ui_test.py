# 법ON 산안법 과태료 '금액 계산' 화면 검사(2026-10-15) — 사용: python3 claude_fcalc_ui_test.py <tests 기준 파일명.html>
# 확인: 접힘 링크(산안법만)·펼침·검색 조건 인원 연동·차수·중대재해 체크·1명당 인원·하한 100만원·규모 선택·건설 공사금액·오류 문구·가로 넘침·스크립트 오류
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8768), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8768/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
SEC = 'main>section.sub:not([hidden])'
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def setf(p, f, v):
    p.evaluate("([f,v])=>{const x=document.getElementById(f); x.value=v; x.dispatchEvent(new Event('input',{bubbles:true})); x.dispatchEvent(new Event('change',{bubbles:true}));}", [f, v])
def go(p, q, art):
    p.fill('#q', q); p.keyboard.press('Enter'); p.wait_for_timeout(700)
    p.evaluate("(a)=>{const x=document.querySelector('#results [data-art=\"'+a+'\"]'); x.click();}", art); p.wait_for_timeout(700)
def res(p): return p.evaluate("(s)=>{const r=document.querySelector(s+' .fcres'); return r?r.innerText.replace(/\\n/g,' / '):null;}", SEC)
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def first_fines_with_calc(p, i=0):   # i번째 '금액 계산' 링크가 있는 과태료 칸
    return p.locator(SEC + ' .fines:has([data-fcopen])').nth(i)
def run(w, big):
    tag = '%dpx%s' % (w, ' 크게' if big else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800})
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1200)
        if big: p.evaluate("()=>{document.documentElement.classList.add('big');document.documentElement.style.fontSize='19px';}")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        setf(p, 'n', '30')
        # 1) 산안법 제17조: 미선임 500(1~3차), 30명 → 80%
        go(p, '안전관리자 선임', 'OSH:제17조')
        F = first_fines_with_calc(p)
        ok(tag + ' 제17조 접힌 링크', F.locator('[data-fcopen]').inner_text().strip() == '금액 계산 ›')
        ok(tag + ' 처음엔 패널 숨김', not F.locator('.fcb').is_visible())
        F.locator('[data-fcopen]').click(); p.wait_for_timeout(200)
        r = F.locator('.fcres').inner_text()
        ok(tag + ' 미선임 1차 30명 → 400만원', '400만원' in r and '× 80%' in r, r)
        ok(tag + ' 규모 자동 표시', '상시 30명 → 80%' in F.locator('.fcb').inner_text())
        ok(tag + ' 강조 칸 1개', F.locator('.fpk').count() == 1)
        # 두 번째 줄(업무 미수행 300/400/500) 선택 → 2차
        F.locator('.fr[data-fa]').nth(1).click(); p.wait_for_timeout(150)
        F.locator('[data-fcc="1"]').click(); p.wait_for_timeout(150)
        r = F.locator('.fcres').inner_text()
        ok(tag + ' 업무 미수행 2차 → 320만원', '320만원' in r, r)
        F.locator('[data-fcj]').check(); p.wait_for_timeout(150)
        r = F.locator('.fcres').inner_text()
        ok(tag + ' 중대재해 체크 → 3차 500 × 80% = 400만원', '400만원' in r and '3차 금액 적용' in r, r)
        ok(tag + ' 중대재해 체크 시 차수 버튼 잠김', F.locator('[data-fcc="0"]').is_disabled())
        ok(tag + ' 가로 넘침 없음(제17조 펼침)', not wide(p))
        F.locator('[data-fcopen]').click(); p.wait_for_timeout(150)
        ok(tag + ' 접으면 패널·강조 사라짐', (not F.locator('.fcb').is_visible()) and F.locator('.fpk').count() == 0)
        # 2) 제29조: 인원 조건 지우고 1명당
        setf(p, 'n', '')
        p.click('#hback'); p.wait_for_timeout(400)
        go(p, '근로자 안전보건교육', 'OSH:제29조')
        F = first_fines_with_calc(p)
        F.locator('[data-fcopen]').click(); p.wait_for_timeout(200)
        ok(tag + ' 규모 미입력 → 규모 버튼 4개', F.locator('[data-fcs]').count() == 4)
        r = F.locator('.fcres').inner_text()
        ok(tag + ' 규모 고르기 전 계산 안 함', '규모를 고르면' in r, r)
        F.locator('[data-fcs="0.8"]').click(); p.wait_for_timeout(150)
        F.locator('[data-fcn]').fill('12'); p.wait_for_timeout(150)
        r = F.locator('.fcres').inner_text()
        ok(tag + ' 10만원 × 12명 → 하한 100만원', '100만원' in r and '12명' in r and '100만원 미만이라 100만원' in r, r)
        F.locator('[data-fcn]').fill('8'); p.wait_for_timeout(150)
        r = F.locator('.fcres').inner_text()
        ok(tag + ' 10만원 × 8명 → 감경 없음 80만원', '80만원' in r and '감경 없음' in r, r)
        F.locator('[data-fcn]').fill('0'); p.wait_for_timeout(150)
        ok(tag + ' 인원 0 → 오류 문구', F.locator('[data-fce]').is_visible())
        F.locator('[data-fcn]').fill('15'); p.wait_for_timeout(150)
        ok(tag + ' 다시 입력하면 오류 사라짐', not F.locator('[data-fce]').is_visible())
        lab = F.locator('.fcres small').inner_text()
        ok(tag + ' 같은 문구 줄은 위반행위 이름 붙임', '·' in lab.replace('부과 예정 ·', ''), lab)
        ok(tag + ' 가로 넘침 없음(제29조 펼침)', not wide(p))
        # 3) 건설업 공사금액 2억 → 70%
        p.click('#hback'); p.wait_for_timeout(400)
        p.evaluate("()=>{const s=document.getElementById('ind'); s.value='const'; s.dispatchEvent(new Event('change',{bubbles:true}));}"); p.wait_for_timeout(200)
        setf(p, 'amt', '2')
        go(p, '안전관리자 선임', 'OSH:제17조')
        F = first_fines_with_calc(p)
        F.locator('[data-fcopen]').click(); p.wait_for_timeout(200)
        t = F.locator('.fcb').inner_text()
        ok(tag + ' 건설 공사금액 2억 → 70%', '공사금액 2억원 → 70%' in t, t)
        ok(tag + ' 건설 미선임 500 × 70% = 350만원', '350만원' in F.locator('.fcres').inner_text())
        # 4) 근로기준 법령에는 링크 없음
        p.click('#hback'); p.wait_for_timeout(400)
        p.click('#fieldsw'); p.wait_for_timeout(300)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        go(p, '취업규칙 신고', 'GK:제93조')
        ok(tag + ' 근기법 과태료 칸 있음', p.locator(SEC + ' .fines').count() > 0)
        ok(tag + ' 근기법에는 금액 계산 없음', p.locator(SEC + ' [data-fcopen]').count() == 0)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, big in [(390, False), (320, True), (430, False)]:
    run(w, big)
print('실패 %d건' % len(fails) if fails else '모두 통과')
sys.exit(1 if fails else 0)
