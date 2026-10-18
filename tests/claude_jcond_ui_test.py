# 법ON '적용 판단' 업종·공사금액 미입력 카드 화면 검사(2026-10-18) — 사용: python3 claude_jcond_ui_test.py <파일명.html> [캡처 폴더]
# 결함: 카드 안에서 인원만 넣고 판정하면 '추가 확인 · 업종 선택 필요'로 바뀌면서 입력칸이 사라져 업종을 넣을 길이 없었음
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8778), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8778/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
S = 'main>section.sub:not([hidden]) '
def card(p): return p.evaluate("()=>{const c=document.querySelector('%s.jsz'); return c?c.innerText:null;}" % S)
def judge(p): return p.evaluate("()=>{const h=[...document.querySelectorAll('%sh3.gl')].find(x=>x.textContent.startsWith('적용 판단')); return h&&h.nextElementSibling?h.nextElementSibling.innerText:null;}" % S)
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def shot(p, name):
    if not SHOT: return
    p.evaluate("()=>{const h=[...document.querySelectorAll('%sh3.gl')].find(x=>x.textContent.startsWith('적용 판단')); if(h)h.scrollIntoView({block:'start'}); window.scrollBy(0,-70);}" % S); p.wait_for_timeout(200)
    p.screenshot(path=os.path.join(SHOT, name))
def start(pw, w, big, q, sel):
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2)
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(URL); p.wait_for_timeout(1200)
    if big: p.evaluate("()=>{document.documentElement.classList.add('big');document.documentElement.style.fontSize='19px';}")
    p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300)
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
    p.fill('#q', q); p.keyboard.press('Enter'); p.wait_for_timeout(700)
    p.evaluate("()=>document.querySelector('#results %s').click()" % sel); p.wait_for_timeout(700)
    return b, p, errs
def fill_apply(p, n=None, ind=None, amt=None, opened=False):
    if not opened: p.click(S + '.jsz [data-jin]'); p.wait_for_timeout(300)
    if n is not None: p.fill(S + '.jsz [data-jf="n"]', n)
    if ind is not None: p.select_option(S + '.jsz [data-jf="ind"]', ind); p.wait_for_timeout(100)
    if amt is not None: p.fill(S + '.jsz [data-jf="amt"]', amt)
    p.click(S + '.jsz [data-japply]'); p.wait_for_timeout(600)
def run(w, big, cap):
    tag = '%dpx%s' % (w, ' 크게' if big else '')
    with sync_playwright() as pw:
        # 1. 주요 의무 '안전관리자 선임' — 인원만 → 업종 입력 → 판정
        b, p, errs = start(pw, w, big, '안전관리자', '[data-item="o_safe"]')
        ok(tag + ' 안전관리자: 처음은 인원 미입력 카드', card(p) is not None and '인원·업종 입력' in card(p), card(p))
        fill_apply(p, n='500')
        t = card(p)
        ok(tag + ' 인원만 넣으면 추가 확인 · 업종 선택 필요', t is not None and '추가 확인' in t and '업종 선택 필요' in t, judge(p))
        ok(tag + ' 업종 입력 버튼 남음', t is not None and '업종 입력' in t, t)
        if cap: shot(p, 'jc_%s_1_cond.png' % cap)
        if t is not None:
            p.click(S + '.jsz [data-jin]'); p.wait_for_timeout(300)
            ok(tag + ' 펼치면 업종 칸 보이고 초점', p.is_visible(S + '.jsz [data-jf="ind"]') and p.evaluate("()=>document.activeElement&&document.activeElement.getAttribute('data-jf')") == 'ind')
            ok(tag + ' 인원 칸에 500 유지', p.input_value(S + '.jsz [data-jf="n"]') == '500')
            ok(tag + ' 가로 넘침 없음(펼침)', not wide(p))
            if cap: shot(p, 'jc_%s_2_open.png' % cap)
            fill_apply(p, ind='mfgHeavy', opened=True)
            ok(tag + ' 업종 넣으면 판정 완료(입력 카드 없음)', card(p) is None, card(p))
            ok(tag + ' 판정 결과 적용', (judge(p) or '').startswith('적용'), judge(p))
            ok(tag + ' 검색 조건 연동(인원·업종)', p.evaluate("()=>[document.getElementById('n').value,document.getElementById('ind').value]") == ['500', 'mfgHeavy'])
            if cap: shot(p, 'jc_%s_3_done.png' % cap)
        ok(tag + ' 스크립트 오류 없음(1)', not errs, errs); b.close()
        # 2. 건설업 — 공사금액 없이 → 공사금액 입력
        b, p, errs = start(pw, w, big, '안전관리자', '[data-item="o_safe"]')
        fill_apply(p, n='30', ind='const')
        t = card(p)
        ok(tag + ' 건설업 금액 없으면 공사금액 입력 필요 + 버튼', t is not None and '공사금액 입력 필요' in t and '공사금액 입력' in t, judge(p))
        if t is not None:
            p.click(S + '.jsz [data-jin]'); p.wait_for_timeout(300)
            ok(tag + ' 공사금액 칸 보이고 초점', p.is_visible(S + '.jsz [data-jf="amt"]') and p.evaluate("()=>document.activeElement&&document.activeElement.getAttribute('data-jf')") == 'amt')
            if cap: shot(p, 'jc_%s_4_amt.png' % cap)
            fill_apply(p, amt='60', opened=True)
            ok(tag + ' 금액 넣으면 판정 완료', card(p) is None and (judge(p) or '').startswith('적용'), judge(p))
            ok(tag + ' 검색 조건 연동(금액)', p.evaluate("()=>document.getElementById('amt').value") == '60')
        ok(tag + ' 스크립트 오류 없음(2)', not errs, errs); b.close()
        # 3. 조문 화면(산안법 제17조)도 같게
        b, p, errs = start(pw, w, big, '안전관리자', '[data-art="OSH:제17조"]')
        fill_apply(p, n='500')
        t = card(p)
        ok(tag + ' 조문 제17조: 인원만 → 업종 입력 버튼', t is not None and '업종 선택 필요' in t and '업종 입력' in t, judge(p))
        ok(tag + ' 조문 제17조: 적용기준 상세 링크 유지', t is not None and '적용기준 상세' in t, t)
        if t is not None:
            fill_apply(p, ind='mfgHeavy')
            ok(tag + ' 조문 제17조: 업종 넣으면 판정 완료', card(p) is None, card(p))
        ok(tag + ' 스크립트 오류 없음(3)', not errs, errs); b.close()
        # 4. 입력으로 풀 수 없는 '추가 확인'(도급 상황)은 입력 버튼 없음
        b, p, errs = start(pw, w, big, '도급인의 안전조치', '[data-item="o_63"]')
        t = judge(p)
        ok(tag + ' 도급 상황 조건은 입력 버튼 없음', t is not None and '업종 입력' not in t and '공사금액 입력' not in t, t)
        ok(tag + ' 스크립트 오류 없음(4)', not errs, errs); b.close()
os.makedirs(SHOT, exist_ok=True) if SHOT else None
for w, big in [(390, False), (320, True), (430, False)]:
    run(w, big, ('%d%s' % (w, 'b' if big else '')) if SHOT and w == 390 else None)
print('실패 %d건' % len(fails) if fails else '전체 통과'); srv.shutdown(); sys.exit(1 if fails else 0)
