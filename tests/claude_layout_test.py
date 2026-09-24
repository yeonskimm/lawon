# 법ON 화면 구성(2026-09-25) 검사 — 사용: python3 claude_layout_test.py <파일명.html> [스크린샷 폴더]
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8766), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8766/' + FILE
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def shot(p, n):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'))

HEADS = "[...document.querySelectorAll('#results .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())"
FOLDS = "Object.fromEntries([...document.querySelectorAll('#results [data-fold]')].map(b=>[b.dataset.fold,[b.getAttribute('aria-expanded'),b.nextElementSibling.hidden]]))"

def search(p, field, q):
    p.click('.pick[data-field="%s"]' % field); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200)
    p.fill('#q', q); p.wait_for_timeout(500)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    def ctx(dark=False):
        c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, service_workers='block', color_scheme='dark' if dark else 'light')
        p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])'); return c, p, errs

    # 1. 산업안전에서 '교육'
    c, p, errs = ctx(); search(p, 'osh', '교육')
    h = p.evaluate(HEADS); f = p.evaluate(FOLDS)
    print('   구획:', h); print('   접기:', f)
    io = [i for i, x in enumerate(h) if x.startswith('산업안전 분야 조문')]
    ix = [i for i, x in enumerate(h) if x.startswith('근로기준 분야')]
    ok('산안: 자기 분야 조문 구획 있음·펼침', io and f.get('oa') == ['true', False], f)
    ok('산안: 근로기준 분야는 맨 아래 한 구획·접힘', ix and ix[0] > io[0] and f.get('ox') == ['false', True], (h, f))
    ok('산안: 근로기준 구획 제목에 주요 의무·조문 수', ix and '주요 의무' in h[ix[0]], h)
    shot(p, '1_osh_교육_top')
    p.click('#results [data-fold="ox"]'); p.wait_for_timeout(200)
    ok('근로기준 구획 펼치기', p.evaluate(FOLDS).get('ox') == ['true', False])
    p.evaluate("document.querySelector('#results [data-fold=\"ox\"]').scrollIntoView()"); p.wait_for_timeout(200); shot(p, '2_osh_교육_ox_open')
    # 칩 줄 고정
    p.evaluate("window.scrollTo(0,2500)"); p.wait_for_timeout(200)
    r = p.evaluate("(()=>{const f=document.querySelector('#results .fl').getBoundingClientRect(), s=document.querySelector('#vFind .sbar').getBoundingClientRect(); return [Math.round(f.top),Math.round(s.bottom)];})()")
    ok('스크롤해도 법령 칩 줄이 검색창 바로 아래 고정', abs(r[0] - r[1]) <= 2, r); shot(p, '3_osh_교육_scrolled')
    # 접으면 제목이 화면에 남음
    p.evaluate("window.scrollTo(0,1800)"); p.wait_for_timeout(150)
    p.evaluate("document.querySelector('#results [data-fold=\"oa\"]').click()"); p.wait_for_timeout(200)
    t = p.evaluate("(()=>{const b=document.querySelector('#results [data-fold=\"oa\"]').getBoundingClientRect(); return [Math.round(b.top), innerHeight];})()")
    ok('조문 구획을 접으면 제목이 화면 안에 보임', 0 < t[0] < t[1], t); shot(p, '4_osh_교육_oa_closed')
    # 같은 검색어에서 칩 전환 후 전체로 돌아오면 접힘 기본값, 새 검색어면 초기화
    p.fill('#q', '추락'); p.wait_for_timeout(500)
    ok('검색어가 바뀌면 접기 상태 초기화', p.evaluate(FOLDS).get('oa') == ['true', False], p.evaluate(FOLDS))
    # 법령 칩: 접기 없이 그 법령만
    p.click('#results .fl [data-law="SR"]'); p.wait_for_timeout(300)
    ok('법령 칩 선택 시 접는 구획 없음', p.evaluate(FOLDS) == {}, p.evaluate(FOLDS))
    ok('오류 없음(검색)', not errs, errs); c.close()

    # 2. 근로기준에서 '교육'
    c, p, errs = ctx(); search(p, 'labor', '교육')
    h = p.evaluate(HEADS); f = p.evaluate(FOLDS); print('   구획:', h)
    ok('근로: 근로기준 분야 주요 의무가 맨 앞', h and h[0].startswith('근로기준 분야 주요 의무'), h)
    ok('근로: 산업안전 분야 접힘', f.get('ox') == ['false', True], f)
    shot(p, '5_labor_교육'); ok('오류 없음(근로)', not errs, errs); c.close()

    # 3. 법령집
    c, p, errs = ctx(); p.click('.pick[data-field="osh"]'); p.click('#tabbar [data-nav="book"]'); p.wait_for_timeout(300)
    rows = p.evaluate("[...document.querySelectorAll('#book .brow')].map(b=>[b.dataset.bk||('btl:'+b.dataset.btl), b.classList.contains('sub'), b.querySelector('.bm').textContent])")
    print('   법령집:', rows)
    d = {r[0]: r for r in rows}
    ok('별표 구획 없음', not any('별표' == x for x in p.evaluate("[...document.querySelectorAll('#book .gl')].map(x=>x.firstChild.textContent.trim())")))
    ok('안전보건규칙 줄: 조문 672 · 별표 18', '조문 672' in d['RULE'][2] and '별표 18' in d['RULE'][2], d.get('RULE'))
    ok('산안법 시행령 줄: 별표 12', '별표 12' in d['SD'][2], d.get('SD'))
    ok('그 밖의 법령 접힘', p.evaluate("(()=>{const b=document.querySelector('#book [data-fold=\"b:oth\"]');return b&&b.getAttribute('aria-expanded')==='false'&&b.nextElementSibling.hidden;})()"))
    keys = [r[0] for r in rows]
    ok('기간제법 시행령(2026-09-24 조문 수록)이 기간제법 바로 아래 하위 줄', 'FTD' in keys and keys[keys.index('FTD') - 1] == 'FT' and d['FTD'][1], keys)
    shot(p, '6_book_osh')
    p.click('#book [data-fold="b:oth"]'); p.wait_for_timeout(200); shot(p, '7_book_oth_open')
    p.click('#tabbar [data-nav="find"]'); p.click('#tabbar [data-nav="book"]'); p.wait_for_timeout(200)
    ok('그 밖의 법령 펼침 상태 유지(탭 이동 후)', p.evaluate("document.querySelector('#book [data-fold=\"b:oth\"]').getAttribute('aria-expanded')") == 'true')
    p.click('#book [data-bk="RULE"]'); p.wait_for_timeout(300)
    ok('안전보건규칙: [조문|별표] 탭', p.evaluate("document.querySelectorAll('main>section.sub:not([hidden]) [data-bktab]').length") == 2)
    shot(p, '8_rule_tab_art')
    p.click('main>section.sub:not([hidden]) [data-bktab="bt"]'); p.wait_for_timeout(300)
    n = p.evaluate("document.querySelectorAll('main>section.sub:not([hidden]) [data-bt]').length")
    ok('안전보건규칙 별표 탭 18줄', n == 18, n); shot(p, '9_rule_tab_bt')
    p.click('main>section.sub:not([hidden]) [data-bt]'); p.wait_for_timeout(300)
    p.click('#hback'); p.wait_for_timeout(600)
    ok('별표 연 뒤 뒤로 오면 별표 탭 그대로', p.evaluate("(document.querySelector('main>section.sub:not([hidden]) [data-bktab=\"bt\"]')||{}).getAttribute?.('aria-selected')") == 'true')
    p.click('#hback'); p.wait_for_timeout(600)
    p.click('#book [data-bk="OSH"]'); p.wait_for_timeout(300)
    ok('산안법(별표 없음): 탭 없음·아래 별표 줄 없음', p.evaluate("document.querySelectorAll('main>section.sub:not([hidden]) [data-bktab],main>section.sub:not([hidden]) [data-btl]').length") == 0)
    ok('오류 없음(법령집)', not errs, errs); c.close()

    # 4. 어두운 화면
    c, p, errs = ctx(dark=True); p.click('#gear'); p.click('[data-theme-set="auto"]'); p.click('#sheet [data-close]:not(.shbg)')
    search(p, 'osh', '교육'); shot(p, '10_dark_osh_교육'); ok('오류 없음(어두운 화면)', not errs, errs); c.close()
    br.close()
print('실패 %d건' % len(fails) if fails else '전체 통과')
sys.exit(1 if fails else 0)
