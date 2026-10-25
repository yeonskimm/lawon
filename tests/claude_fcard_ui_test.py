# 법ON 과태료 금액 칸 누르기 화면 검사(2026-10-25) — 사용: python3 claude_fcard_ui_test.py <tests 기준 파일명.html> [캡처 폴더]   (포트 8784)
# 확인(사용자 지적 — 위 금액 칸 '3차 50만원'을 눌러도 차수가 안 바뀜):
#  ① 접힌 상태에서 금액 칸 누름 → 계산 펼침 + 그 줄·그 차수, 결과 칸이 화면 안(아래 탭 위), 누른 줄도 화면 안
#  ② 같은 조문에 계산 칸이 여럿(산안법 제114조 제5항·제6항) → 칸마다 따로(다른 칸 상태 안 바뀜)
#  ③ 한 칸 줄('1~3차')은 차수 그대로, 글 금액 줄(제72조 미계상액)은 펼침 때 흐리게·눌러도 변화 없음, 중대재해 체크면 3차 그대로
#  ④ 손가락으로 끌어 내리기(스크롤)는 선택 안 됨, 톡 누르기만 선택
#  ⑤ 카드 셋째 칸 '3차 이상'(별표 원문·아래 단추와 같음), 한 줄·가로 넘침 없음, 계산 없는 법령(근기법) 칸은 눌러도 변화 없음
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8784), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8784/' + FILE
SEC = 'main>section.sub:not([hidden])'
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def shot(p, n):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'))
def setf(p, f, v):
    p.evaluate("([f,v])=>{const x=document.getElementById(f); x.value=v; x.dispatchEvent(new Event('input',{bubbles:true})); x.dispatchEvent(new Event('change',{bubbles:true}));}", [f, v])
def art(p, key):   # 조문 화면 열기(검색 결과와 같은 data-art 단추를 눌러 이동)
    p.evaluate("(k)=>{let b=document.getElementById('__fcgo'); if(!b){b=document.createElement('button'); b.id='__fcgo'; b.hidden=true; document.body.appendChild(b);} b.setAttribute('data-art',k); b.click();}", key)
    p.wait_for_timeout(500); p.evaluate('scrollTo(0,0)'); p.wait_for_timeout(100)
def blk(p, i): return p.locator(SEC + ' .fines:has([data-fcopen])').nth(i)
def cell(F, r, c): return F.locator('.fr[data-fa]').nth(r).locator('.fa span').nth(c)
def st(F):   # 칸 상태: 펼침·고른 줄 번호·강조 칸·눌린 차수 단추·결과
    return F.evaluate("""F=>{const R=[...F.querySelectorAll('.fr[data-fa]')]; const s=F.querySelector('.fr.fsel'); const pk=F.querySelector('.fpk');
      return {open:F.classList.contains('fcon')&&!F.querySelector('.fcb').hidden, row:R.indexOf(s), pk:pk?pk.innerText.replace(/\\n/g,' '):null, npk:F.querySelectorAll('.fpk').length,
        btn:[...F.querySelectorAll('[data-fcc]')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.textContent).join(','),
        dis:[...F.querySelectorAll('[data-fcc]')].some(b=>b.disabled), res:(F.querySelector('.fcres')||{innerText:''}).innerText.replace(/\\n/g,' / ')};}""")
def seen(p, F, r):   # 결과 금액 줄이 아래 탭 위에 보이는지, 누른 줄 윗부분이 머리 띠 아래에 보이는지
    return p.evaluate("""([F,r])=>{const tb=document.getElementById('tabbar').getBoundingClientRect(), hd=document.querySelector('.hdr').getBoundingClientRect();
      const oe=F.querySelector('[data-fco]'); if(!oe||F.querySelector('.fcb').hidden)return {res:false,row:false,why:'결과 칸 없음(계산이 펼쳐지지 않음)'};
      const o=oe.getBoundingClientRect(), R=F.querySelectorAll('.fr[data-fa]')[r].getBoundingClientRect();
      return {res:o.bottom<=tb.top&&o.top>=hd.bottom, row:R.top>=hd.bottom-1&&R.top<tb.top, o:[Math.round(o.top),Math.round(o.bottom)], R:Math.round(R.top), tb:Math.round(tb.top), hd:Math.round(hd.bottom), y:Math.round(scrollY)};}""", [F.element_handle(), r])
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def one_line(p):   # 금액 칸 차수 이름이 모두 한 줄
    return p.evaluate("(s)=>[...document.querySelectorAll(s+' .fa small')].every(x=>x.getClientRects().length===1&&x.getBoundingClientRect().height<parseFloat(getComputedStyle(x).fontSize)*1.9)", SEC)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, h, big, dark, tag in [(390, 844, False, False, '390'), (375, 667, False, False, '375x667'), (320, 700, True, False, '320크게'), (430, 932, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, service_workers='block')
        p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(200)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200)
        setf(p, 'n', '30')   # 상시 30명 → 규모 80%
        # ── 산안법 제114조(사용자 캡처 화면): 칸 1 = 제1항 위반(3줄, 1종당 × 1개소당), 칸 2 = 제3항 위반(1줄, 1명당) ──
        art(p, 'OSH:제114조'); F1, F2 = blk(p, 0), blk(p, 1)
        ok(tag + ' 제114조 계산 칸 2개', p.locator(SEC + ' .fines:has([data-fcopen])').count() == 2)
        ok(tag + ' 카드 셋째 칸 이름 3차 이상', cell(F1, 0, 2).locator('small').inner_text().strip() == '3차 이상', cell(F1, 0, 2).inner_text())
        ok(tag + ' 차수 이름 한 줄', one_line(p))
        F1.locator('.fr[data-fa]').nth(2).locator('.fd').click(); p.wait_for_timeout(200)
        ok(tag + ' ① 접힌 상태에서 줄 설명 글을 누르면 그대로(펼치지 않음)', not st(F1)['open'])
        F1.locator('.fr[data-fa]').nth(2).scroll_into_view_if_needed(); p.wait_for_timeout(100)
        cell(F1, 2, 2).click(); p.wait_for_timeout(700)
        s = st(F1)
        ok(tag + ' ① 접힌 상태에서 셋째 줄 3차 이상 칸 → 펼침·셋째 줄·3차 이상', s['open'] and s['row'] == 2 and s['btn'] == '3차 이상' and s['npk'] == 1 and s['pk'] == '3차 이상 50만원', s)
        ok(tag + ' ① 계산도 3차: 50만원 × 1종 × 1개소 = 50만원(100만원 미만이라 감경 없음)', '50만원' in s['res'] and '규모 감경 없음' in s['res'], s['res'])
        v = seen(p, F1, 2)
        ok(tag + ' ① 결과 금액이 화면 안(아래 탭 위)·누른 줄도 화면 안', v['res'] and v['row'], v)
        shot(p, tag + '_1_접힘에서3차')
        y0 = p.evaluate('scrollY'); cell(F1, 2, 2).click(); p.wait_for_timeout(500); s2 = st(F1)
        ok(tag + ' 같은 칸 다시 누름 → 그대로·화면도 그대로', s2['row'] == 2 and s2['btn'] == '3차 이상' and s2['npk'] == 1 and abs(p.evaluate('scrollY') - y0) < 2, (s2, y0))
        cell(F1, 1, 0).click(); p.wait_for_timeout(600); s = st(F1)
        ok(tag + ' 둘째 줄 1차 칸 → 둘째 줄·1차 100만원 × 80% = 80 → 100만원', s['row'] == 1 and s['btn'] == '1차' and s['pk'] == '1차 100만원' and '100만원' in s['res'], s)
        F1.locator('[data-fcc="1"]').click(); p.wait_for_timeout(200); s = st(F1)
        ok(tag + ' 아래 2차 단추 → 위 칸 강조도 둘째 줄 2차(양방향)', s['pk'] == '2차 200만원' and s['npk'] == 1, s)
        # ② 칸 2(제3항 위반)는 따로
        F2.locator('.fr[data-fa]').first.scroll_into_view_if_needed(); p.wait_for_timeout(100)
        cell(F2, 0, 1).click(); p.wait_for_timeout(600); s1, t2 = st(F1), st(F2)
        ok(tag + ' ② 칸 2 2차 칸 → 칸 2만 펼침·2차 100만원 × 1명', t2['open'] and t2['btn'] == '2차' and t2['pk'] == '2차 100만원', t2)
        ok(tag + ' ② 칸 1 상태 그대로(둘째 줄·2차·강조 1개)', s1['open'] and s1['row'] == 1 and s1['btn'] == '2차' and s1['pk'] == '2차 200만원' and s1['npk'] == 1, s1)
        cell(F1, 0, 2).scroll_into_view_if_needed(); cell(F1, 0, 2).click(); p.wait_for_timeout(600)
        ok(tag + ' ② 칸 1을 바꿔도 칸 2 그대로', st(F2)['btn'] == '2차' and st(F2)['pk'] == '2차 100만원', st(F2))
        F1.locator('[data-fcopen]').click(); p.wait_for_timeout(200); s = st(F1)
        ok(tag + ' 금액 계산 접기 → 패널·강조 사라짐', (not s['open']) and s['npk'] == 0, s)
        cell(F1, 2, 0).scroll_into_view_if_needed(); cell(F1, 2, 0).click(); p.wait_for_timeout(600); s = st(F1)
        ok(tag + ' 다시 금액 칸 → 다시 펼침·셋째 줄 1차', s['open'] and s['row'] == 2 and s['btn'] == '1차' and s['pk'] == '1차 10만원', s)
        ok(tag + ' 가로 넘침 없음(제114조)', not wide(p))
        # ── ③ 제17조: 한 칸 줄(선임 안 함 500) + 세 칸 줄(업무 미수행 300·400·500), 중대재해 체크 ──
        art(p, 'OSH:제17조'); F = blk(p, 0)
        cell(F, 1, 1).scroll_into_view_if_needed(); cell(F, 1, 1).click(); p.wait_for_timeout(600); s = st(F)
        ok(tag + ' ③ 제17조 업무 미수행 2차 칸 → 400 × 80% = 320만원', s['row'] == 1 and s['btn'] == '2차' and '320만원' in s['res'], s)
        cell(F, 0, 0).click(); p.wait_for_timeout(600); s = st(F)
        ok(tag + ' ③ 한 칸 줄(1~3차 500) → 그 줄 선택·차수 2차 그대로·강조 1개', s['row'] == 0 and s['btn'] == '2차' and s['npk'] == 1 and '400만원' in s['res'], s)
        F.locator('[data-fcj]').check(); p.wait_for_timeout(200)
        cell(F, 1, 0).click(); p.wait_for_timeout(600); s = st(F)
        ok(tag + ' ③ 중대재해 체크 중 1차 칸 → 줄만 바뀌고 3차 그대로(단추 잠김)', s['row'] == 1 and s['dis'] and s['pk'] == '3차 이상 500만원' and '3차 금액 적용' in s['res'], s)
        F.locator('[data-fcj]').uncheck(); p.wait_for_timeout(200); s = st(F)
        ok(tag + ' ③ 체크 풀면 전에 고른 2차로', s['btn'] == '2차' and s['pk'] == '2차 400만원', s)
        # ── ③ 제72조: 글 금액 줄(미계상액·목적 외 사용금액)이 섞인 칸 ──
        art(p, 'OSH:제72조'); F = blk(p, 0)
        F.locator('[data-fcopen]').scroll_into_view_if_needed(); F.locator('[data-fcopen]').click(); p.wait_for_timeout(300)
        op = F.evaluate("F=>[...F.querySelectorAll('.fr')].map(r=>[r.hasAttribute('data-fa'), getComputedStyle(r.querySelector('.fa')).opacity])")
        ok(tag + ' ③ 제72조 펼침 때 글 금액 줄만 흐리게', all((a and o == '1') or ((not a) and float(o) < 0.7) for a, o in op) and any(not a for a, o in op), op)
        s0 = st(F); txt = F.locator('.fr:not([data-fa]) .fa span').first
        txt.scroll_into_view_if_needed(); txt.click(); p.wait_for_timeout(300); s = st(F)
        ok(tag + ' ③ 글 금액 칸 누름 → 변화 없음', s == s0, (s0, s))
        F.locator('[data-fcopen]').click(); p.wait_for_timeout(200)
        op = F.evaluate("F=>[...F.querySelectorAll('.fr .fa')].map(x=>getComputedStyle(x).opacity)")
        ok(tag + ' ③ 접으면 흐림 풀림', all(o == '1' for o in op), op)
        # ── ⑤ 근기법 제14조(계산 없는 과태료 칸) ──
        art(p, 'GK:제14조')
        fl = p.locator(SEC + ' .fines').first
        ok(tag + ' ⑤ 근기법 과태료 칸도 3차 이상 이름', fl.locator('.fa span').nth(2).locator('small').inner_text().strip() == '3차 이상')
        fl.locator('.fa span').nth(2).click(); p.wait_for_timeout(300)
        ok(tag + ' ⑤ 근기법 칸 누름 → 아무 변화 없음(계산 패널 없음·강조 없음)', p.evaluate("(s)=>!document.querySelector(s+' .fines .fcb')&&!document.querySelector(s+' .fpk')", SEC))
        ok(tag + ' 가로 넘침 없음(근기법)', not wide(p))
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        c.close()
    # ── ④ 터치: 끌어 내리기는 선택 안 됨, 톡 누르기만 선택(휴대폰 흉내) ──
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, service_workers='block')
    p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
    p.tap('.pick[data-field="osh"]'); p.wait_for_timeout(200); p.tap('#tabbar [data-nav="find"]'); p.wait_for_timeout(200)
    art(p, 'OSH:제114조'); F1 = blk(p, 0)
    cell(F1, 0, 0).scroll_into_view_if_needed(); p.wait_for_timeout(200)
    cdp = c.new_cdp_session(p)
    def drag(x, y, dy):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        for k in range(1, 9):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y - dy * k / 8}]}); p.wait_for_timeout(16)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); p.wait_for_timeout(500)
    b = cell(F1, 1, 2).bounding_box(); y0 = p.evaluate('scrollY')
    drag(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, 120)
    ok('터치 ④ 금액 칸에서 시작해 끌어 올림 → 화면만 움직이고 선택 안 됨', (not st(F1)['open']) and p.evaluate('scrollY') != y0, (st(F1), y0, p.evaluate('scrollY')))
    cell(F1, 1, 2).scroll_into_view_if_needed(); p.wait_for_timeout(200)
    b = cell(F1, 1, 2).bounding_box(); p.touchscreen.tap(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2); p.wait_for_timeout(700); s = st(F1)
    ok('터치 ④ 톡 누름 → 펼침·둘째 줄·3차 이상', s['open'] and s['row'] == 1 and s['btn'] == '3차 이상', s)
    b = cell(F1, 0, 1).bounding_box()
    drag(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, -90)
    s = st(F1)
    ok('터치 ④ 펼친 뒤에도 끌기는 선택 안 바꿈', s['row'] == 1 and s['btn'] == '3차 이상', s)
    ok('터치 스크립트 오류 없음', not errs, errs)
    c.close(); br.close()
srv.shutdown()
print('실패 %d건' % len(fails) if fails else '모두 통과')
sys.exit(1 if fails else 0)
