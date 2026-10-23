# 법ON 안전보건규칙 조문 화면 '만화로 보기' 줄(2026-10-23, 5-67) 화면 검사
# 사용: python3 claude_comic_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8781)
import sys, os, threading, functools, http.server, socketserver, urllib.parse
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8781), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8781/' + FILE
SUB = 'main>section.sub:not([hidden])'
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def shot(p, n):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'), full_page=True)
def dec(u): return urllib.parse.unquote(u or '')
def art(p, q, key):
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', q); p.wait_for_timeout(600)
    p.locator('#results [data-art="%s"]' % key).first.click(); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)')
def cmk(p):
    return p.evaluate("""(()=>{const a=document.querySelector('%s .cmk'); if(!a)return null; const r=a.getBoundingClientRect(), c=a.closest('.card').getBoundingClientRect();
      const g=a.closest('.card').previousElementSibling;
      return {t:a.textContent.replace(/\\s+/g,' ').trim(), href:a.getAttribute('href'), tgt:a.target, h:Math.round(r.height), inCard:r.left>=c.left-1&&r.right<=c.right+1,
        gl:g?g.textContent.trim().slice(0,2):'', over:document.scrollingElement.scrollWidth>innerWidth, ext:!!a.querySelector('svg.xlk'), n:document.querySelectorAll('%s .cmk').length};})()""" % (SUB, SUB))

CASES = [('원동기 회전축', 'RULE:제87조', 61), ('추락의 방지', 'RULE:제42조', 32), ('충전부 접근 한계거리', 'RULE:제321조', None), ('밀폐공간 작업 프로그램', 'RULE:제619조', None)]
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(390, False, False, '390'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, service_workers='block')
        errs = []
        p = c.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(200)
        D = p.evaluate("(()=>{const d=JSON.parse(document.getElementById('data').textContent); return d.comic.map;})()")
        for q, key, pg in CASES:
            art(p, q, key); no = key.split(':')[1]; pg = pg or D[no]; m = cmk(p)
            ok(tag + ' ' + key + " 조문 카드 안 '만화로 보기 안전보건공단 2026년판 %d쪽'" % pg, m and m['t'] == '만화로 보기 안전보건공단 2026년판 %d쪽' % pg and m['inCard'] and m['gl'] == '조문' and m['n'] == 1, m)
            ok(tag + ' ' + key + ' 링크 주소·새 창·바깥 표시', m and dec(m['href']) == 'https://www.kosha.or.kr/ebook/fcatalog/ecatalog5.jsp?Dir=647&catimage=&start=%d' % pg and m['tgt'] == '_blank' and m['ext'], m)
            ok(tag + ' ' + key + ' 높이 44 이상·넘침 없음', m and m['h'] >= 44 and not m['over'], m)
            shot(p, tag + '_' + no)
        # 긴 조문: 전문 보기 버튼 아래에 줄
        art(p, '밀폐공간 작업 프로그램', 'RULE:제619조')
        order = p.evaluate("(()=>{const a=document.querySelector('%s .cmk'), b=document.querySelector('%s .fullbtn'); return !b||(b.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)>0;})()" % (SUB, SUB))
        ok(tag + ' 긴 조문은 전문 보기 버튼 아래', order)
        p.click('%s .fullbtn' % SUB); p.wait_for_timeout(200)
        ok(tag + ' 전문 펼친 뒤에도 줄 1개', p.evaluate("document.querySelectorAll('%s .cmk').length" % SUB) == 1)
        # 안전보건규칙이 아닌 조문·삭제 조문에는 없음
        for q, key in [('법 제38조', 'OSH:제38조'), ('시행규칙 제26조', 'SR:제26조')]:
            art(p, q, key); ok(tag + ' ' + key + ' 만화 줄 없음', cmk(p) is None)
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
    br.close()
print('실패 %d건' % len(fails) if fails else '전체 통과'); srv.shutdown(); sys.exit(1 if fails else 0)
