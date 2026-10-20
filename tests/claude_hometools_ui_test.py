# 법ON 홈 계산 도구 3줄·과태료(산업안전) 직접 입력 창·첫 화면 한 화면 맞춤(2026-10-19, 5-43) 화면 검사
# 사용: python3 claude_gosi2_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8780)
import sys, os, re, threading, functools, http.server, socketserver, urllib.parse
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8780), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8780/' + FILE
SUB = 'main>section.sub:not([hidden])'
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def shot(p, n):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'))
def heads(p, sel=SUB): return p.evaluate("[...document.querySelectorAll('%s .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())" % sel)
def dec(u): return urllib.parse.unquote(u or '')
def art(p, q, key):   # 검색 → 조문 화면
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', q); p.wait_for_timeout(600)
    p.locator('#results [data-art="%s"]' % key).first.click(); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)')
def title_links(p):   # '조문' 제목 줄 오른쪽 링크들
    return p.evaluate("""(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.firstChild&&x.firstChild.textContent.trim()==='조문'); if(!g)return null;
      return {links:[...g.querySelectorAll('.xrl')].map(a=>({t:a.textContent.trim(),tag:a.tagName,href:a.getAttribute('href')||'',ms:a.dataset.ms||'',r:Math.round(a.getBoundingClientRect().right),h:Math.round(a.getBoundingClientRect().height)})), over:document.scrollingElement.scrollWidth>innerWidth||[...g.querySelectorAll('.xrl')].some(a=>a.getBoundingClientRect().right>innerWidth), top:Math.round(g.getBoundingClientRect().top)};})()""" % SUB)

def page(br, w, h, big=False, dark=False):
    c = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, service_workers='block')
    p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    if big: p.add_init_script("try{localStorage.setItem('lawon.ui',JSON.stringify({theme:'auto',fs:'l'}))}catch(e){}")
    p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
    if big: p.evaluate("document.documentElement.dataset.fs='l'; dispatchEvent(new Event('resize'))")
    if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
    p.wait_for_timeout(250); return c, p, errs
OVER = "document.scrollingElement.scrollHeight-innerHeight"
with sync_playwright() as pw:
    br = pw.chromium.launch()
    # 1. 한 화면 맞춤(일반 글자: 아이폰 SE 375×667부터, 큰 글자: 360×740부터)
    for w, h, big in [(375, 667, False), (360, 740, False), (360, 780, False), (390, 844, False), (393, 852, False), (412, 915, False), (430, 932, False),
                      (360, 740, True), (390, 844, True), (430, 932, True)]:
        c, p, errs = page(br, w, h, big)
        o = p.evaluate(OVER); tag = '%dx%d%s' % (w, h, ' 크게' if big else '')
        ok(tag + ' 첫 화면 한 화면(넘침 ≤1px)', o <= 1, o)
        T = p.evaluate("[...document.querySelectorAll('#vStart .tile b')].map(b=>({t:b.textContent,cut:b.scrollWidth>b.clientWidth}))")
        ok(tag + ' 계산 도구 6칸·이름 안 잘림', [x['t'] for x in T] == ['상시근로자', '임금·주휴', '연차', '퇴직금', '과태료(산업안전)', '관리비 계상'] and not any(x['cut'] for x in T), T)
        PK = p.evaluate("[...document.querySelectorAll('#vStart .pick')].map(x=>[parseFloat(getComputedStyle(x).paddingTop),parseFloat(getComputedStyle(x).paddingBottom)])")
        ok(tag + ' 분야 선택 두 칸 여백 같음', PK[0] == PK[1], PK)
        ok(tag + ' 화면 오류 없음', not errs, errs)
        if SHOT: shot(p, 'home_' + tag.replace(' ', '_'))
        c.close()
    # 2. 맞춤 전후: 큰 화면은 줄이지 않음(인라인 여백 없음)
    c, p, errs = page(br, 430, 932)
    ok('430x932 여백 그대로(줄이지 않음)', p.evaluate("[...document.querySelectorAll('#vStart .pick,#vStart .hero')].every(x=>!x.style.paddingTop)"))
    c.close()
    # 3. 과태료 창
    for w, h, big, dark in [(390, 844, False, False), (320, 568, True, False), (430, 932, False, True)]:
        c, p, errs = page(br, w, h, big, dark); tag = '%dx%d' % (w, h) + (' 크게' if big else '') + (' 어둡게' if dark else '')
        p.click('#fineOpen'); p.wait_for_timeout(300)
        ok(tag + ' 과태료 칸 → 창 열림·제목', p.evaluate("!document.getElementById('hfsheet').hidden") and p.inner_text('#hfsheetT') == '과태료 금액 계산(산업안전)')
        ok(tag + ' 안내 사각형에 금액 계산 ›', '금액 계산 ›' in p.inner_text('#hfsheet .hfbox'))
        R = lambda: (p.inner_text('#hfo'), p.inner_text('#hfw'))
        ok(tag + ' 처음: 금액 넣으라는 안내', R()[1] == '금액을 넣으면 계산합니다', R())
        p.fill('#hfa', '50'); p.fill('#hfn', '5'); p.wait_for_timeout(100)
        ok(tag + ' 규모 고르기 전', R()[1] == '규모를 고르면 계산합니다', R())
        p.click('#hfs [data-hfs="0.8"]'); p.wait_for_timeout(100)
        ok(tag + ' 50만원 × 5, 10~49명 → 200만원', R() == ('200만원', '50만원 × 5 = 250만원 × 80%'), R())
        p.fill('#hfn', '1'); p.wait_for_timeout(100)
        ok(tag + ' 50만원 × 1 → 100만원 미만 감경 없음', R() == ('50만원', '50만원 · 100만원 미만이라 규모 감경 없음'), R())
        p.fill('#hfa', '60'); p.fill('#hfn', '2'); p.click('#hfs [data-hfs="0.7"]'); p.wait_for_timeout(100)
        ok(tag + ' 60만원 × 2 × 70% = 84 → 100만원', R() == ('100만원', '60만원 × 2 = 120만원 × 70% → 100만원 미만이라 100만원'), R())
        SPT = lambda: p.inner_text('#hfsp') if p.is_visible('#hfsp') else ''
        ok(tag + ' 자진납부 100만원 → 80만원(하한 다시 안 올림)', SPT().startswith('자진납부 시 80만원') and '의견 제출 기한 내 납부 시 20% 감경(질서위반행위규제법 제18조)' in SPT(), SPT())
        p.fill('#hfa', '1,000'); p.fill('#hfn', '1'); p.click('#hfs [data-hfs="1"]'); p.wait_for_timeout(100)
        ok(tag + ' 쉼표 1,000 → 1000(만원) 입력·100명 이상', R()[0] == '1,000만원' and p.input_value('#hfa') == '1000', [R(), p.input_value('#hfa')])
        p.fill('#hfn', '0'); p.wait_for_timeout(100)
        ok(tag + ' 수량 0 → 안내', R()[0] == '—' and '1 이상의 정수' in R()[1], R())
        ok(tag + ' 수량 0 → 자진납부 줄 숨김', not p.is_visible('#hfsp'))
        p.fill('#hfn', '3'); p.click('[data-hfb="amt"]'); p.wait_for_timeout(100)
        L = p.evaluate("[...document.querySelectorAll('#hfs button')].map(b=>b.textContent)")
        ok(tag + ' 건설공사 금액 기준: 규모 4칸·고른 규모 지움', L == ['40억원 이상', '10~40억원 90%', '3~10억원 80%', '3억원 미만 70%'] and R()[1] == '규모를 고르면 계산합니다', [L, R()])
        p.click('#hfs [data-hfs="0.9"]'); p.fill('#hfa', '100'); p.wait_for_timeout(100)
        ok(tag + ' 100만원 × 3 × 90% = 270만원', R()[0] == '270만원', R())
        ok(tag + ' 자진납부 270 → 216만원', p.inner_text('#hfsp').startswith('자진납부 시 216만원'), p.inner_text('#hfsp'))
        ok(tag + ' 합계 300만원은 상한 안내 없음', not p.is_visible('#hfx'))
        p.fill('#hfn', '4'); p.wait_for_timeout(100)
        ok(tag + ' 합계 400만원 → 상한 확인 안내', p.is_visible('#hfx') and p.inner_text('#hfx') == '해당 조항 상한(법 제175조 각 항) 확인', p.inner_text('#hfx'))
        p.fill('#hfn', '3'); p.wait_for_timeout(100)
        ok(tag + ' 창 가로 넘침 없음', p.evaluate("document.querySelector('#hfsheet .shcard').scrollWidth<=document.querySelector('#hfsheet .shcard').clientWidth"))
        if SHOT: p.evaluate("document.querySelector('#hfsheet .shcard').scrollTop=0"); shot(p, 'fine_' + tag.replace(' ', '_'))
        p.click('#hfsheet .shh [data-hfclose]'); p.wait_for_timeout(200)
        ok(tag + ' 닫기', p.evaluate("document.getElementById('hfsheet').hidden"))
        p.click('#scOpenH'); p.wait_for_timeout(300)
        ok(tag + ' 관리비 계상 칸 → 관리비 계상 창', p.evaluate("!document.getElementById('ssheet').hidden"))
        p.click('#ssheet .shh [data-sclose]'); p.wait_for_timeout(200)
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300)
        ok(tag + ' 분야 선택 정상', p.evaluate("!document.getElementById('vFind').hidden||!document.getElementById('vSite').hidden"))
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
    br.close()
srv.shutdown()
print('전체 통과' if not fails else '실패 %d건' % len(fails))
sys.exit(1 if fails else 0)
