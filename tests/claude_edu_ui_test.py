# 법ON 조문 화면 교육시간 카드(2026-10-19, 5-44) 화면 검사
# 사용: python3 claude_edu_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8781)
import sys, os, threading, functools, http.server, socketserver
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
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'))
def heads(p): return p.evaluate("[...document.querySelectorAll('%s .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())" % SUB)
def art(p, q, key):
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', q); p.wait_for_timeout(650)
    p.locator('#results [data-art="%s"]' % key).first.click(); p.wait_for_timeout(450); p.evaluate('scrollTo(0,0)')
def card(p):   # 교육시간 카드 내용
    return p.evaluate("""(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.textContent.startsWith('교육시간')); if(!g)return null; const c=g.nextElementSibling;
      return {h:g.textContent.replace(/\\s+/g,' ').trim(), t:c.textContent, secs:[...c.querySelectorAll('.edh')].map(x=>x.textContent), li:c.querySelectorAll('.edu li').length,
        clip:!!c.querySelector('.bwrap.clip'), full:!!c.querySelector('[data-efull]'), bt:!!c.querySelector('[data-bt="S4"]'),
        over:[...c.querySelectorAll('*')].some(x=>x.getBoundingClientRect().right>innerWidth+0.5)};})()""" % SUB)

CASES = [  # 검색어, 조문, 기대 구획, 기대 문구, 접힘
    ('법 제29조', 'OSH:제29조', ['근로자 안전보건교육', '관리감독자 안전보건교육'], ['매반기 12시간 이상', '연간 16시간 이상'], True),
    ('법 제31조', 'OSH:제31조', [], ['건설 일용근로자', '4시간 이상'], False),
    ('법 제32조', 'OSH:제32조', [], ['안전보건관리책임자', '신규교육 34시간 이상 · 보수교육 24시간 이상', '보수교육 8시간 이상 (신규교육 없음)'], False),
    ('법 제77조', 'OSH:제77조', [], ['최초 노무제공 시 교육', '2시간 이상'], False),
    ('법 제16조', 'OSH:제16조', ['관리감독자 안전보건교육'], ['연간 16시간 이상', '2분의 1'], False),
    ('시행규칙 제26조', 'SR:제26조', ['근로자 안전보건교육', '관리감독자 안전보건교육'], ['매반기 6시간 이상'], True),
    ('시행규칙 제29조', 'SR:제29조', [], ['안전보건관리책임자'], False),
]
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(390, False, False, '390'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, service_workers='block')
        errs = []
        p = c.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(200)
        for q, key, secs, txt, clip in CASES:
            art(p, q, key); H = heads(p); C = card(p)
            ok(tag + ' ' + key + ' 교육시간 카드가 조문 바로 다음', len(H) > 1 and H[0].startswith('조문') and H[1].startswith('교육시간'), H)
            if not C: continue
            ok(tag + ' ' + key + ' 구획 이름', C['secs'] == secs, C['secs'])
            if clip:
                ok(tag + ' ' + key + ' 길면 접힘·전체 보기', C['clip'] and C['full'])
                p.locator(SUB + ' [data-efull]').click(); p.wait_for_timeout(250); C = card(p)
                ok(tag + ' ' + key + ' 펼치면 접힘 풀림', not C['clip'])
            else:
                ok(tag + ' ' + key + ' 짧으면 접지 않음', not C['clip'] and not C['full'])
            ok(tag + ' ' + key + ' 문구 ' + '/'.join(txt), all(t in C['t'].replace('\n', ' ') for t in txt), C['t'][:200])
            ok(tag + ' ' + key + ' 별표 4 전체 보기·넘침 없음', C['bt'] and not C['over'] and not p.evaluate('document.scrollingElement.scrollWidth>innerWidth'))
            if key == 'OSH:제16조': ok(tag + ' 제16조 머리에 근거 산안법 제29조', '근거 산안법 제29조' in C['h'], C['h'])
            if key == 'OSH:제32조': ok(tag + ' 제32조에 관리감독자 없음', '관리감독자' not in C['t'])
            p.evaluate("(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.textContent.startsWith('교육시간'));scrollTo(0,g.getBoundingClientRect().top+scrollY-70)})()" % SUB)
            shot(p, tag + '_' + key.replace(':', '_'))
        # 별표 4 전체 보기 → 별표 화면
        art(p, '법 제32조', 'OSH:제32조'); p.locator(SUB + ' .card [data-bt="S4"]').first.click(); p.wait_for_timeout(400)
        ok(tag + ' 별표 4 전체 보기 → 별표 화면', '교육과정별 교육시간' in p.evaluate("document.querySelector('%s').innerText" % SUB)[:300])
        # 카드 없는 조문
        for q, key in [('법 제30조', 'OSH:제30조'), ('법 제17조', 'OSH:제17조')]:
            art(p, q, key); ok(tag + ' ' + key + ' 교육시간 카드 없음', card(p) is None, heads(p))
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
    br.close()
srv.shutdown()
print('전체 통과' if not fails else '실패 %d건' % len(fails))
sys.exit(1 if fails else 0)
