# 법ON 작업별 기준 화면 검사(2026-10-17) — 사용: python3 claude_work_ui_test.py <tests 기준 파일명.html>
# 확인: 산업안전 검색 첫 화면 '작업별 기준' 칩(자주 찾는 말 대체, 근로기준은 그대로), 검색 결과 맨 위 작업 기준 카드(법령 칩을 고르면 없음),
#       작업 기준 화면(제목·묶음·근거 줄·발췌·교육시간), 조문 화면 '작업 기준' 링크(하나면 바로, 여럿이면 아래 창), 창 닫힘·뒤로, 조문 번호 간격, 가로 넘침, 스크립트 오류
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8774), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8774/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
SEC = 'main>section.sub:not([hidden])'
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def txt(p, sel): return p.evaluate("(s)=>{const x=document.querySelector(s); return x?x.innerText.replace(/\\s+/g,' ').trim():null}", sel)
def heads(p): return p.evaluate("(s)=>[...document.querySelectorAll(s+' h3.gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())", SEC)
def search(p, q):
    p.fill('#q', q); p.keyboard.press('Enter'); p.wait_for_timeout(700)
def clr(p):
    p.fill('#q', ''); p.wait_for_timeout(300)
def run(w, big):
    tag = '%dpx%s' % (w, ' 크게' if big else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800})
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1200)
        if big: p.evaluate("()=>{document.documentElement.setAttribute('data-fs','l');}")
        # 1) 근로기준 첫 화면: 자주 찾는 말 그대로, 작업별 기준 없음
        p.click('.pick[data-field="labor"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        q = txt(p, '#quick')
        ok(tag + ' 근로기준 첫 화면 자주 찾는 말 유지', q is not None and '자주 찾는 말' in q and '작업별 기준' not in q, q)
        p.click('#hhome' if p.query_selector('#hhome') else '[data-home]'); p.wait_for_timeout(400)
        # 2) 산업안전 첫 화면: 작업별 기준 칩 10개, 자주 찾는 말 없음
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300); p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        q = txt(p, '#quick'); n = p.evaluate("()=>document.querySelectorAll('#quick .chip.wchip[data-wk]').length")
        ok(tag + ' 산업안전 첫 화면 작업별 기준 칩 10개', n == 10, n)
        ok(tag + ' 산업안전 첫 화면 자주 찾는 말 없음', q is not None and '자주 찾는 말' not in q, q)
        ok(tag + ' 첫 화면 가로 넘침 없음', not wide(p))
        p.click('#quick [data-wk="scaffold"]'); p.wait_for_timeout(700)
        ok(tag + ' 칩 → 비계 작업 기준 화면', txt(p, '#htitle') == '비계 작업 기준', txt(p, '#htitle'))
        hs = heads(p)
        ok(tag + ' 비계 묶음(비계·관리감독자 업무·특별교육·작업 자격)', [h.split(' ')[0] for h in hs][:1] == ['비계'] and any(h.startswith('관리감독자 업무') for h in hs) and any(h.startswith('특별교육') for h in hs) and any(h.startswith('작업 자격') for h in hs), hs)
        p.click('#hback'); p.wait_for_timeout(400)
        # 3) 검색 결과 카드
        search(p, '지게차')
        c = txt(p, '#results .wcard')
        ok(tag + ' 지게차 검색 → 맨 위 작업 기준 카드', c is not None and c.startswith('지게차 작업 기준') and '조문 22개' in c, c)
        ok(tag + ' 카드에 용어 안내 합침(별도 안내 카드 없음)', c is not None and '차량계 하역운반기계 조문도 함께 검색' in c and p.query_selector('#results .snote') is None, c)
        first = p.evaluate("()=>{const r=document.querySelector('#results').firstElementChild; return r?r.className:''}")
        ok(tag + ' 카드가 결과 맨 위', 'wcard' in first, first)
        gap = p.evaluate("()=>{const r=document.querySelector('#results [data-art] .r1.ac'); if(!r)return null; const n=r.querySelector('.no').getBoundingClientRect(), t=r.querySelector('.ttl').getBoundingClientRect(); return t.left-n.right;}")
        ok(tag + ' 조문 번호와 제목 간격 좁음(1em 미만)', gap is not None and gap < (19 if big else 16), gap)
        ok(tag + ' 검색 결과 가로 넘침 없음', not wide(p))
        p.click('#results .chips.fl [data-law="RULE"]'); p.wait_for_timeout(500)
        ok(tag + ' 법령 칩 고르면 작업 기준 카드 없음', p.query_selector('#results .wcard') is None)
        clr(p); search(p, '아시바')
        ok(tag + ' 아시바 → 비계 작업 기준 카드', (txt(p, '#results .wcard') or '').startswith('비계 작업 기준'), txt(p, '#results .wcard'))
        clr(p); search(p, '휴게시간')
        ok(tag + ' 휴게시간 → 카드 없음', p.query_selector('#results .wcard') is None)
        clr(p); search(p, '지게차')
        p.click('#results .wcard'); p.wait_for_timeout(700)
        # 4) 지게차 작업 기준 화면
        ok(tag + ' 카드 → 지게차 작업 기준', txt(p, '#htitle') == '지게차 작업 기준', txt(p, '#htitle'))
        hs = heads(p)
        need = ['지게차', '운행·작업', '작업계획서·작업지휘자', '작업시작 전 점검', '특별교육', '운전 자격', '방호조치·대여']
        ok(tag + ' 지게차 묶음 7개 순서', [h.split(' 안전보건규칙')[0].split(' 차량계')[0] for h in hs] == need, hs)
        body = txt(p, SEC)
        ok(tag + ' 근거 줄(산안법 제38조제1항제1호·벌칙 제168조제1호)', '근거 산안법 제38조제1항제1호' in body and '제168조제1호' in body)
        ok(tag + ' 작업계획서 발췌(제38조제1항제2호·별표 4 제2호)', '차량계 하역운반기계등을 사용하는 작업(화물자동차를 사용하는 도로상의 주행작업은 제외한다' in body and '안전보건규칙 별표 4 제2호' in body)
        ok(tag + ' 작업시작 전 점검(별표 3 제9호, 과태료 300·400·500만원)', '안전보건규칙 별표 3 제9호' in body and '300·400·500만원' in body)
        ok(tag + ' 특별교육(별표 5 제1호라목 제13호·교육시간)', '산안법 시행규칙 별표 5 제1호라목 제13호' in body and '단기간 작업 또는 간헐적 작업인 경우에는 2시간 이상' in body)
        ok(tag + ' 운전 자격(취업제한규칙 별표 1 제4호·제4호의2)', '취업제한규칙 별표 1 제4호' in body and '제4호의2' in body)
        ok(tag + ' 방호조치(시행규칙 제98조제1항제5호)', '헤드 가드, 백레스트(backrest), 전조등, 후미등, 안전벨트' in body)
        ok(tag + ' 하단 고지 표시', p.evaluate("()=>!document.getElementById('foot').hidden"))
        ok(tag + ' 작업 기준 화면 가로 넘침 없음', not wide(p))
        # 5) 발췌 누르기 → 별표 줄 화면
        p.click(SEC + ' .wq[data-br="R3.9"]'); p.wait_for_timeout(600)
        ok(tag + ' 별표 3 제9호 발췌 → 별표 화면', '별표' in (txt(p, '#htitle') or ''), txt(p, '#htitle'))
        p.click('#hback'); p.wait_for_timeout(400)
        # 6) 조문 → 작업 기준(하나)
        p.click(SEC + ' [data-art="RULE:제183조"]'); p.wait_for_timeout(600)
        l = txt(p, SEC + ' h3.gl .xrl[data-wk]')
        ok(tag + ' 제183조 조문 줄 "작업 기준 · 지게차"', l == '작업 기준 · 지게차', l)
        gl = p.evaluate("(s)=>{const g=[...document.querySelectorAll(s+' h3.gl')].find(x=>x.textContent.trim().startsWith('조문')); const r=g.getBoundingClientRect(), L=[...g.querySelectorAll('.xrl')].map(x=>x.getBoundingClientRect()); return [r.height, L.every(x=>x.right<=window.innerWidth&&x.left>=0&&x.height<50)];}", SEC)
        ok(tag + ' 조문 제목 줄 한 줄·넘침 없음', gl[0] < 60 and gl[1], gl)
        p.click(SEC + ' h3.gl .xrl[data-wk]'); p.wait_for_timeout(600)
        ok(tag + ' 링크 → 지게차 작업 기준', txt(p, '#htitle') == '지게차 작업 기준', txt(p, '#htitle'))
        # 7) 조문 → 작업 기준 여럿(제35조) → 아래 창
        p.click(SEC + ' [data-art="RULE:제35조"]'); p.wait_for_timeout(600)
        l = txt(p, SEC + ' h3.gl .xrl[data-wks]')
        ok(tag + ' 제35조 "작업 기준 10"', l == '작업 기준 10', l)
        gl = p.evaluate("(s)=>{const g=[...document.querySelectorAll(s+' h3.gl')].find(x=>x.textContent.trim().startsWith('조문')); const r=g.getBoundingClientRect(), L=[...g.querySelectorAll('.xrl')].map(x=>x.getBoundingClientRect()); return [r.height, L.every(x=>x.right<=window.innerWidth&&x.left>=0&&x.height<50)];}", SEC)
        ok(tag + ' 제35조 조문 제목 줄(인용 조문과 함께) 한 줄·넘침 없음', gl[0] < 60 and gl[1], gl)
        p.click(SEC + ' h3.gl .xrl[data-wks]'); p.wait_for_timeout(500)
        ok(tag + ' 아래 창 제목 "작업 기준 10건"', txt(p, '#xsheetT') == '작업 기준 10건', txt(p, '#xsheetT'))
        rows = p.evaluate("()=>[...document.querySelectorAll('#xlist [data-wk]')].map(x=>x.innerText.replace(/\\s+/g,' ').trim())")
        ok(tag + ' 창 목록 10줄·항 표시', len(rows) == 10 and rows[0].startswith('제2항 지게차') and any(r.startswith('제1항·제2항 크레인·양중기') for r in rows), rows[:3])
        ok(tag + ' 창 안내 줄 숨김', p.evaluate("()=>document.getElementById('xhint').hidden"))
        p.click('#xlist [data-wk="excav"]'); p.wait_for_timeout(700)
        ok(tag + ' 창 줄 → 굴착 작업 기준·창 닫힘', txt(p, '#htitle') == '굴착 작업 기준' and p.evaluate("()=>document.getElementById('xsheet').hidden"), txt(p, '#htitle'))
        body = txt(p, SEC)
        ok(tag + ' 굴착 작업계획서 제3호·제6호 발췌', '3. 차량계 건설기계를 사용하는 작업' in body and '6. 굴착면의 높이가 2미터 이상이 되는 지반의 굴착작업' in body)
        ok(tag + ' 굴착 관련 별표(굴착면 기울기·차량계 건설기계)', '굴착면의 기울기 기준' in body and '차량계 건설기계' in body)
        # 8) 인용 조문 창은 안내 줄 다시 보임
        p.click('#hback'); p.wait_for_timeout(400)
        x = p.query_selector(SEC + ' h3.gl .xrl[data-xr]')
        if x:
            x.click(); p.wait_for_timeout(400)
            ok(tag + ' 인용 조문 창 안내 줄 보임', not p.evaluate("()=>document.getElementById('xhint').hidden") and (txt(p, '#xsheetT') or '').startswith('인용 조문'))
            p.click('#xsheet [data-xclose]'); p.wait_for_timeout(300)
        # 9) 크레인: 특별교육 제39호(신호) 있으면 일용 8시간 줄
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        clr(p); search(p, '타워크레인'); p.click('#results .wcard'); p.wait_for_timeout(700)
        body = txt(p, SEC)
        ok(tag + ' 크레인 교육시간에 제39호 8시간 줄', '라목제39호 작업' in body and '8시간 이상' in body)
        ok(tag + ' 크레인 안전검사(시행령 제78조 크레인 2톤 미만 제외)', '3. 크레인(정격 하중이 2톤 미만인 것은 제외한다)' in body)
        ok(tag + ' 크레인 화면 가로 넘침 없음', not wide(p))
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, big in [(390, False), (320, True), (430, False)]:
    run(w, big)
srv.shutdown()
print('실패 %d건' % len(fails) if fails else '전체 통과')
sys.exit(1 if fails else 0)
