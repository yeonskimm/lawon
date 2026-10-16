# 법ON 안전보건규칙 → 법 제38조·제39조 항·호 연결 화면 검사(2026-10-16) — 사용: python3 claude_rulevia_ui_test.py <tests 기준 파일명.html>
# 확인: 조문 상세 '근거 법조' 카드 문구(항·호·안내), 벌칙 칸 위반 문구, 조문별 연결·제재 없음·편 기본값 조문은 그대로, 목록 줄 제재 표시, 가로 넘침, 스크립트 오류
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8769), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8769/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
SEC = 'main>section.sub:not([hidden])'
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
def go(p, q, art):
    p.fill('#q', q); p.keyboard.press('Enter'); p.wait_for_timeout(700)
    row = p.evaluate("(a)=>{const x=document.querySelector('#results [data-art=\"'+a+'\"]'); if(!x)return null; const r=x.querySelector('.r3'); return r?r.innerText.replace(/\\s+/g,' ').trim():''}", art)
    p.evaluate("(a)=>{const x=document.querySelector('#results [data-art=\"'+a+'\"]'); x.click();}", art); p.wait_for_timeout(700)
    return row
def heads(p): return p.evaluate("(s)=>[...document.querySelectorAll(s+' h3.gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())", SEC)
def card_after(p, head):   # 제목(h3.gl) 바로 다음 카드의 글
    return p.evaluate("([s,h])=>{const hs=[...document.querySelectorAll(s+' h3.gl')]; const x=hs.find(e=>e.textContent.replace(/\\s+/g,' ').trim().startsWith(h)); return x&&x.nextElementSibling?x.nextElementSibling.innerText.replace(/\\s+/g,' ').trim():null;}", [SEC, head])
def wide(p): return p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
def back(p): p.click('#hback'); p.wait_for_timeout(400)
def run(w, big):
    tag = '%dpx%s' % (w, ' 크게' if big else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': 800})
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1200)
        if big: p.evaluate("()=>{document.documentElement.classList.add('big');document.documentElement.style.fontSize='19px';}")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        # 1) 규칙 제42조(추락) → 제38조제3항제1호
        row = go(p, '추락', 'RULE:제42조')
        ok(tag + ' 목록 줄 제재 표시(벌칙 제168조제1호) 그대로', row is not None and '벌칙' in row and '제168조제1호' in row, row)
        v = card_after(p, '근거 법조')
        ok(tag + ' 제42조 근거 법조 항·호', v is not None and '제38조제3항제1호(추락 위험 장소)' in v, v)
        ok(tag + ' 제42조 안내 문구', v is not None and '편·장 기준 연결' in v, v)
        ok(tag + ' 제42조 법 조문 보기 버튼', v is not None and '산업안전보건법 제38조 안전조치 조문 보기' in v, v)
        pen = card_after(p, '벌칙')
        ok(tag + ' 제42조 벌칙 위반 문구에 항·호', pen is not None and '제38조제3항제1호 위반' in pen and '제168조제1호' in pen, pen)
        ok(tag + ' 제42조 사망 벌칙·근로자 과태료 그대로', pen is not None and '제167조제1항' in pen and (card_after(p, '과태료') or '').find('제175조제6항제3호') >= 0, pen)
        ok(tag + ' 가로 넘침 없음(제42조)', not wide(p))
        back(p)
        # 2) 규칙 제338조(굴착) → 제2항·제3항제2호 + 선택 안내
        go(p, '굴착', 'RULE:제338조'); v = card_after(p, '근거 법조'); pen = card_after(p, '벌칙')
        ok(tag + ' 제338조 두 항·호', v is not None and '제38조제2항(굴착 작업방법)·제3항제2호(붕괴 위험 장소)' in v, v)
        ok(tag + ' 제338조 선택 안내', v is not None and '작업방법 위반은 제2항, 붕괴 위험 장소의 조치는 제3항제2호' in v, v)
        ok(tag + ' 제338조 벌칙 위반 문구', pen is not None and '제38조제2항·제3항제2호 위반' in pen, pen)
        ok(tag + ' 가로 넘침 없음(제338조)', not wide(p)); back(p)
        # 3) 규칙 제562조(폭염) → 제39조제1항제2호·제7호
        go(p, '폭염', 'RULE:제562조'); v = card_after(p, '근거 법조'); pen = card_after(p, '벌칙')
        ok(tag + ' 제562조 제2호·제7호', v is not None and '제39조제1항제2호(고열·한랭)·제7호(폭염·한파에 의한 건강장해)' in v, v)
        ok(tag + ' 제562조 벌칙 위반 문구', pen is not None and '제39조제1항제2호·제7호 위반' in pen, pen); back(p)
        # 4) 규칙 제80조(의자) → 제39조제1항(호 미지정)
        go(p, '의자', 'RULE:제80조'); v = card_after(p, '근거 법조'); pen = card_after(p, '벌칙')
        ok(tag + ' 제80조 호 미지정', v is not None and '제39조제1항(보건조치 — 호는 조문 내용에 따라)' in v, v)
        ok(tag + ' 제80조 벌칙 위반 문구', pen is not None and '제39조제1항 위반' in pen, pen); back(p)
        # 5) 규칙 제4조(청결) → 편 기본값 그대로
        go(p, '청결', 'RULE:제4조'); v = card_after(p, '근거 법조'); pen = card_after(p, '벌칙')
        ok(tag + ' 제4조 편 기본값', v is not None and '제38조 또는 제39조(조문별 상이)' in v, v)
        ok(tag + ' 제4조 벌칙 문구 그대로', pen is not None and '제38조·제39조 위반에 해당하는 경우' in pen, pen); back(p)
        # 6) 규칙 제35조(관리감독자) → 조문별 연결 제16조 그대로
        go(p, '관리감독자 업무', 'RULE:제35조'); v = card_after(p, '근거 법조'); f = card_after(p, '과태료')
        ok(tag + ' 제35조 조문별 연결 그대로', v is not None and '제16조제1항(관리감독자)' in v, v)
        ok(tag + ' 제35조 과태료 금액 그대로', f is not None and '제175조제5항제1호' in f and '만원' in f, f); back(p)
        # 7) 규칙 제179조(지게차 전조등) → 제38조제1항제1호
        go(p, '지게차', 'RULE:제179조'); v = card_after(p, '근거 법조')
        ok(tag + ' 제179조 기계·설비', v is not None and '제38조제1항제1호(기계·기구·설비에 의한 위험)' in v, v); back(p)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, big in [(390, False), (320, True), (430, False)]:
    run(w, big)
print('실패 %d건' % len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
