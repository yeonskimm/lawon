# 법ON 항목별 기준(근로기준, 2026-10-18) 화면 검사 — 사용: python3 claude_labor_item_ui_test.py <tests 기준 파일명.html> [캡처 폴더]
# 확인: 근로기준 검색 첫 화면 항목별 기준 칩(자주 찾는 말 대체, 묶음 5개·14칸), 칩 → 항목 기준 화면(제목·5명 미만 표시·벌칙·계산 단추),
#       검색 결과 맨 위 항목 기준 카드(분야별), 조문 화면 '항목 기준' 링크(하나면 바로, 여럿이면 아래 창), 넘침·스크립트 오류
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8776), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8776/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
SHOT = sys.argv[2] if len(sys.argv) > 2 else ''
SEC = 'main>section.sub:not([hidden])'
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def txt(p, sel): return p.evaluate("(s)=>{const x=document.querySelector(s); return x?x.innerText.replace(/\\s+/g,' ').trim():null}", sel)
def search(p, q): p.fill('#q', q); p.keyboard.press('Enter'); p.wait_for_timeout(700)
def shot(p, name):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, name), full_page=True)
def run(w, big):
    tag = '%dpx%s' % (w, ' 크게' if big else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2)
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1200)
        if big: p.evaluate("()=>{document.documentElement.setAttribute('data-fs','l');}")
        # 1) 근로기준 검색 첫 화면
        p.click('.pick[data-field="labor"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        q = txt(p, '#quick'); n = p.evaluate("()=>document.querySelectorAll('#quick .chip.wchip[data-wk]').length")
        gs = p.evaluate("()=>[...document.querySelectorAll('#quick .wgs')].map(x=>x.textContent)")
        ok(tag + ' 항목별 기준 제목·자주 찾는 말 없음', q and '항목별 기준' in q and '자주 찾는 말' not in q, q)
        ok(tag + ' 칩 14개', n == 14, n)
        ok(tag + ' 묶음 5개 순서', gs == ['계약·규칙', '임금', '시간·휴가', '해고·고용', '여성·연소자'], gs)
        hs = p.evaluate("()=>[...document.querySelectorAll('#quick .wchip')].map(x=>Math.round(x.getBoundingClientRect().height))")
        ok(tag + ' 칩 높이 같음', len(set(hs)) == 1, hs)
        ok(tag + ' 첫 화면 넘침 없음', not wide(p))
        if w == 390 and not big: shot(p, '1_labor_home.png')
        # 2) 칩 → 휴게·주휴 화면
        p.click('#quick .wchip[data-wk="lb_rest"]'); p.wait_for_timeout(600)
        t = txt(p, SEC)
        ok(tag + ' 휴게·주휴 화면 머리', t and t.startswith('항목별 기준 휴게·주휴'), t and t[:60])
        ok(tag + ' 제54조 5명 미만 적용·벌칙 제110조제1호', '제54조 휴게 5명 미만 적용' in t and '제110조제1호' in t, t)
        ok(tag + ' 제55조 5명 미만 제1항만', '제55조 휴일 5명 미만 제1항만' in t, t)
        ok(tag + ' 시행령 제30조도 제1항만', '제30조 휴일 5명 미만 제1항만' in t, t)
        ok(tag + ' 제18조③ 발췌', '15시간 미만인 근로자에 대하여는 제55조와 제60조를 적용하지 아니한다' in t, t)
        ok(tag + ' 제54조 개정 예정 표시', '개정 예정 2026. 12. 10.' in t, t)
        ok(tag + ' 하단 고지', p.evaluate("()=>!document.getElementById('foot').hidden"))
        ok(tag + ' 항목 화면 넘침 없음', not wide(p))
        if w == 390 and not big: shot(p, '2_rest.png')
        p.click(SEC + ' [data-wopen]'); p.wait_for_timeout(500)
        ok(tag + ' 임금·주휴 계산 창 열림', p.evaluate("()=>!document.getElementById('wsheet').hidden"))
        p.evaluate("()=>document.querySelector('#wsheet .shcard [data-wclose],#wsheet [data-wclose]:not(.shbg)').click()"); p.wait_for_timeout(400)
        # 3) 해고: 5명 미만 제외 표시
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        search(p, '해고예고')
        c = txt(p, '#results .wcard')
        ok(tag + ' 해고예고 → 해고 항목 기준 카드', c and c.startswith('해고 항목 기준'), c)
        p.click('#results .wcard'); p.wait_for_timeout(600); t = txt(p, SEC)
        ok(tag + ' 제27조 서면통지 5명 미만 적용 제외', '제27조 해고사유 등의 서면통지 5명 미만 적용 제외' in t, t)
        ok(tag + ' 제26조 5명 미만 적용', '제26조 해고의 예고 5명 미만 적용' in t, t)
        ok(tag + ' 시행규칙 별표1(해고예고 예외) 연결', '해고 예고의 예외가 되는 근로자의 귀책사유' in t, t)
        if w == 390 and not big: shot(p, '3_dismiss.png')
        # 4) 취업규칙: 제93조 10명
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300); search(p, '취업규칙'); p.click('#results .wcard'); p.wait_for_timeout(600); t = txt(p, SEC)
        ok(tag + ' 제93조 5명 미만 적용 제외', '제93조 취업규칙의 작성ㆍ신고 5명 미만 적용 제외' in t, t)
        ok(tag + ' 제93조 과태료 제116조제2항제2호', '제116조제2항제2호' in t, t)
        # 5) 조문 화면 역연결
        p.click(SEC + ' .wrow[data-art="GK:제93조"]'); p.wait_for_timeout(600)
        l = txt(p, SEC + ' .xrl[data-wk]')
        ok(tag + ' 제93조 → 항목 기준 · 취업규칙 링크', l == '항목 기준 · 취업규칙', l)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300); search(p, '근로기준법 제18조'); p.wait_for_timeout(300)
        p.click('#results [data-art="GK:제18조"]'); p.wait_for_timeout(600)
        l = txt(p, SEC + ' .xrl[data-wks]')
        ok(tag + ' 제18조 → 항목 기준 4', l == '항목 기준 4', l)
        p.click(SEC + ' .xrl[data-wks]'); p.wait_for_timeout(500)
        st = txt(p, '#xsheetT'); rows = p.evaluate("()=>[...document.querySelectorAll('#xlist .row .ttl')].map(x=>x.textContent)")
        ok(tag + ' 아래 창 제목·항목 4개', st == '항목 기준 4건' and sorted(rows) == sorted(['근로계약', '휴게·주휴', '연차', '기간제·단시간']), (st, rows))
        ok(tag + ' 아래 창 안내 줄 숨김', p.evaluate("()=>document.getElementById('xhint').hidden"))
        p.click('#xlist .row[data-wk="lb_leave"]'); p.wait_for_timeout(600); t = txt(p, SEC)
        ok(tag + ' 창에서 연차로 이동·창 닫힘', t and t.startswith('항목별 기준 연차') and p.evaluate("()=>document.getElementById('xsheet').hidden"), t and t[:40])
        ok(tag + ' 연차 제60조 5명 미만 적용 제외', '제60조 연차 유급휴가 5명 미만 적용 제외' in t, t)
        p.click(SEC + ' [data-aopen]'); p.wait_for_timeout(500)
        ok(tag + ' 연차 계산 창 열림', p.evaluate("()=>!document.getElementById('asheet').hidden"))
        p.evaluate("()=>document.querySelector('#asheet .shcard [data-aclose],#asheet [data-aclose]:not(.shbg)').click()"); p.wait_for_timeout(400)
        # 6) 분야 구분: 근로기준에서 '지게차' 카드 없음, 산업안전에서 '연차' 카드 없음·지게차 카드는 그대로
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300); search(p, '지게차')
        ok(tag + ' 근로기준 분야 지게차 → 카드 없음', p.query_selector('#results .wcard') is None)
        p.click('#hhome' if p.query_selector('#hhome') else '[data-home]'); p.wait_for_timeout(400)
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        n = p.evaluate("()=>document.querySelectorAll('#quick .chip.wchip[data-wk]').length")
        ok(tag + ' 산업안전 칩 34개 그대로', n == 34, n)
        search(p, '연차'); ok(tag + ' 산업안전 분야 연차 → 카드 없음', p.query_selector('#results .wcard') is None)
        search(p, '지게차'); c = txt(p, '#results .wcard'); ok(tag + ' 산업안전 지게차 카드 그대로', c and c.startswith('지게차 작업 기준'), c)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, big in ((390, False), (320, True), (430, False)): run(w, big)
srv.shutdown()
print('실패 %d건' % len(fails) if fails else '전체 통과')
sys.exit(1 if fails else 0)
