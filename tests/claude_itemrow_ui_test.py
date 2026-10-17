# 법ON 검색 결과 주요 의무 줄 검사(2026-10-17) — 사용: python3 claude_itemrow_ui_test.py <tests 기준 파일명.html>
# 확인: 주요 의무를 근거 조문 줄 바로 아래 한 줄로(같은 조문 중복 없음), 조문 제재가 여럿이면 이 의무의 제재 조항만 표시, 적용 판단 표시,
#       모법 조문이 결과에 없으면 시행령·시행규칙 줄 아래, 근거 조문이 결과에 없는 주요 의무만 조문 뒤 따로(법령 이름만 검색은 5건 넘으면 접힘),
#       줄을 누르면 주요 의무 상세, 산업안전 조건 카드 접힌 줄에 일부 입력값 표시, 가로 넘침·스크립트 오류
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8775), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8775/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def txt(p, sel): return p.evaluate("(s)=>{const x=document.querySelector(s); return x?x.innerText.replace(/\\s+/g,' ').trim():null}", sel)
def search(p, q):
    p.fill('#q', q); p.keyboard.press('Enter'); p.wait_for_timeout(700)
# 조문 줄 바로 다음 형제들 중 주요 의무 줄(.itr)의 data-item 목록
AFTER = """(k)=>{ const a=document.querySelector('#results [data-art="'+k+'"]'); if(!a)return null; const L=[]; let x=a.nextElementSibling;
  while(x&&x.classList.contains('subr')){ if(x.classList.contains('itr'))L.push(x.getAttribute('data-item')); x=x.nextElementSibling; } return L; }"""
def run(w, big):
    tag = '%dpx%s' % (w, ' 크게' if big else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800})
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1200)
        if big: p.evaluate("()=>{document.documentElement.setAttribute('data-fs','l');}")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        search(p, '안전교육')
        # 1) 인원만 입력하고 접으면 접힌 줄에 입력값
        p.click('#otog'); p.wait_for_timeout(300); p.fill('#n4', '4'); p.wait_for_timeout(500); p.click('#otog'); p.wait_for_timeout(300)
        t = txt(p, '#ot')
        ok(tag + ' 조건 카드 접힌 줄: 업종 미선택 · 상시 4명', t is not None and '업종 미선택' in t and '상시 4명' in t and '입력하면' not in t, t)
        # 2) 주요 의무 구획 없이 제29조 줄 아래 두 의무
        hs = p.evaluate("()=>[...document.querySelectorAll('#results .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())")
        ok(tag + ' 결과 맨 위 주요 의무 구획 없음', not any('주요 의무' in h for h in hs), hs)
        L = p.evaluate(AFTER, 'OSH:제29조')
        ok(tag + ' 제29조 줄 아래 정기교육·특별교육 두 줄', L == ['o_edu', 'o_edu3'], L)
        n29 = p.evaluate("()=>document.querySelectorAll('#results [data-item=\"o_edu\"]').length")
        ok(tag + ' 같은 주요 의무 한 번만', n29 == 1, n29)
        it = txt(p, '#results .itr[data-item="o_edu"]')
        ok(tag + ' 정기교육 줄: 이 의무의 제재 조항·적용 제외', it is not None and '과태료 제175조제5항제1호' in it and '제175조제2항제1호' not in it and '적용 제외' in it, it)
        it3 = txt(p, '#results .itr[data-item="o_edu3"]')
        ok(tag + ' 특별교육 줄: 제175조제2항제1호·추가 확인', it3 is not None and '제175조제2항제1호' in it3 and '추가 확인' in it3, it3)
        pos = p.evaluate("()=>{const a=[...document.querySelectorAll('#results [data-art],#results [data-item]')]; return a.findIndex(x=>x.getAttribute('data-art')==='OSH:제29조');}")
        ok(tag + ' 제29조가 결과 첫 줄', pos == 0, pos)
        ok(tag + ' 가로 넘침 없음(안전교육)', not wide(p))
        # 3) 줄을 누르면 주요 의무 상세
        p.click('#results .itr[data-item="o_edu3"]'); p.wait_for_timeout(600)
        ht = txt(p, '#htitle') or ''; body = txt(p, 'main>section.sub:not([hidden])') or ''
        ok(tag + ' 주요 의무 줄 → 상세', '특별교육' in ht or '특별교육(유해·위험 작업)' in body, ht)
        p.click('#hback'); p.wait_for_timeout(400)
        # 4) 모법이 결과에 없으면 시행규칙 줄 아래
        p.fill('#q', ''); p.wait_for_timeout(200); search(p, '교육시간')
        L2 = p.evaluate(AFTER, 'SR:제26조')
        ok(tag + ' 교육시간 → 시행규칙 제26조 줄 아래 정기교육', L2 is not None and 'o_edu' in L2, L2)
        # 5) 근거 조문이 결과 밖이면 조문 뒤 따로(법령 이름만 → 5건 넘으면 접힘)
        p.fill('#q', ''); p.wait_for_timeout(200); search(p, '산안법')
        hs2 = p.evaluate("()=>[...document.querySelectorAll('#results .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())")
        i_a = next((i for i, h in enumerate(hs2) if '조문' in h), -1); i_i = next((i for i, h in enumerate(hs2) if '주요 의무' in h), -1)
        ok(tag + ' 산안법 → 결과 밖 주요 의무는 조문 뒤 구획', i_a >= 0 and i_i > i_a, hs2)
        fo = p.evaluate("()=>{const x=[...document.querySelectorAll('#results .gl.fold')].find(b=>/주요 의무/.test(b.textContent)); if(!x)return null; const m=/(\\d+)건/.exec(x.textContent); return [+m[1], x.getAttribute('aria-expanded')];}")
        ok(tag + ' 산안법 → 결과 밖 주요 의무 5건 넘으면 접힘', fo is not None and (fo[1] == 'false') == (fo[0] > 5), fo)
        itn = p.evaluate("()=>document.querySelectorAll('#results .itr').length")
        ok(tag + ' 산안법 → 결과 안 조문에는 주요 의무 줄', itn > 0, itn)
        ok(tag + ' 가로 넘침 없음(산안법)', not wide(p))
        # 6) 근로기준 분야
        p.click('#hhome' if p.query_selector('#hhome') else '[data-home]'); p.wait_for_timeout(400)
        p.click('.pick[data-field="labor"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        p.fill('#q', ''); search(p, '육아휴직')
        L3 = p.evaluate(AFTER, 'EQ:제19조')
        ok(tag + ' 육아휴직 → 고평법 제19조 줄 아래 육아휴직 의무', L3 == ['l_cl'], L3)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, big in [(390, False), (320, True), (430, False)]:
    run(w, big)
print('실패 %d건' % len(fails) if fails else '전체 통과'); srv.shutdown(); sys.exit(1 if fails else 0)
