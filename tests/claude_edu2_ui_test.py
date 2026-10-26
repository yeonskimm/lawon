# 법ON 교육시간 표시 정리·별표 줄 긴 기준값(2026-10-26, 5-83) 화면 검사
# 사용: python3 claude_edu2_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8785)
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8785), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8785/' + FILE
SUB = 'main>section.sub:not([hidden])'
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def go(p, attr, val):   # 화면 열기(문서에 위임된 누르기 처리 사용)
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(120)
    p.evaluate("""([a,v])=>{ const b=document.createElement('button'); b.setAttribute(a,v); b.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;opacity:0'; document.body.appendChild(b); b.click(); b.remove(); }""", [attr, val])
    p.wait_for_timeout(350); p.evaluate('scrollTo(0,0)')
def sec(p, name):   # 그 구획 카드 정보
    return p.evaluate("""(n)=>{const g=[...document.querySelectorAll('%s h3.gl')].find(x=>x.textContent.trim().startsWith(n)); if(!g)return null; const c=g.nextElementSibling;
      const rows=[...c.querySelectorAll('.edu li.er')].map(li=>{const s=li.querySelector('small'), b=li.querySelector('b'); const rs=s.getBoundingClientRect(), rb=b.getBoundingClientRect();
        return {w:s.textContent, v:b.textContent, ec:[...li.querySelectorAll('.ec')].map(x=>x.textContent), side:rb.left>rs.left+20&&Math.abs(rb.top-rs.top)<12, st:li.classList.contains('st')};});
      return {t:c.innerText, edg:[...c.querySelectorAll('.edg')].map(x=>x.textContent), rows:rows, bval:[...c.querySelectorAll('.bval')].map(x=>({t:x.textContent,lg:x.classList.contains('lg'),fs:parseFloat(getComputedStyle(x).fontSize)})),
        bvc:[...c.querySelectorAll('.bvc')].map(x=>x.textContent), over:[...c.querySelectorAll('*')].some(x=>x.getBoundingClientRect().right>innerWidth+0.5)};}""" % SUB, name)
def row(C, w):
    for r in (C or {}).get('rows', []):
        if r['w'] == w: return r
    return None

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(390, False, False, '390'), (393, True, False, '393크게'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, service_workers='block')
        errs = []
        p = c.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(200)
        # 1. 법 제29조 교육시간 카드(펼침)
        go(p, 'data-art', 'OSH:제29조'); p.locator(SUB + ' [data-efull]').click(); p.wait_for_timeout(250)
        C = sec(p, '교육시간')
        ok(tag + ' 제29조 과정 이름은 묶음 제목 한 번씩', C and C['edg'] == ['정기교육', '채용 시 교육', '작업내용 변경 시 교육', '특별교육'], C and C['edg'])
        ok(tag + ' 제29조 줄마다 과정 이름 반복 없음', C and '채용 시 교육 ·' not in C['t'] and '특별교육 ·' not in C['t'], C and C['t'][:200])
        ok(tag + ' 제29조 비고는 접혀 있음(2곳)', C and C['t'].count('비고') == 2 and '면제한다' not in C['t'] and p.locator(SUB + ' details.edd[open]').count() == 0, C and C['t'][-300:])
        sm = p.evaluate("[...document.querySelectorAll('%s details.edd summary')].map(x=>x.innerText.replace(/\\s+/g,' ').trim())" % SUB)
        ok(tag + ' 비고 줄 안내(5-84)', sm == ['비고 교육 면제 · 교육시간 2분의 1 이상', '비고 교육시간 2분의 1 이상'], sm)
        hs = p.evaluate("[...document.querySelectorAll('%s details.edd summary')].map(x=>Math.round(x.getBoundingClientRect().height))" % SUB)
        if w >= 390: ok(tag + ' 비고 안내 한 줄', all(h < 52 for h in hs), hs)
        p.locator(SUB + ' details.edd summary').first.click(); p.wait_for_timeout(200); C = sec(p, '교육시간')
        ok(tag + ' 비고 누르면 펼침·삭제된 호 없음', C and '면제한다' in C['t'] and '2분의 1 이상을 그 교육시간으로' in C['t'] and '삭제 <2025' not in C['t'], C and C['t'][-400:])
        ok(tag + ' 제29조는 제1호 비고 각 목을 관리감독자 비고에 다시 붙이지 않음', C and C['t'].count('상시근로자 50명 미만의 도매업') == 1, C and C['t'].count('상시근로자 50명 미만의 도매업'))
        hb = p.evaluate("document.querySelector('%s details.edd summary').getBoundingClientRect().height" % SUB)
        ok(tag + ' 비고 누르는 칸 높이 44 이상', hb >= 43.5, hb)
        p.locator(SUB + ' details.edd summary').first.click(); p.wait_for_timeout(200)
        r = row(C, '사무직 종사 근로자')
        ok(tag + ' 사무직 종사 근로자 = 매반기 6시간 이상', r and r['v'] == '매반기 6시간 이상', r)
        if w >= 390: ok(tag + ' 짧은 시간은 대상 오른쪽 한 줄', r and r['side'], r)
        else: ok(tag + ' 좁은 화면은 대상 아래로', r and not r['side'], r)
        r = row(C, '일용근로자 및 근로계약기간이 1주일 이하인 기간제근로자를 제외한 근로자 — 별표5 제1호라목 작업')
        ok(tag + ' 특별교육 16시간 이상 + 조건 2줄(원문 글자)', r and r['v'] == '16시간 이상' and r['st'] and r['ec'] == ['최초 작업에 종사하기 전 4시간 이상 실시하고 12시간은 3개월 이내에서 분할하여 실시 가능', '단기간 작업 또는 간헐적 작업인 경우에는 2시간 이상'], r)
        r = row(C, '특별교육')
        ok(tag + ' 관리감독자 특별교육 16시간 이상 + 조건', r and r['v'] == '16시간 이상' and len(r['ec']) == 2 and r['ec'][1] == '단기간 작업 또는 간헐적 작업인 경우에는 2시간 이상', r)
        ok(tag + ' 제29조 넘침 없음', C and not C['over'])
        if SHOT and tag in ('393크게', '320크게'): os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, 'edu2_29_' + tag + '.png'), full_page=True)
        # 1-2. 법 제16조 — 관리감독자 표만 나오는 카드: 비고를 펴면 제1호 비고 제3호 각 목도(5-84)
        go(p, 'data-art', 'OSH:제16조'); C = sec(p, '교육시간')
        ok(tag + ' 제16조 비고 접힘·안내', C and '제1호의 비고 제3호 각 목' not in C['t'] and p.evaluate("document.querySelector('%s details.edd summary').innerText.replace(/\\s+/g,' ').trim()" % SUB) == '비고 교육시간 2분의 1 이상')
        p.locator(SUB + ' details.edd summary').first.click(); p.wait_for_timeout(200); C = sec(p, '교육시간')
        ok(tag + ' 제16조 비고 펴면 제1호 비고 제3호 가·나목', C and '제1호의 비고 제3호 각 목' in C['t'] and '가. 영 별표 1 제1호에 따른 사업' in C['t'] and '나. 상시근로자 50명 미만의 도매업, 숙박 및 음식점업' in C['t'], C and C['t'][-300:])
        ok(tag + ' 제16조 넘침 없음', C and not C['over'])
        # 1-3. 법 제77조 비고 안내
        go(p, 'data-art', 'OSH:제77조')
        ok(tag + ' 제77조 비고 안내', p.evaluate("document.querySelector('%s details.edd summary').innerText.replace(/\\s+/g,' ').trim()" % SUB) == '비고 유해화학물질 안전교육')
        # 2. 법 제32조 — 긴 시간은 아래로, 문구 그대로
        go(p, 'data-art', 'OSH:제32조'); C = sec(p, '교육시간'); r = row(C, '안전관리자, 안전관리전문기관의 종사자')
        ok(tag + ' 제32조 신규·보수 문구 그대로·대상 아래', r and r['v'] == '신규교육 34시간 이상 · 보수교육 24시간 이상' and r['st'], r)
        ok(tag + ' 제32조 묶음 제목 없음', C and C['edg'] == [], C and C['edg'])
        # 3. 법 제77조 — 최초 노무제공 2시간 이상 + 조건
        go(p, 'data-art', 'OSH:제77조'); C = sec(p, '교육시간'); r = row(C, '최초 노무제공 시 교육')
        ok(tag + ' 제77조 최초 노무제공 2시간 이상 + 조건', r and r['v'] == '2시간 이상' and r['ec'] == ['단기간 작업 또는 간헐적 작업에 노무를 제공하는 경우에는 1시간 이상 실시하고, 특별교육을 실시한 경우는 면제'], r)
        # 4. 주요 의무 특별교육 — 과정 묶음
        go(p, 'data-item', 'o_edu3'); C = sec(p, '교육시간')
        ok(tag + ' 주요 의무 특별교육 묶음 제목', C and C['edg'] == ['작업내용 변경 시 교육', '특별교육'], C and C['edg'])
        ok(tag + ' 주요 의무 특별교육 비고 안내 그대로', C and '별표4 비고 3' in C['t'] and '별표4 비고 2' in C['t'])
        ok(tag + ' 주요 의무 넘침 없음', C and not C['over'])
        go(p, 'data-item', 'o_sup'); C = sec(p, '교육시간'); r = row(C, '정기교육')
        ok(tag + ' 관리감독자 주요 의무 정기교육 연간 16시간 이상', r and r['v'] == '연간 16시간 이상' and C['edg'] == [], C and C['edg'])
        # 5. 작업별 기준 크레인 특별교육 — 3줄, 묶음 제목 없음
        go(p, 'data-wk', 'crane'); C = sec(p, '특별교육')
        ok(tag + ' 작업 기준 크레인 교육시간 3줄', C and [x['v'] for x in C['rows']] == ['2시간 이상', '8시간 이상', '16시간 이상'] and C['edg'] == [], C and C['rows'])
        ok(tag + ' 작업 기준 넘침 없음', C and not C['over'])
        # 6. 별표 5 줄 화면(제14호) — 교육시간
        go(p, 'data-br', 'S5.14'); C = sec(p, '교육시간')
        ok(tag + ' 별표5 줄 교육시간 16시간 이상 + 조건', C and any(x['v'] == '16시간 이상' and len(x['ec']) == 2 for x in C['rows']), C and C['rows'])
        # 7. 별표 4 줄 화면 — 시간 크게 + 조건 작은 글씨
        go(p, 'data-br', 'S4.11'); C = sec(p, '교육시간')
        ok(tag + ' 별표4 줄 시간 크게·조건 2줄', C and [b['t'] for b in C['bval']] == ['16시간 이상'] and C['bvc'] == ['최초 작업에 종사하기 전 4시간 이상 실시하고 12시간은 3개월 이내에서 분할하여 실시 가능', '단기간 작업 또는 간헐적 작업인 경우에는 2시간 이상'], C)
        go(p, 'data-br', 'S4.1'); C = sec(p, '교육시간')
        ok(tag + ' 별표4 짧은 줄은 그대로', C and [b['t'] for b in C['bval']] == ['매반기 6시간 이상'] and C['bvc'] == [], C)
        # 8. 별표 줄 긴 기준값 — 보통 크기, 짧은 값은 그대로 크게
        go(p, 'data-br', 'SD3.9'); C = sec(p, '안전관리자의 수')
        ok(tag + ' 긴 기준값(SD3.9) 보통 크기', C and C['bval'] and C['bval'][0]['lg'] and C['bval'][0]['t'].startswith('2명 이상. 다만,'), C and C['bval'])
        go(p, 'data-br', 'SD3.8'); C = sec(p, '안전관리자의 수')
        ok(tag + ' 짧은 기준값(SD3.8) 크게 그대로', C and C['bval'] and not C['bval'][0]['lg'], C and C['bval'])
        go(p, 'data-br', 'GAM3.91'); C = sec(p, '조치기준')
        ok(tag + ' 긴 조치기준 보통 크기·넘침 없음', C and C['bval'] and C['bval'][0]['lg'] and not C['over'], C and C['bval'])
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
    br.close()
srv.shutdown()
print('전체 통과' if not fails else '실패 %d건' % len(fails))
sys.exit(1 if fails else 0)
