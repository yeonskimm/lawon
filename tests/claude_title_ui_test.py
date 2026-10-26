# 법ON 조문 카드 제목 줄(조문 + 인용 조문·원문·기준·계산 링크) 꺾임·넘침 화면 검사(2026-10-26, 5-86)
# 사용: python3 claude_title_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8786)
import sys, os, re, json, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
HERE = os.path.dirname(os.path.abspath(__file__))
srv = socketserver.TCPServer(('127.0.0.1', 8786), functools.partial(Q, directory=HERE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8786/' + FILE
SUB = 'main>section.sub:not([hidden])'
h = open(os.path.join(HERE, FILE), encoding='utf8').read()
D = json.loads(re.search(r'<script id="data" type="application/json">([\s\S]*?)</script>', h).group(1).replace('<\\/', '</'))
ALL = [a['l'] + ':' + a['no'] for a in D['arts']]
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def inject(p, a, v):
    p.evaluate("""([a,v])=>{ const b=document.createElement('button'); b.setAttribute(a,v); b.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;opacity:0'; document.body.appendChild(b); b.click(); b.remove(); }""", [a, v])
# 조문 제목 줄: '조문'이 한 줄인지, 링크가 같은 줄인지, 화면 밖으로 나가는지
TL = """(()=>{const g=[...document.querySelectorAll('%s h3.gl')].find(x=>x.textContent.trim().startsWith('조문')); if(!g)return null;
  const t=g.querySelector('.gh')||[...g.childNodes].find(x=>x.nodeType===3&&x.textContent.trim()); const r=document.createRange(); r.selectNodeContents(t);
  const one=new Set([...r.getClientRects()].filter(q=>q.width>0).map(q=>Math.round(q.top))).size===1, gt=r.getBoundingClientRect();
  const L=[...g.querySelectorAll('.xrl')].map(a=>{const b=a.getBoundingClientRect(); return {t:a.innerText.trim(), same:Math.abs((b.top+b.bottom)/2-(gt.top+gt.bottom)/2)<=10, out:b.right>innerWidth+0.5};});
  return {one:one, links:L.map(x=>x.t), same:L.every(x=>x.same), out:L.some(x=>x.out)};})()""" % SUB
# 인용 조문 링크와 기준 링크가 같이 있는 조문(5-86 전 '조/문' 꺾임) → 기준 링크는 짧게
CASES = [('GK:제59조', '인용 조문 2', '항목 기준 1', '근로시간·가산수당'), ('GKR:제9조', '인용 조문 1', '항목 기준 1', '근로시간·가산수당'),
         ('EQ:제22조의2', '인용 조문 12', '항목 기준 1', '모성·육아'), ('EQD:제3조', '인용 조문 1', '항목 기준 1', '괴롭힘·성희롱'),
         ('FT:제4조', '인용 조문 1', '항목 기준 1', '기간제·단시간'), ('FT:제6조', '인용 조문 1', '항목 기준 1', '기간제·단시간'),
         ('RULE:제116조', '인용 조문 1', '작업 기준 1', '보일러·압력용기'), ('MSD:제2조', '인용 조문 1', '작업 기준 1', '근골격계부담작업')]
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(393, True, False, '393크게'), (320, True, False, '320크게'), (390, False, False, '390'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, service_workers='block')
        errs = []
        p = c.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        p.click('.pick[data-field="labor"]'); p.wait_for_timeout(200)
        for key, xr, wk, name in CASES:
            p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(100); inject(p, 'data-art', key); p.wait_for_timeout(300)
            T = p.evaluate(TL)
            ok(tag + ' ' + key + ' 제목 줄 링크', T and T['links'] == [xr, wk], T and T['links'])
            ok(tag + ' ' + key + " '조문' 한 줄·링크 같은 줄·화면 안", T and T['one'] and T['same'] and not T['out'], T)
            if SHOT and key in ('GK:제59조', 'MSD:제2조') and tag in ('393크게', '320크게'): os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, 'title_' + key.replace(':', '_') + '_' + tag + '.png'))
            if key == 'GK:제59조':   # 짧게 바꾸지 않는 조문(21자 미만)은 전처럼 '항목 기준 · 이름'·바로 이동, 링크 색 그대로
                p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(100); inject(p, 'data-art', 'GK:제93조'); p.wait_for_timeout(300); T = p.evaluate(TL)
                ok(tag + ' GK:제93조 기준 링크는 그대로 길게', T and T['links'] == ['인용 조문 1', '항목 기준 · 취업규칙'] and T['one'] and T['same'] and not T['out'], T)
                cc = p.evaluate("(()=>{const a=document.querySelector('%s h3.gl .xrl.xwk'), n=a&&a.querySelector('.xrn'); return a&&n?[getComputedStyle(a).color,getComputedStyle(n).color,n.scrollWidth<=n.clientWidth+1]:null;})()" % SUB)
                ok(tag + ' 긴 기준 링크 글자색 = 링크색·말줄임 없음', cc and cc[0] == cc[1] and cc[2], cc)
                p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(100); inject(p, 'data-art', key); p.wait_for_timeout(300)
            if key in ('GK:제59조', 'RULE:제116조'):   # 짧은 기준 링크 → 아래 창에 그 기준
                p.locator(SUB + ' h3.gl .xrl[data-wks]').first.click(); p.wait_for_timeout(300)
                st = p.evaluate("(()=>{const s=document.getElementById('xsheet'); return s&&!s.hidden?document.getElementById('xsheetT').textContent+' | '+document.getElementById('xlist').innerText.replace(/\\s+/g,' '):'';})()")
                ok(tag + ' ' + key + ' 기준 링크 → 아래 창에 ' + name, wk + '건' in st and name in st, st)
                p.locator('#xsheet .shh [data-xclose]').click(); p.wait_for_timeout(300)
        # 링크 2개 이상인 조문 전부: '조문' 꺾임·링크 두 줄·화면 밖 없음
        if tag in ('393크게', '320크게'):
            p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(100); inject(p, 'data-art', ALL[0]); p.wait_for_timeout(250)
            n, bad = 0, []
            for k in ALL:
                p.evaluate("""(k)=>{ const b=document.createElement('button'); b.setAttribute('data-swap',k); b.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;opacity:0'; document.body.appendChild(b); b.click(); b.remove(); }""", k)
                T = p.evaluate(TL)
                if T and len(T['links']) >= 2:
                    n += 1
                    if not (T['one'] and T['same'] and not T['out']): bad.append(k)
            ok(tag + ' 링크 2개 이상 조문 %d개 제목 줄 이상 없음' % n, n >= 100 and not bad, bad[:10])
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
    br.close()
srv.shutdown()
print('전체 통과' if not fails else '실패 %d건' % len(fails))
sys.exit(1 if fails else 0)
