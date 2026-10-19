# 법ON 조문 화면 계산 도구 링크(2026-10-19, 5-42) 화면 검사
# 사용: python3 claude_gosi2_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8779)
import sys, os, re, threading, functools, http.server, socketserver, urllib.parse
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8779), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8779/' + FILE
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

# 조문 → [링크 이름, 열리는 아래 창 id]
CASES = [('법 제11조', 'GK:제11조', '상시근로자 계산', 'csheet'), ('영 제7조의2', 'GKD:제7조의2', '상시근로자 계산', 'csheet'),
         ('최저임금법 제6조', 'MW:제6조', '임금·주휴 계산', 'wsheet'), ('법 제55조', 'GK:제55조', '임금·주휴 계산', 'wsheet'),
         ('법 제56조', 'GK:제56조', '임금·주휴 계산', 'wsheet'), ('법 제60조', 'GK:제60조', '연차 계산', 'asheet'),
         ('퇴직급여법 제8조', 'RET:제8조', '퇴직금 계산', 'rsheet')]
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(390, False, False, '390'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, service_workers='block')
        errs = []
        q = c.new_page(); q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(URL); q.wait_for_selector('#vStart:not([hidden])')
        if big: q.evaluate("document.documentElement.dataset.fs='l'")
        if dark: q.evaluate("document.documentElement.dataset.theme='dark'")
        q.click('.pick[data-field="labor"]'); q.wait_for_timeout(200); p = q
        for qq, key, name, sh in CASES:
            art(p, qq, key); T = title_links(p)
            names = [x['t'] for x in T['links']] if T else None
            exp = '계산' if names and len(names) >= 3 else name   # 링크가 셋이면 '계산'만
            ok(tag + ' ' + key + " 제목 줄 마지막 '" + exp + "' 링크, 넘침 없음, 높이 44", T and names and names[-1] == exp and not T['over'] and all(x['h'] >= 44 for x in T['links']), T)
            ok(tag + ' ' + key + ' 링크 읽기 이름에 ' + name, p.evaluate("(document.querySelector('%s .gl .xcl')||{getAttribute:()=>''}).getAttribute('aria-label')" % SUB) == name + ' 열기')
            if not p.evaluate("!!document.querySelector('%s .gl .xcl')" % SUB): continue
            shot(p, tag + '_' + key.replace(':', '_'))
            p.locator('%s .gl .xcl' % SUB).first.click(); p.wait_for_timeout(350)
            ok(tag + ' ' + key + ' 누르면 ' + sh + ' 열림', p.evaluate("!document.getElementById('%s').hidden" % sh))
            shot(p, tag + '_' + key.replace(':', '_') + '_창')
            p.keyboard.press('Escape'); p.wait_for_timeout(150)
            p.evaluate("[...document.querySelectorAll('.sheet,[id$=sheet]')].forEach(x=>{const b=x.querySelector('[data-cclose],[data-wclose],[data-aclose],[data-rclose]'); if(!x.hidden&&b)b.click();})"); p.wait_for_timeout(200)
            ok(tag + ' ' + key + ' 창 닫힘', p.evaluate("document.getElementById('%s').hidden" % sh))
        # 계산 링크 없는 조문(제54조 휴게)
        art(p, '법 제54조', 'GK:제54조'); T = title_links(p)
        ok(tag + ' 제54조에는 계산 링크 없음', not p.evaluate("!!document.querySelector('%s .gl .xcl')" % SUB), T)
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
    br.close()
srv.shutdown()
print('전체 통과' if not fails else '실패 %d건' % len(fails))
sys.exit(1 if fails else 0)
