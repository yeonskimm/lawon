# 법ON 의견 보내기 화면 검사(2026-11-17) — 홈 화면 맨 아래 문의 줄(설정 창에는 없음 — 5-93) → 아래 창 → 전송(워커 응답 흉내) → 관리자 화면 의견 목록, 뒤로 버튼, 배포 주소에서 무작위 번호
# 사용: python3 claude_fb_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명 — index.html을 tests/_t.html로 복사해 _t.html)
import sys, os, json, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8785), functools.partial(Q, directory=HERE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
URL = 'http://127.0.0.1:8785/' + FILE
CAP = sys.argv[2] if len(sys.argv) > 2 else ''
if CAP: os.makedirs(CAP, exist_ok=True)
W = 'https://lawon-stats.darksky166.workers.dev'
AND = 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36'
IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
FAIL_MSG = '전송하지 못했습니다. 잠시 후 다시 시도해 주세요.'
RATE_MSG = '짧은 시간에 여러 번 보냈습니다. 잠시 후 다시 시도해 주세요.'
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
RECT = "(sel)=>{const e=document.querySelector(sel); if(!e)return null; const r=e.getBoundingClientRect(); return [r.left,r.top,r.right,r.bottom];}"
OPEN = "()=>['sheet','isheet','csheet','wsheet','asheet','rsheet','adm','xsheet','ssheet','hfsheet','fsheet'].filter(i=>!document.getElementById(i).hidden).join(',')"
VIEW = "()=>{let v='sub'; for(const id of ['vStart','vFind','vSite','vBook']){ if(!document.getElementById(id).hidden) v=id; } return v;}"
def shot(p, name):
    if CAP: p.screenshot(path=os.path.join(CAP, name + '.png'))
class Net:   # 워커 흉내: mode = 200 | 429 | 500 | 'abort' | 'hang'
    def __init__(self, ctx):
        self.mode = 200; self.fb = []; self.ping = []; self.held = []; self.adm = {'total': 12, 'vt': 40, 'days': []}
        ctx.route(W + '/**', self.on)
    def on(self, route):
        rq = route.request; path = rq.url[len(W):]
        if path == '/feedback':
            self.fb.append({'body': rq.post_data, 'ct': rq.headers.get('content-type', ''), 'method': rq.method})
            if self.mode == 'abort': return route.abort()
            if self.mode == 'hang': self.held.append(route); return   # 응답하지 않음(끝날 때 release로 정리)
            return route.fulfill(status=self.mode, headers=CORS, body='{"ok":true}' if self.mode == 200 else '')
        if path == '/ping':
            self.ping.append(rq.post_data); return route.fulfill(status=200, headers=CORS, body='{"ok":true}')
        if path == '/admin':
            return route.fulfill(status=200, headers=CORS, body=json.dumps(self.adm))
        return route.fulfill(status=404, headers=CORS, body='')
    def release(self):
        for r in self.held:
            try: r.abort()
            except Exception: pass
        self.held = []
def open_fb(p):   # 5-93: 여는 곳은 홈 화면 맨 아래 문의 줄 하나 — 다른 화면이면 탭바 '홈'으로 간 뒤 누름
    if p.evaluate("()=>document.getElementById('vStart').hidden"): p.click('#tabbar [data-home]'); p.wait_for_timeout(300)
    p.locator('#vStart .sfb').scroll_into_view_if_needed(); p.wait_for_timeout(100)
    p.click('#vStart .sfb'); p.wait_for_timeout(250)

def run(w, h, big, dark, cap=False):
    tag = '%dx%d%s%s' % (w, h, ' 크게' if big else '', ' 어둡게' if dark else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, color_scheme='dark' if dark else 'light', service_workers='block')
        net = Net(ctx); p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(900)
        if big: p.evaluate("()=>{document.documentElement.setAttribute('data-fs','l');}")
        if big: p.evaluate("()=>{ try{ const b=document.querySelector('[data-fs-set=\"l\"]'); b&&b.click(); }catch(e){} }")
        # ── 홈 화면 맨 아래 문의 줄(5-92) ──
        hr = p.evaluate(RECT, '#vStart .sfb'); last = p.evaluate("()=>{const k=[...document.querySelector('#vStart .start').children].filter(x=>!x.hidden); return k[k.length-1].className;}")
        ok(tag + ' 홈 화면 맨 아래 = 문의 줄(왼쪽 정렬·가로 꽉 참·44px 이상)', last == 'sfb' and hr and hr[0] >= 8 and hr[0] <= 24 and w - hr[2] <= 24 and hr[3] - hr[1] >= 44, (last, hr))
        if h >= 844: ok(tag + ' 일반 크기 화면: 스크롤 없이 첫 화면에 보임', p.evaluate("()=>document.scrollingElement.scrollHeight-innerHeight") <= 0 and hr[3] <= h, hr)
        ok(tag + ' 홈 문의 줄: 글자 안 잘림', p.evaluate("()=>[...document.querySelectorAll('#vStart .sfb span,#vStart .sfb em')].every(e=>e.scrollWidth<=e.clientWidth+1)"))
        p.click('#vStart .sfb'); p.wait_for_timeout(300)
        ok(tag + ' 홈 문의 줄 → 의견 보내기 창', p.evaluate(OPEN) == 'fsheet' and not p.evaluate("()=>document.getElementById('fbForm').hidden"), p.evaluate(OPEN))
        if cap: shot(p, '0_홈_문의줄_창')
        p.click('#fsheet .shh [data-fbclose]'); p.wait_for_timeout(250)
        ok(tag + ' 닫으면 홈 화면 그대로', p.evaluate(OPEN) == '' and p.evaluate(VIEW) == 'vStart')
        # ── 설정 창에는 없음(5-93) ──
        p.click('#gear'); p.wait_for_timeout(300)
        ok(tag + " 설정 창에 의견 보내기·문의 없음", p.evaluate("()=>{const t=document.querySelector('#sheet').textContent; return !document.querySelector('#sheet [data-fbopen]') && !/의견 보내기|문의 · 오류 신고|비공식|korea\\.kr|@/.test(t) && /제작 연쓰/.test(t);}"))
        p.keyboard.press('Escape'); p.wait_for_timeout(250)
        if cap: shot(p, '1_홈_문의줄')
        p.click('#vStart .sfb'); p.wait_for_timeout(300)
        # ── 의견 보내기 창 ──
        ok(tag + ' 의견 보내기 창만 열림', p.evaluate(OPEN) == 'fsheet', p.evaluate(OPEN))
        c = p.evaluate(RECT, '#fsheet .shcard')
        ok(tag + ' 창이 화면 안', c and c[1] >= 0 and c[3] <= h + 1 and c[0] >= 0 and c[2] <= w + 1, c)
        ok(tag + ' 가로 넘침 없음', not p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1"))
        seg = p.evaluate("()=>[...document.querySelectorAll('#fsheet [data-fbcat]')].map(b=>[b.textContent,b.getAttribute('aria-pressed'),b.scrollWidth<=b.clientWidth+1,b.getBoundingClientRect().height>=44])")
        ok(tag + ' 분류 3칸 — 글자 안 잘림·처음은 법령 오류', seg == [['법령 오류', 'true', True, True], ['앱 오류', 'false', True, True], ['개선 제안', 'false', True, True]], seg)
        ok(tag + ' 글 칸: 글자 크기 16px 이상(아이폰 확대 방지)·예시 문구', p.evaluate("()=>{const t=document.getElementById('fbText'); return parseFloat(getComputedStyle(t).fontSize)>=16 && t.placeholder==='예) 산업안전보건법 제29조 과태료 금액이 시행령 별표 35와 다릅니다.' && t.maxLength===500 && document.activeElement!==t;}"))
        ok(tag + " 안내 문구·글자 수 '0 / 500'", p.inner_text('#fbForm .sn') == '법령 내용이나 앱 사용 중 발견한 오류를 알려 주세요.' and p.inner_text('#fbCnt') == '0 / 500')
        if cap: shot(p, '2_의견보내기_창')
        # 빈 글
        p.click('#fbSend'); p.wait_for_timeout(200)
        ok(tag + ' 빈 글로 보내기 → 안내, 전송 없음', p.inner_text('#fbMsg') == '내용을 입력해 주세요.' and len(net.fb) == 0, (p.inner_text('#fbMsg'), len(net.fb)))
        p.fill('#fbText', '   '); p.click('#fbSend'); p.wait_for_timeout(150)
        ok(tag + ' 공백뿐인 글도 전송 없음', p.inner_text('#fbMsg') == '내용을 입력해 주세요.' and len(net.fb) == 0)
        if cap: shot(p, '3_빈글_안내')
        TXT = '근로기준법 제93조 과태료 금액 확인 바랍니다.\n둘째 줄'
        p.fill('#fbText', TXT); p.wait_for_timeout(100)
        ok(tag + ' 글을 쓰면 안내가 지워지고 글자 수 표시', p.inner_text('#fbMsg') == '' and p.inner_text('#fbCnt') == '%d / 500' % len(TXT), p.inner_text('#fbCnt'))
        p.click('#fsheet [data-fbcat="app"]'); p.wait_for_timeout(100)
        ok(tag + ' 분류 고르기', p.evaluate("()=>[...document.querySelectorAll('#fsheet [data-fbcat]')].map(b=>b.getAttribute('aria-pressed')).join()") == 'false,true,false')
        # 키보드 흉내(보이는 화면 58%)
        kv = int(h * 0.58)
        p.evaluate("(v)=>{const s=document.documentElement.style;s.setProperty('--vvh',v+'px');s.setProperty('--vvt','0px');}", kv); p.wait_for_timeout(150)
        p.focus('#fbText'); p.evaluate("()=>document.getElementById('fbText').scrollIntoView({block:'nearest'})"); p.wait_for_timeout(150)
        ck = p.evaluate(RECT, '#fsheet .shcard'); tk = p.evaluate(RECT, '#fbText')
        ok(tag + ' 키보드 열림: 창이 보이는 화면 안, 글 칸 보임', ck and ck[1] >= 0 and ck[3] <= kv + 1 and tk and tk[1] >= ck[1] - 1 and tk[3] <= kv + 1, (ck, tk, kv))
        p.evaluate("()=>{document.getElementById('fbSend').scrollIntoView({block:'nearest'})}"); p.wait_for_timeout(100)
        sk = p.evaluate(RECT, '#fbSend')
        ok(tag + ' 키보드 열림: 보내기 버튼까지 내려갈 수 있음', sk and sk[3] <= kv + 1 and sk[1] >= 0, (sk, kv))
        p.evaluate("()=>{const s=document.documentElement.style;s.removeProperty('--vvh');s.removeProperty('--vvt');}"); p.wait_for_timeout(100)
        # 429
        net.mode = 429; p.click('#fbSend'); p.wait_for_timeout(400)
        ok(tag + ' 연속 전송 제한(429) → 안내, 글·분류 그대로, 버튼 다시 누를 수 있음', p.inner_text('#fbMsg') == RATE_MSG and p.input_value('#fbText') == TXT and p.evaluate("()=>{const b=document.getElementById('fbSend');return !b.disabled&&b.textContent==='보내기'&&!document.getElementById('fbForm').hidden;}"), p.inner_text('#fbMsg'))
        if cap: shot(p, '4_연속전송_안내')
        mr = p.evaluate(RECT, '#fbMsg'); cr = p.evaluate(RECT, '#fbCnt')
        ok(tag + ' 긴 안내 문구가 글자 수와 겹치지 않고 화면 안', mr and cr and mr[2] <= cr[0] + 1 and cr[2] <= w and mr[0] >= 0, (mr, cr))
        # 서버 오류·연결 실패
        net.mode = 500; p.click('#fbSend'); p.wait_for_timeout(400)
        ok(tag + ' 서버 오류(500) → 실패 안내', p.inner_text('#fbMsg') == FAIL_MSG and p.input_value('#fbText') == TXT)
        net.mode = 'abort'; p.click('#fbSend'); p.wait_for_timeout(400)
        ok(tag + ' 연결 실패 → 실패 안내, 글 그대로', p.inner_text('#fbMsg') == FAIL_MSG and p.input_value('#fbText') == TXT and not p.evaluate("()=>document.getElementById('fbSend').disabled"))
        # 닫았다 다시 열어도 쓰던 글 그대로
        p.click('#fsheet .shh [data-fbclose]'); p.wait_for_timeout(250)
        ok(tag + ' 닫기 → 모든 창 닫힘', p.evaluate(OPEN) == '', p.evaluate(OPEN))
        open_fb(p)
        ok(tag + ' 다시 열면 쓰던 글·분류 그대로, 안내는 지워짐', p.input_value('#fbText') == TXT and p.inner_text('#fbMsg') == '' and p.evaluate("()=>document.querySelector('#fsheet [data-fbcat=\"app\"]').getAttribute('aria-pressed')") == 'true')
        # 성공(두 번 눌러도 한 번만)
        n0 = len(net.fb); net.mode = 200
        p.evaluate("()=>{const b=document.getElementById('fbSend'); b.click(); b.click();}"); p.wait_for_timeout(500)
        ok(tag + ' 보내기를 연달아 눌러도 한 번만 전송', len(net.fb) == n0 + 1, len(net.fb) - n0)
        rq = net.fb[-1]; body = json.loads(rq['body'])
        ok(tag + ' 보낸 항목 = uid·cat·text·tab·ver뿐', sorted(body.keys()) == ['cat', 'tab', 'text', 'uid', 'ver'], body)
        import re
        ok(tag + ' 보낸 값(분류·글·보던 탭·번호 형식), text/plain', body['cat'] == 'app' and body['text'] == TXT and body['tab'] == '첫 화면' and re.match(r'^[0-9a-f-]{32,40}$', body['uid']) is not None and body['ver'] == '' and rq['ct'].startswith('text/plain') and rq['method'] == 'POST', (body, rq['ct']))
        done = p.evaluate("()=>[document.getElementById('fbForm').hidden, document.getElementById('fbDone').hidden, document.querySelector('#fbDone .fbok').textContent, document.querySelector('#fbDone .sn').textContent]")
        ok(tag + " 접수 완료 화면('접수되었습니다'·'검토 후 반영하겠습니다.')", done == [True, False, '접수되었습니다', '검토 후 반영하겠습니다.'], done)
        c = p.evaluate(RECT, '#fsheet .shcard')
        ok(tag + ' 완료 화면도 화면 안·넘침 없음', c and c[1] >= 0 and c[3] <= h + 1 and not p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1"), c)
        if cap: shot(p, '5_접수완료')
        p.click('#fbDone [data-fbclose]'); p.wait_for_timeout(250)
        ok(tag + ' 확인 → 창 닫힘', p.evaluate(OPEN) == '')
        open_fb(p)
        ok(tag + ' 다시 열면 빈 입력 화면(분류 법령 오류)', p.evaluate("()=>[document.getElementById('fbForm').hidden, document.getElementById('fbDone').hidden, document.getElementById('fbText').value, document.getElementById('fbCnt').textContent, document.querySelector('#fsheet [data-fbcat=\"law\"]').getAttribute('aria-pressed')]") == [False, True, '', '0 / 500', 'true'])
        # 500자 제한
        p.fill('#fbText', '가' * 620); p.wait_for_timeout(100)
        ok(tag + ' 500자까지만 입력', p.evaluate("()=>document.getElementById('fbText').value.length") == 500 and p.inner_text('#fbCnt') == '500 / 500')
        p.fill('#fbText', ''); p.keyboard.press('Escape'); p.wait_for_timeout(250)
        ok(tag + ' Esc로 닫힘', p.evaluate(OPEN) == '')
        # 바깥(어두운 곳) 누르면 닫힘
        open_fb(p); p.mouse.click(w // 2, 6); p.wait_for_timeout(250)
        ok(tag + ' 창 바깥을 누르면 닫힘', p.evaluate(OPEN) == '')
        # 검색어·입력 조건은 보내지 않음(검색하다 홈으로 와서 보냄)
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300); p.fill('#q', '비밀검색어'); p.wait_for_timeout(400)
        open_fb(p); p.fill('#fbText', '검색 중 의견'); p.click('#fbSend'); p.wait_for_timeout(400)
        ok(tag + " 검색어는 보내지 않음·보던 탭 = '첫 화면'", '비밀검색어' not in net.fb[-1]['body'] and json.loads(net.fb[-1]['body'])['tab'] == '첫 화면', net.fb[-1]['body'])
        p.click('#fbDone [data-fbclose]'); p.wait_for_timeout(250)
        ok(tag + ' 닫은 뒤 홈 화면 그대로', p.evaluate(VIEW) == 'vStart' and p.evaluate(OPEN) == '')
        # 응답 없음 → 15초 뒤 실패 안내(시계 앞당김)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()

def run_timeout():
    with sync_playwright() as pw:
        b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
        net = Net(ctx); p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.clock.install(); p.goto(URL); p.clock.run_for(1000)
        p.click('#vStart .sfb'); p.clock.run_for(300)
        p.fill('#fbText', '응답 없음'); net.mode = 'hang'; p.click('#fbSend'); p.clock.run_for(5000)
        ok("응답 없음: 5초째 '보내는 중…'·버튼 잠김", p.evaluate("()=>{const b=document.getElementById('fbSend');return b.disabled&&b.textContent==='보내는 중…';}"))
        p.clock.run_for(11000)
        ok('응답 없음: 15초 뒤 실패 안내·버튼 풀림·글 그대로', p.inner_text('#fbMsg') == FAIL_MSG and p.input_value('#fbText') == '응답 없음' and p.evaluate("()=>{const b=document.getElementById('fbSend');return !b.disabled&&b.textContent==='보내기';}"), p.inner_text('#fbMsg'))
        net.mode = 200; p.click('#fbSend')
        try: p.wait_for_function("()=>!document.getElementById('fbDone').hidden", timeout=5000); shown = True
        except Exception: shown = False
        ok('응답 없음 뒤 다시 보내면 접수', shown and len(net.fb) == 2, (shown, len(net.fb)))
        net.release(); p.clock.run_for(200)
        ok('응답 없음: 늦게 끝난 앞 요청이 완료 화면을 바꾸지 않음', p.evaluate("()=>!document.getElementById('fbDone').hidden&&document.getElementById('fbMsg').textContent===''"))
        ok('응답 없음 시험: 스크립트 오류 없음', not errs, errs)
        b.close()

def run_back():   # 안드로이드 뒤로 버튼 / 아이폰(방문기록 안 씀)
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(user_agent=AND, viewport={'width': 390, 'height': 800}, has_touch=True, is_mobile=True, service_workers='block'); net = Net(ctx)
        p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        def back():
            try: p.go_back(timeout=2500)
            except Exception: pass
            p.wait_for_timeout(500)
        p.goto(URL); p.wait_for_timeout(900)
        p.tap('.pick[data-field="osh"]'); p.wait_for_timeout(400)
        p.tap('#tabbar [data-nav="book"]'); p.wait_for_timeout(400)
        p.tap('#tabbar [data-home]'); p.wait_for_timeout(400)
        hl = p.evaluate('()=>history.length'); st0 = p.evaluate('()=>JSON.stringify(history.state)')
        p.locator('#vStart .sfb').scroll_into_view_if_needed(); p.tap('#vStart .sfb'); p.wait_for_timeout(300)
        ok('안드로이드: 홈 문의 줄 → 창이 열리며 창 기록이 생김(뒤로로 닫히게)', p.evaluate(OPEN) == 'fsheet' and p.evaluate('()=>JSON.stringify(history.state)') != st0, (st0, p.evaluate('()=>JSON.stringify(history.state)')))   # 홈으로 올 때 앞쪽 기록이 남아 있어 history.length는 그대로일 수 있음
        back()
        ok('안드로이드: 뒤로 → 창만 닫힘, 홈 화면 그대로', p.url.startswith('http://127') and p.evaluate(OPEN) == '' and p.evaluate(VIEW) == 'vStart' and p.evaluate('()=>JSON.stringify(history.state)') == st0, (p.evaluate(OPEN), p.evaluate(VIEW)))
        p.tap('#vStart .sfb'); p.wait_for_timeout(300)
        p.fill('#fbText', '뒤로 버튼'); p.tap('#fbSend'); p.wait_for_timeout(500)
        ok('안드로이드: 전송 → 완료 화면', p.evaluate("()=>!document.getElementById('fbDone').hidden"))
        p.tap('#fbDone [data-fbclose]'); p.wait_for_timeout(500)
        ok('안드로이드: 확인으로 닫음 → 홈 화면, 창 기록이 남지 않음', p.evaluate(OPEN) == '' and p.evaluate(VIEW) == 'vStart' and p.evaluate('()=>JSON.stringify(history.state)') == st0, p.evaluate('()=>JSON.stringify(history.state)'))
        back()
        ok('안드로이드: 그다음 뒤로 → 앱 안에 머묾·창 안 열림', p.url.startswith('http://127') and p.evaluate(OPEN) == '', p.url)
        ok('안드로이드: 스크립트 오류 없음', not errs, errs)
        ctx.close()
        ctx = b.new_context(user_agent=IOS, viewport={'width': 390, 'height': 800}, has_touch=True, is_mobile=True, service_workers='block'); net = Net(ctx)
        p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(900); hl = p.evaluate('()=>history.length')
        p.locator('#vStart .sfb').scroll_into_view_if_needed(); p.tap('#vStart .sfb'); p.wait_for_timeout(300)
        p.fill('#fbText', '아이폰'); p.tap('#fbSend'); p.wait_for_timeout(500); p.tap('#fbDone [data-fbclose]'); p.wait_for_timeout(300)
        ok('아이폰: 방문기록을 쓰지 않음·전송·닫기 동작', p.evaluate('()=>history.length') == hl and p.evaluate(OPEN) == '' and len(net.fb) == 1 and json.loads(net.fb[0]['body'])['tab'] == '첫 화면', (hl, p.evaluate('()=>history.length'), net.fb))
        ok('아이폰: 스크립트 오류 없음', not errs, errs)
        b.close()

def run_admin(cap=False):
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for w, h, big in [(390, 844, False), (320, 568, True)]:
            tag = '관리자 %dx%d%s' % (w, h, ' 크게' if big else '')
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, service_workers='block'); net = Net(ctx)
            p = ctx.new_page(); errs = []; dlg = []; p.on('pageerror', lambda e: errs.append(str(e))); p.on('dialog', lambda d: (dlg.append(1), d.dismiss()))
            p.goto(URL); p.wait_for_timeout(900)
            if big: p.evaluate("()=>{ const b=document.querySelector('[data-fs-set=\"l\"]'); b&&b.click(); }")
            def admin(data):
                net.adm = data
                p.evaluate("()=>{ try{sessionStorage.removeItem('lawon.adm');}catch(e){} const a=document.querySelector('#adm [data-aclose]'); if(!document.getElementById('adm').hidden)a.click(); }"); p.wait_for_timeout(200)
                for _ in range(5): p.click('#vStart .hero', position={'x': 30, 'y': 30})
                p.wait_for_timeout(250); p.fill('#admKey', '1234'); p.click('#admGo'); p.wait_for_timeout(450)
            T0 = 1794872520000   # 2026-11-17 08:42 한국 시각
            fb = [{'ts': T0, 'cat': 'law', 'body': '<img src=x onerror=alert(1)><script>alert(2)</script>\n둘째 줄 2026-11-17', 'dev': 'Android', 'tab': '산업안전 · 적용 확인', 'ver': 'cf481c7'},
                  {'ts': T0 - 86400000, 'cat': 'app', 'body': '글자 크기를 크게 하면 버튼이 잘립니다. ' + '가나다라마바사' * 30, 'dev': 'iOS', 'tab': '근로기준 · 법령집', 'ver': ''},
                  {'ts': T0 - 2 * 86400000, 'cat': 'zzz', 'body': '모르는 분류', 'dev': 'PC', 'tab': '', 'ver': ''}]
            admin({'total': 12, 'vt': 40, 'days': [], 'fb': fb})
            tabs = p.evaluate("()=>[...document.querySelectorAll('#admBody [data-atab]')].map(b=>[b.textContent,b.getAttribute('aria-pressed')])")
            ok(tag + " 두 칸 '이용 현황'·'의견 3', 처음은 이용 현황", tabs == [['이용 현황', 'true'], ['의견 3', 'false']] and p.evaluate("()=>!document.getElementById('admSt').hidden&&document.getElementById('admFb').hidden"), tabs)
            ok(tag + ' 이용 현황 내용 그대로', p.evaluate("()=>{const t=document.getElementById('admSt').textContent; return /누적/.test(t)&&/최근 7일 이용자/.test(t)&&/날짜별 이용자/.test(t)&&document.querySelectorAll('#admSt .adm-bars>div').length===7;}"))
            p.click('#admBody [data-atab="fb"]'); p.wait_for_timeout(200)
            ok(tag + ' 의견 칸으로 바뀜', p.evaluate("()=>document.getElementById('admSt').hidden&&!document.getElementById('admFb').hidden&&document.querySelector('[data-atab=\"fb\"]').getAttribute('aria-pressed')==='true'"))
            rows = p.evaluate("()=>[...document.querySelectorAll('#admFb .adm-fb')].map(r=>[r.querySelector('.tg').textContent, r.querySelector('.tg').className, r.querySelector('.fbh span:last-child').textContent, r.querySelector('.fbx').textContent])")
            ok(tag + ' 의견 3줄 — 분류·시각(한국)·기기·탭·반영 번호', len(rows) == 3 and rows[0][:3] == ['법령 오류', 'tg a', '11. 17. 08:42 · Android · 산업안전 · 적용 확인 · cf481c7'] and rows[1][:3] == ['앱 오류', 'tg n', '11. 16. 08:42 · iOS · 근로기준 · 법령집'] and rows[2][:3] == ['기타', 'tg n', '11. 15. 08:42 · PC'], [x[:3] for x in rows])
            ok(tag + ' 의견 글은 글자 그대로(태그 실행 안 됨·날짜 모양 안 바뀜·줄바꿈 유지)', rows[0][3] == fb[0]['body'] and p.evaluate("()=>document.querySelectorAll('#admFb img,#admFb script').length") == 0 and not dlg and p.evaluate("()=>getComputedStyle(document.querySelector('#admFb .fbx')).whiteSpace") == 'pre-wrap', rows[0][3])
            ok(tag + ' 긴 글·긴 줄도 가로 넘침 없음', not p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1||document.getElementById('adm').scrollWidth>document.getElementById('adm').clientWidth+1"))
            ok(tag + " 안내 줄 '접수 후 180일 지나면 자동 삭제'", '접수 후 180일 지나면 자동 삭제 · 최근 200건 표시' in p.inner_text('#admFb'))
            if cap and not big: shot(p, '6_관리자_의견목록')
            p.click('#admBody [data-atab="st"]'); p.wait_for_timeout(150)
            ok(tag + ' 이용 현황으로 돌아옴', p.evaluate("()=>!document.getElementById('admSt').hidden&&document.getElementById('admFb').hidden"))
            admin({'total': 12, 'vt': 40, 'days': [], 'fb': []}); p.click('#admBody [data-atab="fb"]'); p.wait_for_timeout(150)
            ok(tag + " 의견 0건 → 칸 이름 '의견', '접수된 의견 없음'", p.inner_text('#admBody [data-atab="fb"]') == '의견' and '접수된 의견 없음' in p.inner_text('#admFb'))
            admin({'total': 12, 'vt': 40, 'days': []})
            ok(tag + ' 옛 워커(fb 없음): 이용 통계는 그대로 표시', p.evaluate("()=>/누적/.test(document.getElementById('admBody').textContent)") and (p.click('#admBody [data-atab="fb"]') or True) and '의견 목록을 불러오지 못함' in p.inner_text('#admFb'))
            admin({'total': 12, 'vt': 40, 'days': [], 'fb': None})
            p.click('#admBody [data-atab="fb"]'); p.wait_for_timeout(100)
            ok(tag + ' 표 오류(fb null): 불러오지 못함 안내', '의견 목록을 불러오지 못함' in p.inner_text('#admFb'))
            admin({'total': 12, 'vt': 40, 'days': [], 'fb': [{'ts': 'x', 'cat': None, 'body': None}, {'ts': 9e99, 'body': 5}]})
            p.click('#admBody [data-atab="fb"]'); p.wait_for_timeout(100)
            ok(tag + ' 이상한 값이 와도 화면이 깨지지 않음', p.evaluate("()=>document.querySelectorAll('#admFb .adm-fb').length") == 2 and not errs, errs)
            p.click('#adm [data-aclose]'); p.wait_for_timeout(200)
            ok(tag + ' 닫기·스크립트 오류 없음', p.evaluate(OPEN) == '' and not errs, errs)
            ctx.close()
        b.close()

def run_deployed():   # 배포 주소 흉내: 무작위 번호 하나를 집계(/ping)와 의견 보내기가 같이 씀
    with sync_playwright() as pw:
        b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); net = Net(ctx)
        html = open(os.path.join(HERE, FILE), 'rb').read()
        def site(route):
            path = route.request.url.split('yeonskimm.github.io/lawon/')[-1].split('?')[0]
            if path in ('', 'index.html'): return route.fulfill(status=200, headers={'Content-Type': 'text/html; charset=utf-8'}, body=html)
            fp = os.path.join(os.path.dirname(HERE), path)
            if os.path.isfile(fp): return route.fulfill(status=200, path=fp)
            return route.fulfill(status=404, body='')
        ctx.route('https://yeonskimm.github.io/lawon/**', site)
        p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto('https://yeonskimm.github.io/lawon/'); p.wait_for_timeout(1200)
        uid = p.evaluate("()=>localStorage.getItem('lawon.uid')")
        import re
        ok('배포 주소: 열 때 무작위 번호를 만들어 /ping 한 번', len(net.ping) == 1 and uid and re.match(r'^[0-9a-f-]{32,40}$', uid) is not None and json.loads(net.ping[0]) == {'uid': uid}, (net.ping, uid))
        ok('배포 주소: 집계 완료 표시(lawon.ping = 오늘)', p.evaluate("()=>/^\\d{4}-\\d\\d-\\d\\d$/.test(localStorage.getItem('lawon.ping')||'')"))
        p.click('#vStart .sfb'); p.wait_for_timeout(250)
        p.fill('#fbText', '배포 주소'); p.click('#fbSend'); p.wait_for_timeout(500)
        ok('배포 주소: 의견 보내기는 같은 번호를 씀(새로 만들지 않음)', len(net.fb) == 1 and json.loads(net.fb[0]['body'])['uid'] == uid and p.evaluate("()=>localStorage.getItem('lawon.uid')") == uid)
        p.reload(); p.wait_for_timeout(1000)
        ok('배포 주소: 같은 날 다시 열면 /ping 안 보냄·번호 그대로', len(net.ping) == 1 and p.evaluate("()=>localStorage.getItem('lawon.uid')") == uid, len(net.ping))
        ok('배포 주소: 스크립트 오류 없음', not errs, errs)
        b.close()

run(390, 844, False, False, cap=True)
run(320, 568, True, False)
run(430, 932, False, True)
run(375, 667, True, True)
run_timeout()
run_back()
run_admin(cap=True)
run_deployed()
print('실패 %d건' % len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
