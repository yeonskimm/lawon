# 법ON 화면 이동 회귀 테스트 — 사용: python3 ui_test.py <파일명.html>
# 머리 띠 분야 전환·설정 창·화면 안 이동 버튼이 엉뚱한 탭으로 넘어가지 않는지, 이전/다음 카드 높이가 같은지 확인
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8765), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()

FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
URL = 'http://127.0.0.1:8765/' + FILE
fails = []
import json, re
_h = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), FILE), encoding='utf-8').read()
_D = json.loads(re.search(r'<script id="data" type="application/json">([\s\S]*?)</script>', _h).group(1).replace('<\\/', '</'))
CNT = {}
for _e in _D['arts']: CNT[_e['l']] = CNT.get(_e['l'], 0) + 1
BTN = {}
for _t in _D['bt']['tabs']: BTN[_t['law']] = BTN.get(_t['law'], 0) + 1
def subs_of(rows, mom):   # 법령 줄 목록에서 mom 바로 아래 이어지는 하위 줄들
    if mom not in rows: return None
    out = []
    for x in rows[rows.index(mom) + 1:]:
        if not x.endswith('(하위)'): break
        out.append(x)
    return out


def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond:
        fails.append(name)

def visible(p):   # 지금 보이는 화면 이름
    return p.evaluate("""()=>{ for(const id of ['vStart','vFind','vSite','vBook']){ if(!document.getElementById(id).hidden) return id; }
      const s=[...document.querySelectorAll('main>section.sub')].find(x=>!x.hidden); return s?'sub:'+document.getElementById('htitle').textContent:'none'; }""")

def tab(p, name):
    p.click('#tabbar [data-nav="%s"]' % name); p.wait_for_timeout(250)

PN = "[...document.querySelectorAll('main>section.sub:not([hidden]) .pn button')].map(x=>{const r=x.getBoundingClientRect();return [Math.round(r.top),Math.round(r.height)];})"

def s1(p):   # 법령집에서 머리 띠 분야 전환
    p.click('.pick[data-field="labor"]'); tab(p, 'book')
    p.click('#fieldsw'); p.wait_for_timeout(250)
    ok('법령집 · 머리 띠 분야 전환 → 법령집 그대로', visible(p) == 'vBook', visible(p))
    ok('법령집 · 전환 후 첫 구획이 산업안전', p.inner_text('#book .gl.top').strip().startswith('산업안전'), p.inner_text('#book .gl.top'))
    tab(p, 'book'); p.click('#fieldsw'); p.wait_for_timeout(250)
    ok('법령집 · 다시 전환 → 법령집 그대로', visible(p) == 'vBook', visible(p))
    tab(p, 'book'); p.click('#book [data-bk="GK"]'); p.wait_for_timeout(300)
    p.click('#hback'); p.wait_for_timeout(700)
    ok('법령집 · 전환 뒤 법령 열고 뒤로 → 법령집 첫 화면', visible(p) == 'vBook', visible(p))

def s2(p):   # 적용 확인에서 머리 띠 분야 전환
    p.click('.pick[data-field="labor"]'); tab(p, 'site')
    p.click('#fieldsw'); p.wait_for_timeout(250)
    ok('적용 확인 · 머리 띠 분야 전환 → 적용 확인 그대로', visible(p) == 'vSite', visible(p))
    ok('적용 확인 · 전환 후 산업안전 칸 선택됨', p.get_attribute('#tabO', 'aria-selected') == 'true')

def s3(t, v):   # 설정 창에서 주 업무 분야 변경
    def f(p):
        p.click('.pick[data-field="labor"]'); tab(p, t)
        p.click('#gear'); p.click('[data-field-set="osh"]'); p.wait_for_timeout(250)
        ok('설정 창 분야 변경(%s) → 그 화면 그대로' % t, visible(p) == v, visible(p))
    return f

def s4(p):   # 적용 확인(산업안전) '관련 조문 검색' — 법령 검색 탭에 조문 화면이 열려 있어도 검색창으로
    p.click('.pick[data-field="osh"]')
    p.fill('#q', '지게차'); p.wait_for_timeout(400)
    p.click('#results [data-art]'); p.wait_for_timeout(300)
    tab(p, 'site')
    p.click('[data-gofind]'); p.wait_for_timeout(700)
    ok("'관련 조문 검색' → 법령 검색 첫 화면(검색창)", visible(p) == 'vFind', visible(p))
    ok("'관련 조문 검색' → 검색창에 입력 커서", p.evaluate("document.activeElement&&document.activeElement.id") == 'q')
    p.fill('#q', '비계'); p.wait_for_timeout(400)   # 이어서 검색 → 조문 열기 → 뒤로(기록이 어긋나지 않는지)
    p.click('#results [data-art]'); p.wait_for_timeout(300)
    ok("이어서 검색한 조문 열림", visible(p).startswith('sub:'), visible(p))
    p.go_back(); p.wait_for_timeout(600)   # 휴대폰 뒤로 스와이프
    ok("휴대폰 뒤로 → 검색 결과 화면", visible(p) == 'vFind' and p.input_value('#q') == '비계', visible(p))

def s5(p):   # 법령 검색 '적용 확인에서 전체 보기' — 적용 확인 탭에 상세 화면이 열려 있어도 전체 목록으로
    p.click('.pick[data-field="osh"]'); tab(p, 'site')
    p.evaluate("()=>{const s=document.getElementById('ind'); s.value='mfgHeavy'; s.dispatchEvent(new Event('change',{bubbles:true}));}")
    p.fill('#n', '60'); p.wait_for_timeout(250)
    p.click('#lists [data-item]'); p.wait_for_timeout(300)
    tab(p, 'find')
    p.click('#otog'); p.wait_for_timeout(200)
    p.click('#ofull'); p.wait_for_timeout(700)
    ok("산업안전 '적용 확인에서 전체 보기' → 적용 확인 첫 화면", visible(p) == 'vSite', visible(p))

def s6(p):   # 근로기준 카드의 '적용 확인에서 전체 보기' — 적용 확인에서 산업안전 칸을 보다 왔어도 근로기준 목록으로
    p.click('.pick[data-field="labor"]'); tab(p, 'site')
    p.click('#tabO'); p.wait_for_timeout(200)
    tab(p, 'find')
    p.click('#ltog'); p.fill('#n3', '10'); p.wait_for_timeout(250)
    p.click('#lsum [data-nav="site"]'); p.wait_for_timeout(300)
    ok("근로기준 '적용 확인에서 전체 보기' → 적용 확인", visible(p) == 'vSite', visible(p))
    ok("근로기준 '적용 확인에서 전체 보기' → 근로기준 칸 선택됨", p.get_attribute('#tabL', 'aria-selected') == 'true', p.get_attribute('#tabL', 'aria-selected'))

def s7(p):   # 탭 바꾸기는 예전처럼 보던 화면 유지
    p.click('.pick[data-field="labor"]'); tab(p, 'book')
    p.click('#book [data-bk="GK"]'); p.wait_for_timeout(300)
    tab(p, 'find'); tab(p, 'book')
    ok('탭 바꿨다 돌아오면 법령집에서 보던 화면 유지', visible(p).startswith('sub:'), visible(p))
    p.click('#hback'); p.wait_for_timeout(700)
    ok('그 화면에서 뒤로 → 법령집 첫 화면', visible(p) == 'vBook', visible(p))

def s8(p):   # 법령집: 고평법 시행규칙 자리
    p.click('.pick[data-field="labor"]'); tab(p, 'book')
    first = p.evaluate("[...document.querySelectorAll('#book .list')[0].querySelectorAll('[data-bk]')].map(x=>x.dataset.bk+(x.classList.contains('sub')?'(하위)':''))")
    print('     근로기준 구획:', first)
    ok('근로기준 구획에 고평법 시행규칙 포함', any(x.startswith('EQR') for x in first), first)
    ok('고평법 시행규칙은 고평법 아래 하위 줄(시행령 다음)', subs_of(first, 'EQ') == ['EQD(하위)', 'EQR(하위)'], first)
    tab(p, 'book'); p.click('#fieldsw'); p.wait_for_timeout(250)
    other = p.evaluate("[...document.querySelectorAll('#book .list')].pop().querySelectorAll('[data-bk]').length")
    labs = p.evaluate("[...[...document.querySelectorAll('#book .list')].pop().querySelectorAll('[data-bk]')].map(x=>x.dataset.bk+(x.classList.contains('sub')?'(하위)':''))")
    print('     산업안전일 때 그 밖의 법령:', labs)
    ok('산업안전일 때 그 밖의 법령에서도 고평법 아래 하위 줄(시행령 다음)', subs_of(labs, 'EQ') == ['EQD(하위)', 'EQR(하위)'], labs)
    ok('산업안전 구획 순서: 안전보건규칙 → 취업제한규칙', (lambda o: 'RULE' in o and 'LIC(하위)' not in o and o.index('RULE') < o.index('LIC'))(p.evaluate("[...document.querySelectorAll('#book .list')[0].querySelectorAll('[data-bk]')].map(x=>x.dataset.bk)")))

def s9(p):   # 이전 조/다음 조 카드
    p.click('.pick[data-field="labor"]')
    p.fill('#q', '파견기간'); p.wait_for_timeout(400)
    p.click('#results [data-art="DISP:제6조"]'); p.wait_for_timeout(300)   # 사용자 화면과 같은 파견법 제6조
    bx = p.evaluate(PN)
    ok('이전 조·다음 조 카드 2개', len(bx) == 2, bx)
    ok('이전 조·다음 조 카드 위치·높이 같음', len(bx) == 2 and bx[0] == bx[1], bx)
    el = p.query_selector('main>section.sub:not([hidden]) .pn'); el.scroll_into_view_if_needed(); p.wait_for_timeout(150)
    el.screenshot(path='pn_%s.png' % FILE.replace('.html', ''))
    tab(p, 'find'); p.fill('#q', '톨루엔'); p.wait_for_timeout(400)
    p.click('#results [data-br]'); p.wait_for_timeout(300)
    p.click('main>section.sub:not([hidden]) .pn button:last-child'); p.wait_for_timeout(300)
    bx2 = p.evaluate(PN)
    ok('별표 이전·다음 카드 위치·높이 같음', len(bx2) == 2 and bx2[0] == bx2[1], bx2)

def s10(p):   # 법령 검색: 시행령·시행규칙 이름(2026-09-24 보완)
    p.click('.pick[data-field="labor"]')
    p.fill('#q', '고평법 시행규칙'); p.wait_for_timeout(450)
    n = p.evaluate("document.querySelectorAll('#results [data-art^=\"EQR:\"]').length")
    ok("'고평법 시행규칙' 검색 → 시행규칙 조문 전부(%d개)" % CNT['EQR'], n == CNT['EQR'], n)
    ok("'고평법 시행규칙' 검색 → 별표1 한 줄", p.evaluate("document.querySelectorAll('#results [data-bt=\"ER1\"]').length") == 1)
    p.fill('#q', '근로기준법 시행령'); p.wait_for_timeout(450)
    ok("'근로기준법 시행령' 검색 → 결과 없음 대신 시행령 별표1", p.evaluate("!!document.querySelector('#results [data-bt=\"GD1\"]')&&!document.querySelector('#results .note.empty')"))
    p.fill('#q', '고평법 시행규칙, 성희롱, 없는말'); p.wait_for_timeout(450)
    chips = p.evaluate("[...document.querySelectorAll('#results .andfb [data-q]')].map(x=>x.dataset.q)")
    ok('결과 없을 때 검색어별 칩도 시행규칙 조건 유지', chips and all(c.startswith('고평법시행규칙 ') for c in chips), chips)
    p.click('#qx'); p.wait_for_timeout(200)
    tab(p, 'site'); p.click('#fieldsw'); p.wait_for_timeout(250); tab(p, 'find')
    p.fill('#q', '중처법 시행령 열사병'); p.wait_for_timeout(450)
    ok("'중처법 시행령 열사병' 검색 → 중처법 시행령 별표1 줄", p.evaluate("!!document.querySelector('#results [data-br^=\"ZD1\"]')"))
    p.click('#results [data-br^="ZD1"]'); p.wait_for_timeout(300)
    ok('그 줄을 누르면 별표 상세', visible(p).startswith('sub:'), visible(p))

def s11(p):   # 법령집: 고평법 시행규칙 별표1 중복 정리 — 2026-09-25 개편 후 경로(법령 줄 → '별표' 탭)
    p.click('.pick[data-field="labor"]'); tab(p, 'book')
    t = p.inner_text('#book [data-bk="EQR"]')
    ok('법령집 줄: 고평법 시행규칙 별표 수 = 수록 별표 수(중복 없음)', ('별표 %d' % BTN['EQR']) in t.replace('\n', ' '), t)
    p.click('#book [data-bk="EQR"]'); p.wait_for_timeout(300)
    p.click('main>section.sub:not([hidden]) [data-bktab="bt"]'); p.wait_for_timeout(300)
    ids = p.evaluate("[...document.querySelectorAll('main>section.sub:not([hidden]) [data-bt]')].map(x=>x.dataset.bt)")
    ok('고평법 시행규칙 별표 탭: 별표1(ER1) 한 줄 · 중복 없음', ids.count('ER1') == 1 and len(ids) == len(set(ids)), ids)
    p.click('main>section.sub:not([hidden]) [data-bt="ER1"]'); p.wait_for_timeout(300)
    basis = p.evaluate("[...document.querySelectorAll('main>section.sub:not([hidden]) [data-art]')].map(x=>x.dataset.art)")
    ok('별표1 근거 조문에 고평법 시행규칙 제2조', 'EQR:제2조' in basis, basis)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for name, fn, dark in [('1', s1, False), ('2', s2, False), ('3a', s3('book', 'vBook'), False), ('3b', s3('site', 'vSite'), False),
                           ('4', s4, False), ('5', s5, False), ('6', s6, False), ('7', s7, False), ('8', s8, False), ('9', s9, True), ('10', s10, False), ('11', s11, False)]:
        c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, service_workers='block', color_scheme='dark' if dark else 'light')
        p = c.new_page(); errs = []
        p.on('pageerror', lambda e: errs.append(str(e)))
        try:
            p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
            if dark:
                p.click('#gear'); p.click('[data-theme-set="auto"]'); p.click('#sheet [data-close]:not(.shbg)')
            fn(p)
        except Exception as ex:
            ok('시나리오 %s 진행' % name, False, str(ex).split('\n')[0])
        ok('시나리오 %s 스크립트 오류 없음' % name, not errs, errs)
        c.close()
    br.close()

print('실패 %d건' % len(fails) if fails else '전체 통과')
sys.exit(1 if fails else 0)
