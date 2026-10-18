# 법ON 안전보건표지 별표 연결·그림 별표 원문 안내(2026-10-18) 화면 검사
# 사용: python3 claude_sign_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8777)
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8777), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8777/' + FILE
SUB = 'main>section.sub:not([hidden])'
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def shot(p, n):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'))
def heads(p): return p.evaluate("[...document.querySelectorAll('%s .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())" % SUB)
def picline(p, w):
    return p.evaluate("""(w)=>{const b=document.querySelector('%s .dhead .bpic'); if(!b)return null; const a=b.querySelector('a'), r=a.getBoundingClientRect();
      return {t:b.querySelector('span').textContent, href:a.href, right:Math.round(r.right), h:Math.round(r.height), w:w};}""" % SUB, w)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(390, False, False, '390'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, service_workers='block')
        p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        p.click('.pick[data-field="osh"]'); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200)
        # 1. 법 제37조 → 별표 6·7·8·9
        p.fill('#q', '안전보건표지'); p.wait_for_timeout(600)
        p.click('#results [data-art="OSH:제37조"]'); p.wait_for_timeout(400)
        bts = p.evaluate("[...document.querySelectorAll('%s [data-bt]')].map(b=>b.dataset.bt).filter(x=>/^S[6-9]$/.test(x))" % SUB)
        ok(tag + ' 법 제37조 별표 6·7·8·9 순서', bts == ['S6', 'S7', 'S8', 'S9'], bts)
        # 2. 별표 6 머리 안내 줄
        p.click('%s [data-bt="S6"]' % SUB); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_1_별표6')
        L = picline(p, w)
        ok(tag + ' 별표6 머리 안내 문구·원문 링크', L and L['t'] == '표지 그림은 원문에서 확인' and '%EB%B3%84%ED%91%9C6' in L['href'], L)
        ok(tag + ' 별표6 원문 보기 링크가 화면 안·누르기 높이 44px 이상', L and L['right'] <= w - 8 and L['h'] >= 44, L)
        ok(tag + ' 별표6 하단 비고(KS 대체)는 그대로', p.evaluate("!!document.querySelector('%s .bnote')" % SUB))
        # 3. 표지 502 화면: 머리 안내 + 부착 의무 조문
        p.locator(SUB + ' [data-br="S6.42"]').first.click(); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_2_표지502')
        L = picline(p, w); ok(tag + ' 표지 줄 화면에도 머리 안내', L and L['t'] == '표지 그림은 원문에서 확인', L)
        H = heads(p); ok(tag + " 표지 502: '부착 의무 조문 2' 구획이 '근거 조문'보다 앞", '부착 의무 조문 2' in H and H.index('부착 의무 조문 2') < H.index('근거 조문'), H)
        rows = p.evaluate("""(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.textContent.trim().startsWith('부착 의무 조문')); return [...g.nextElementSibling.querySelectorAll('[data-art]')].map(b=>[b.dataset.art,(b.querySelector('.r2')||{}).textContent]);})()""" % SUB)
        ok(tag + ' 표지 502: 규칙 제457·490조, 줄 아래 안전보건규칙 표시', [r[0] for r in rows] == ['RULE:제457조', 'RULE:제490조'] and all(r[1].startswith('안전보건규칙 · ') for r in rows), rows)
        # 4. 부착 의무 조문 → 규칙 제490조 → 별표 줄 502
        p.locator(SUB + ' [data-art="RULE:제490조"]').first.click(); p.wait_for_timeout(400)
        brs = p.evaluate("[...document.querySelectorAll('%s [data-br]')].map(b=>b.dataset.br)" % SUB)
        ok(tag + ' 규칙 제490조 별표 → 표지 502 줄', 'S6.42' in brs, brs)
        # 5. 별표 9: 원문 참조 칸 6, 하단 중복 안내 없음
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200); p.fill('#q', '안전보건표지'); p.wait_for_timeout(600)
        p.click('#results [data-art="OSH:제37조"]'); p.wait_for_timeout(400)
        p.click('%s [data-bt="S9"]' % SUB); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_3_별표9')
        ok(tag + ' 별표9 원문 참조 칸 6곳·하단 안내 없음', p.evaluate("document.querySelectorAll('%s .tpic').length" % SUB) == 6 and not p.evaluate("!!document.querySelector('%s .bnote')" % SUB))
        L = picline(p, w); ok(tag + ' 별표9 머리 안내', L and L['t'] == '기본모형 그림은 원문에서 확인', L)
        # 6. 작업별 기준 석면 → 출입구 표지 묶음
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200); p.fill('#q', '석면'); p.wait_for_timeout(600)
        p.locator('#results [data-wk]').first.click(); p.wait_for_timeout(500)
        H = heads(p); ix = lambda t: next((i for i, x in enumerate(H) if x.startswith(t)), -1)
        ok(tag + " 석면 작업 기준 '출입구 표지' 묶음(석면 조치기준 다음)", ix('출입구 표지') > 0 and ix('출입구 표지') == ix('석면 조치기준') + 1, H)
        ok(tag + ' 석면 출입구 표지 묶음에 표지 502 줄', p.evaluate("(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.textContent.trim().startsWith('출입구 표지')); return !!g.nextElementSibling.querySelector('[data-br=\"S6.42\"]');})()" % SUB))
        # 7. 허가대상 유해물질 → 출입금지·표지 묶음
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200); p.fill('#q', '허가대상'); p.wait_for_timeout(600)
        p.locator('#results [data-wk]').first.click(); p.wait_for_timeout(500)
        got = p.evaluate("(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.textContent.trim().startsWith('출입금지·표지')); return g?[...g.nextElementSibling.querySelectorAll('[data-br]')].map(b=>b.dataset.br):null;})()" % SUB)
        ok(tag + ' 허가대상 출입금지·표지 묶음에 표지 501·502', got == ['S6.41', 'S6.42'], got)
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
print('실패 %d건' % len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
