# 법ON 안전보건규칙 '만화로 보기'(5-67) + 우리 사이트 쪽 보기 comic/(5-68) 화면 검사
# 사용: python3 tests/claude_comic_ui_test.py <저장소 폴더> [캡처 폴더]   (포트 8781·8782)
# ① 조문 화면 줄(390·320 크게·430 어둡게) ② 보기 화면: 제목·그림·이전/다음·쪽 넘겨도 방문 기록 1개(안드로이드 뒤로 한 번에 닫힘)·닫기
# ③ 서비스워커 v9: 만화 보기 연결, comic/를 열어도 앱 저장본이 그대로 ④ v8(옛 판)이 깔린 기기: 공단 전자책으로 연결, v8에서 덮어써진 저장본을 v9가 바로잡음
import sys, os, shutil, tempfile, threading, functools, http.server, socketserver, urllib.parse, subprocess
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
TMP = tempfile.mkdtemp(prefix='comic_ui_')
SITE = os.path.join(TMP, 'lawon')
os.makedirs(SITE)
for f in ['index.html', 'service-worker.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']:
    shutil.copy(os.path.join(REPO, f), SITE)
os.symlink(os.path.join(REPO, 'comic'), os.path.join(SITE, 'comic'))
NEW_SW = open(os.path.join(REPO, 'service-worker.js'), encoding='utf-8').read()
OLD_SW = subprocess.run(['git', '-C', REPO, 'show', 'f15b8d1:service-worker.js'], capture_output=True, text=True).stdout   # v8(5-66)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
class TS(socketserver.ThreadingMixIn, socketserver.TCPServer): daemon_threads = True
srv = TS(('127.0.0.1', 8781), functools.partial(Q, directory=TMP))
threading.Thread(target=srv.serve_forever, daemon=True).start()
APP = 'http://127.0.0.1:8781/lawon/'
SUB = 'main>section.sub:not([hidden])'
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def shot(p, n):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'))
def dec(u): return urllib.parse.unquote(u or '')
def start(p):
    p.goto(APP); p.wait_for_selector('#vStart:not([hidden])'); p.click('.pick[data-field="osh"]'); p.wait_for_timeout(200)
def art(p, q, key):
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', q); p.wait_for_timeout(600)
    p.locator('#results [data-art="%s"]' % key).first.click(); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)')
def cmk(p):
    return p.evaluate("""(()=>{const a=document.querySelector('%s .cmk'); if(!a)return null; const r=a.getBoundingClientRect(), c=a.closest('.card').getBoundingClientRect();
      const g=a.closest('.card').previousElementSibling;
      return {t:a.textContent.replace(/\\s+/g,' ').trim(), href:a.getAttribute('href'), tgt:a.target, h:Math.round(r.height), inCard:r.left>=c.left-1&&r.right<=c.right+1,
        gl:g?g.textContent.trim().slice(0,2):'', over:document.scrollingElement.scrollWidth>innerWidth, ext:!!a.querySelector('svg.xlk'), n:document.querySelectorAll('%s .cmk').length};})()""" % (SUB, SUB))
def view(v):
    return v.evaluate("""(()=>{const i=document.getElementById('img'), pv=document.getElementById('prev'), nx=document.getElementById('next');
      return {ttl:document.getElementById('ttl').textContent, src:i.getAttribute('src'), nw:i.naturalWidth, err:getComputedStyle(document.getElementById('err')).display!=='none', imgShown:getComputedStyle(i).display!=='none',
        prev:getComputedStyle(pv).visibility==='hidden'?'':pv.textContent, next:getComputedStyle(nx).visibility==='hidden'?'':nx.textContent, no:document.getElementById('no').textContent, hl:history.length, url:location.search,
        over:document.scrollingElement.scrollWidth>innerWidth, src2:document.getElementById('src').textContent, isApp:!!document.getElementById('vStart')};})()""")
def wait_img(v):
    try: v.wait_for_function("document.getElementById('img').complete&&(document.getElementById('img').naturalWidth>0||getComputedStyle(document.getElementById('err')).display!=='none')", timeout=8000)
    except Exception: pass
def app_cache(p):   # 서비스워커 저장본(앱 화면 자리)에 든 것이 앱 화면인지
    return p.evaluate("""(async()=>{const ks=(await caches.keys()).filter(k=>k.startsWith('lawon-')); const out={};
      for(const k of ks){ const c=await caches.open(k); const r=await c.match('./index.html'); out[k]=r?((await r.text()).indexOf('id="vStart"')>=0?'앱':'다른 페이지'):'없음'; } return out;})()""")

CASES = [('원동기 회전축', 'RULE:제87조', 61), ('추락의 방지', 'RULE:제42조', 32), ('충전부 접근 한계거리', 'RULE:제321조', None), ('밀폐공간 작업 프로그램', 'RULE:제619조', None)]
with sync_playwright() as pw:
    br = pw.chromium.launch()
    # ① ② 서비스워커 없이(화면 검사) — 조문 화면 줄과 보기 화면
    for w, big, dark, tag in [(390, False, False, '390'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, service_workers='block', color_scheme='dark' if dark else 'light')
        errs = []
        p = c.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
        start(p)
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        D = p.evaluate("JSON.parse(document.getElementById('data').textContent).comic.map")
        for q, key, pg in CASES:
            art(p, q, key); no = key.split(':')[1]; pg = pg or D[no]; m = cmk(p)
            ok(tag + ' ' + key + " 조문 카드 안 '만화로 보기 안전보건공단 2026년판 %d쪽'" % pg, m and m['t'] == '만화로 보기 안전보건공단 2026년판 %d쪽' % pg and m['inCard'] and m['gl'] == '조문' and m['n'] == 1, m)
            ok(tag + ' ' + key + ' 링크 comic/?p=쪽&a=조문·새 창', m and dec(m['href']) == 'comic/?p=%d&a=%s' % (pg, no) and m['tgt'] == '_blank' and m['ext'], m)
            ok(tag + ' ' + key + ' 높이 44 이상·넘침 없음', m and m['h'] >= 44 and not m['over'], m)
        art(p, '원동기 회전축', 'RULE:제87조')
        with c.expect_page() as pi: p.click('%s .cmk' % SUB)
        v = pi.value; v.wait_for_load_state(); wait_img(v); s = view(v)
        ok(tag + ' 보기 화면 제87조 61쪽·그림 선명본(1591px)', s['ttl'] == '제87조 만화 · 61쪽' and s['src'] == '2026/061.webp' and s['nw'] == 1591 and not s['err'] and s['no'] == '61 / 344', s)
        ok(tag + ' 이전·다음 버튼·출처 줄·넘침 없음', s['prev'] == '‹ 60쪽' and s['next'] == '62쪽 ›' and s['src2'].startswith('출처: 안전보건공단 「만화로 보는 산업안전보건기준에 관한 규칙」 2026년판(2025. 10. 1. 시행 기준)') and not s['over'], s)
        shot(v, tag + '_보기_61')
        hl0 = s['hl']
        for _ in range(3): v.click('#next'); v.wait_for_timeout(120)
        wait_img(v); s = view(v)
        ok(tag + ' 다음 3번 → 64쪽, 주소 p=64', s['no'] == '64 / 344' and 'p=64' in s['url'] and s['nw'] == 1591, s)
        ok(tag + ' 쪽을 넘겨도 방문 기록이 늘지 않음(안드로이드 뒤로 한 번에 닫힘)', s['hl'] == hl0 == 1, (hl0, s['hl']))
        ok(tag + ' 뒤로 가기 할 곳 없음', v.go_back() is None)
        v.click('#prev'); v.wait_for_timeout(120); s = view(v); ok(tag + ' 이전 → 63쪽', s['no'] == '63 / 344', s)
        v.evaluate("setTimeout(()=>document.getElementById('close').click(),0)"); p.wait_for_timeout(700)
        ok(tag + ' 닫기 → 창 닫힘', v.is_closed())
        ok(tag + ' 앱 화면은 보던 조문 그대로', p.evaluate("document.querySelector('%s .cmk')!==null" % SUB))
        c.close()
        ok(tag + ' 화면 오류 없음', not errs, errs)
    # 보기 화면 경계: 1쪽·344쪽·잘못된 쪽·그림 없음
    c = br.new_context(viewport={'width': 390, 'height': 800}, service_workers='block'); v = c.new_page()
    v.goto(APP + 'comic/?p=1'); wait_img(v); s = view(v); ok('1쪽: 이전 숨김·제목 만화 · 1쪽', s['prev'] == '' and s['ttl'] == '만화 · 1쪽' and s['nw'] > 0, s)
    v.goto(APP + 'comic/?p=344'); wait_img(v); s = view(v); ok('344쪽: 다음 숨김', s['next'] == '' and s['no'] == '344 / 344', s)
    v.goto(APP + 'comic/?p=999'); wait_img(v); s = view(v); ok('잘못된 쪽 → 1쪽', s['no'] == '1 / 344', s)
    v.goto(APP + 'comic/?p=12&a=' + urllib.parse.quote('제4조의2')); wait_img(v); s = view(v); ok('한 쪽에 조문 여럿 — 연 조문 이름으로(제4조의2)', s['ttl'] == '제4조의2 만화 · 12쪽', s)
    v.route('**/comic/2026/050.webp', lambda r: r.abort())
    v.goto(APP + 'comic/?p=50'); wait_img(v); s = view(v); ok('그림 못 받으면 안내 문구(그림 자리 숨김)', s['err'] and not s['imgShown'], s)
    c.close()

    # ③ 서비스워커 v9
    c = br.new_context(viewport={'width': 390, 'height': 800}); p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(APP); p.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=15000)
    p.wait_for_function("window.LAWON_COMIC_OK===true", timeout=8000)
    ok('v9: 버전 확인 → 만화 보기 연결 켜짐', p.evaluate("window.LAWON_COMIC_OK===true"))
    p.wait_for_selector('#vStart:not([hidden])'); p.click('.pick[data-field="osh"]'); p.wait_for_timeout(200)
    art(p, '원동기 회전축', 'RULE:제87조'); m = cmk(p)
    ok('v9: 링크 comic/?p=61', m and dec(m['href']).startswith('comic/?p=61&'), m)
    with c.expect_page() as pi: p.click('%s .cmk' % SUB)
    v = pi.value; v.wait_for_load_state(); wait_img(v); s = view(v)
    ok('v9: 새 창에 보기 화면(앱 화면 아님)', s['ttl'] == '제87조 만화 · 61쪽' and not s['isApp'] and s['nw'] == 1591, s)
    v.close(); p.wait_for_timeout(800)
    ok('v9: 앱 저장본은 그대로 앱 화면', set(app_cache(p).values()) == {'앱'}, app_cache(p))
    q = c.new_page(); q.goto(APP); q.wait_for_selector('#vStart:not([hidden])', timeout=15000)
    ok('v9: 다시 열면 앱 첫 화면', q.evaluate("!!document.getElementById('vStart')"))
    ok('v9: 화면 오류 없음', not errs, errs)
    c.close()

    # ④ v8(옛 판)이 깔린 기기 → v9로 바뀔 때
    open(os.path.join(SITE, 'service-worker.js'), 'w', encoding='utf-8').write(OLD_SW)
    c = br.new_context(viewport={'width': 390, 'height': 800}); p = c.new_page()
    p.goto(APP); p.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=15000)
    p.reload(); p.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=15000); p.wait_for_timeout(3500)   # v8이 이미 깔려 있는 기기
    ok('v8: 만화 보기 연결 꺼짐(버전 응답 없음)', not p.evaluate("window.LAWON_COMIC_OK===true"))
    p.wait_for_selector('#vStart:not([hidden])'); p.click('.pick[data-field="osh"]'); p.wait_for_timeout(200)
    art(p, '원동기 회전축', 'RULE:제87조'); m = cmk(p)
    ok('v8: 링크는 공단 전자책(5-67 방식)', m and m['href'].startswith('https://www.kosha.or.kr/ebook/fcatalog/ecatalog5.jsp?Dir=647') and 'start=61' in m['href'], m)
    v = c.new_page(); v.goto(APP + 'comic/?p=61'); p.wait_for_timeout(1500)   # v8에서 우리 사이트 다른 페이지를 열면 덮어쓰는 문제 재현
    poisoned = app_cache(p)
    ok('v8 재현: comic/를 열면 앱 저장본이 덮어써짐(고치기 전 문제 확인)', '다른 페이지' in poisoned.values(), poisoned)
    v.close()
    open(os.path.join(SITE, 'service-worker.js'), 'w', encoding='utf-8').write(NEW_SW)
    p.evaluate("navigator.serviceWorker.getRegistration().then(r=>r&&r.update())")
    for _ in range(60):
        ks = p.evaluate("caches.keys()")
        if 'lawon-v9' in ks and 'lawon-v8' not in ks: break
        p.wait_for_timeout(250)
    p.wait_for_function("window.LAWON_COMIC_OK===true", timeout=8000)
    ok('v8 → v9: 바뀐 뒤 만화 보기 연결 켜짐(controllerchange)', p.evaluate("window.LAWON_COMIC_OK===true"))
    ok('v8 → v9: 덮어써진 저장본이 앱 화면으로 바로잡힘', app_cache(p) == {'lawon-v9': '앱'}, app_cache(p))
    q = c.new_page(); q.goto(APP); q.wait_for_selector('#vStart:not([hidden])', timeout=15000)
    ok('v8 → v9: 다시 열면 앱 첫 화면', q.evaluate("!!document.getElementById('vStart')"))
    c.close()
    br.close()
srv.shutdown(); shutil.rmtree(TMP, ignore_errors=True)
print('실패 %d건' % len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
