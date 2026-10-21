# 법ON 수사 법령 수록(2026-10-21, 5-52) 화면 검사
# 사용: python3 claude_sasu_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8782)
# 법령집 4줄(협력규칙은 협력규정 하위 줄)·수사준칙 준용 카드·목록 표시·하단 고지(절차 규정은 현행)·개정 예정 제목 변경·
# 협력규칙 서식 원문(PDF) 링크·창·법령집 서식 탭·집무규정 옛 수사준칙 인용 → 새 조문·그 밖의 수사 법령 조문(접힘)·넘침
import sys, os, threading, functools, http.server, socketserver
# 2026-10-22(5-53): 화면의 '개정 예정'·'시행 예정' 표시는 오늘 날짜로 바뀜 → 이 검사를 만든 날로 시계를 고정(12. 8. 이후 거짓 실패 방지)
FIX = """(()=>{const T=new Date('%sT10:00:00').getTime(); const R=Date; class F extends R{constructor(...a){ if(a.length) super(...a); else super(T);} static now(){return T;}} window.Date=F; })();"""
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8782), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8782/' + FILE
SUB = 'main>section.sub:not([hidden])'
ACT = '국가법령정보센터에서 위반행위 당시 시행 법령을 확인하시기 바랍니다.'
NOW = '국가법령정보센터에서 현행 법령을 확인하시기 바랍니다.'
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)[:300]))
    if not cond: fails.append(name)
def shot(p, n, full=False):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'), full_page=full)
def heads(p): return p.evaluate("[...document.querySelectorAll('%s .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())" % SUB)
def subtext(p): return p.evaluate("(document.querySelector('%s')||{innerText:''}).innerText" % SUB)
def foot(p): return p.evaluate("document.getElementById('foot').hidden?null:document.getElementById('footm').textContent")
def over(p): return p.evaluate('document.scrollingElement.scrollWidth>innerWidth+0.5')
def find(p, q):
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150)
    if not p.is_visible('#q'): p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200)   # 다른 탭에서 오면 쌓인 화면 → 한 번 더 눌러 검색 첫 화면
    p.fill('#q', q); p.wait_for_timeout(700)
def art(p, q, key):   # 접힌 구획 안이면 펼친 뒤 누름
    find(p, q)
    p.evaluate("(k=>{[...document.querySelectorAll('#results [data-fold][aria-expanded=\"false\"]')].forEach(b=>{const bd=b.nextElementSibling; if(bd&&bd.querySelector('[data-art=\"'+k+'\"]'))b.click();});})", key)
    p.wait_for_timeout(150); p.locator('#results [data-art="%s"]' % key).first.click(); p.wait_for_timeout(450); p.evaluate('scrollTo(0,0)')
def scroll_to(p, txt):
    p.evaluate("(t=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.textContent.includes(t)); if(g)scrollTo(0,g.getBoundingClientRect().top+scrollY-70)})" % SUB, txt)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(390, False, False, '390'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, service_workers='block')
        c.add_init_script(FIX % '2026-10-21')
        errs = []
        p = c.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
        if big: p.evaluate("document.documentElement.dataset.fs='l'")
        if dark: p.evaluate("document.documentElement.dataset.theme='dark'")
        for fld in ('labor', 'osh'):
            if fld == 'labor':
                p.click('.pick[data-field="labor"]'); p.wait_for_timeout(250)
            else:
                p.click('#gear'); p.wait_for_timeout(300); p.click('[data-field-set="osh"]'); p.wait_for_timeout(500)
            # ── 법령집: 직무집행법 다음 4줄, 협력규칙은 하위 줄 ──
            p.click('#tabbar [data-nav="book"]'); p.wait_for_timeout(350)
            rows = p.evaluate("[...document.querySelectorAll('#book .brow[data-bk]')].map(b=>({k:b.dataset.bk,sub:b.classList.contains('sub'),t:b.innerText.replace(/\\s+/g,' ')}))")
            ks = [r['k'] for r in rows]
            if 'LIO' in ks:
                i = ks.index('LIO')
                ok(tag + ' ' + fld + ' 법령집: 직무집행법 다음 사법경찰직무법·협력규정·협력규칙·수사준칙', ks[i + 1:i + 5] == ['JPA', 'SPC', 'SPCR', 'ICR'], ks[i:i + 6])
                sub = {r['k']: r['sub'] for r in rows}
                ok(tag + ' ' + fld + ' 협력규칙만 하위 줄', sub.get('SPCR') and not sub.get('SPC') and not sub.get('JPA') and not sub.get('ICR'), sub)
                tx = {r['k']: r['t'] for r in rows}
                ok(tag + ' ' + fld + ' 줄 표기(판·조문 수)', '법률 제21995호' in tx.get('JPA', '') and '조문 13' in tx.get('JPA', '') and '조문 88' in tx.get('SPCR', '') and '법무부령 제1170호' in tx.get('SPCR', ''), tx.get('SPCR'))
            else:
                ok(tag + ' ' + fld + ' 법령집에 직무집행법', False, ks)
            ok(tag + ' ' + fld + ' 법령집 넘침 없음', not over(p))
            if fld == 'labor':
                p.evaluate("(()=>{const b=document.querySelector('#book .brow[data-bk=\"JPA\"]'); if(b)scrollTo(0,b.getBoundingClientRect().top+scrollY-160)})()"); p.wait_for_timeout(150)
                shot(p, tag + '_1_법령집')
                ok(tag + ' 법령집 화면 하단 고지는 위반행위 당시', foot(p) in (ACT, None), foot(p))
        # (산업안전 분야에서 계속)
        # ── 수사준칙 제21조: 준용 카드(일부 준용) · 하단 고지 ──
        art(p, '심야조사', 'ICR:제21조'); H = heads(p); T = subtext(p)
        ok(tag + ' 수사준칙 제21조: 조문 다음 준용 카드', len(H) > 1 and H[0].startswith('조문') and H[1].startswith('특별사법경찰관리 준용'), H[:3])
        ok(tag + ' 수사준칙 제21조: 일부 준용 · 제2항제4호 제외 + 읽기 안내', '일부 준용 · 제2항제4호 제외' in T and '"사법경찰관"은 "특별사법경찰관"으로' in T, T[:400])
        ok(tag + ' 수사준칙 제21조: 머리 표시 일부 준용', p.evaluate("[...document.querySelectorAll('%s .dhead .lb')].map(x=>x.textContent).join()" % SUB).find('일부 준용') >= 0)
        ok(tag + ' 수사준칙 제21조: 적용 판단 칸 없음', not any(x.startswith('적용 판단') for x in H), H)
        ok(tag + ' 수사준칙 하단 고지: 현행 법령', foot(p) == NOW, foot(p))
        scroll_to(p, '특별사법경찰관리 준용'); shot(p, tag + '_2_수사준칙_준용')
        p.locator(SUB + ' .lnk[data-art="SPC:제5조"]').first.click(); p.wait_for_timeout(450)
        ok(tag + ' 준용 카드 → 협력규정 제5조', '제5조' in p.evaluate("document.querySelector('%s .dhead').innerText" % SUB) and '준용규정' in subtext(p)[:200])
        # 준용 제외(법령 이름으로 찾으면 그대로 목록)
        art(p, '수사준칙 사건불송치', 'ICR:제62조'); T = subtext(p)
        ok(tag + ' 수사준칙 제62조: 준용 제외 카드(설명 줄 없이 협력규정 제5조 버튼)', '준용 제외' in T and '특별사법경찰관 협력규정 제5조 보기' in T and '준용하는 조문에 없음' not in T and '"사법경찰관"은' not in T, T[:300])
        ok(tag + ' 수사준칙 제62조: 개정 예정 2027-08-05', '개정 예정' in ' '.join(heads(p)), heads(p))
        scroll_to(p, '특별사법경찰관리 준용'); shot(p, tag + '_3_수사준칙_준용제외')
        find(p, '수사준칙 불송치')
        ok(tag + ' 목록 줄 표시: 준용 제외', p.evaluate("[...document.querySelectorAll('#results [data-art^=\"ICR:\"] .lb.na')].some(x=>x.textContent==='준용 제외')"))
        # ── 사법경찰직무법 제6조의2: 개정 예정 제목 변경 ──
        art(p, '사법경찰직무법 근로감독관', 'JPA:제6조의2'); T = subtext(p)
        ok(tag + ' 사법경찰직무법 제6조의2: 개정 예정 제목 변경 안내', '제목: 근로감독관 등 → 노동감독관 등' in T and '2026. 12. 8.' in T, T[-600:])
        ok(tag + ' 사법경찰직무법: 하단 고지 현행', foot(p) == NOW, foot(p))
        scroll_to(p, '개정 예정'); shot(p, tag + '_4_직무법_개정예정')
        # ── 근로기준법 조문은 그대로(위반행위 당시) ──
        art(p, '근기법 55조', 'GK:제55조')
        ok(tag + ' 근로기준법 제55조 하단 고지: 위반행위 당시(그대로)', foot(p) == ACT, foot(p))
        # ── 협력규칙 제21조: 서식 원문 링크·창 ──
        art(p, '협력규칙 출석요구', 'SPCR:제21조'); H = heads(p)
        ms = p.locator(SUB + ' .xrl[data-ms]')
        ok(tag + ' 협력규칙 제21조: 제목 줄 서식 원문 3', ms.count() == 1 and '서식 원문 3' in ms.first.inner_text(), ms.count() and ms.first.inner_text())
        ok(tag + ' 협력규칙 제21조: 서식 구획 이름 서식', any(x.startswith('서식') for x in H) and not any(x.startswith('별표·서식') for x in H), H)
        ok(tag + ' 협력규칙 제21조 화면 넘침 없음', not over(p))
        shot(p, tag + '_5_협력규칙_서식')
        ms.first.click(); p.wait_for_timeout(350)
        sh = p.evaluate("({t:document.getElementById('xsheetT').textContent,h:document.getElementById('xhint').textContent,a:[...document.querySelectorAll('#xlist a.row')].map(a=>({h:a.getAttribute('href'),t:a.innerText.replace(/\\s+/g,' ')}))})")
        ok(tag + ' 서식 창: 서식(앱 미수록) 3건 · PDF 안내', sh['t'] == '서식(앱 미수록) 3건' and 'PDF' in sh['h'], sh)
        ok(tag + ' 서식 창: 별지 제16·17·18호서식 → 법제처 서식 파일', len(sh['a']) == 3 and all('flDownload.do?flSeq=' in a['h'] for a in sh['a']) and '별지 제16호서식' in sh['a'][0]['t'], sh['a'][:1])
        shot(p, tag + '_6_서식창')
        p.locator('#xsheet button[data-xclose]').first.click(); p.wait_for_timeout(200)
        ok(tag + ' 서식 창 닫힘', p.evaluate("document.getElementById('xsheet').hidden"))
        # ── 법령집 협력규칙 서식 탭 ──
        p.click('#tabbar [data-nav="book"]'); p.wait_for_timeout(300)
        p.locator('#book .brow[data-bk="SPCR"]').first.click(); p.wait_for_timeout(400)
        tabs = p.evaluate("[...document.querySelectorAll('%s .bktab button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim())" % SUB)
        ok(tag + ' 협력규칙 법령집: [조문 88 | 서식 147] 탭', tabs == ['조문 88', '서식 147'], tabs)
        if len(tabs) == 2:
            p.locator(SUB + ' [data-bktab="bt"]').click(); p.wait_for_timeout(350); T = ' '.join(subtext(p).split())
            ok(tag + ' 협력규칙 서식 탭: 서식(앱 미수록) 147 · 별지 제1호서식 · 안내', '서식(앱 미수록) 147' in T and '별지 제1호서식 수사 진행상황 통지서' in T and '미수록 서식은 국가법령정보센터에서 확인' in T, T[:300])
            shot(p, tag + '_7_서식탭')
        # ── 집무규정 옛 수사준칙 인용 → 새 조문 ──
        art(p, '집무규정 46조', 'GAM:제46조')
        p.locator(SUB + ' .xrl[data-xr]').first.click(); p.wait_for_timeout(350)
        sh = p.evaluate("({h:document.getElementById('xhint').textContent,t:[...document.querySelectorAll('#xlist .row')].map(a=>a.innerText.replace(/\\s+/g,' '))})")
        ok(tag + ' 집무규정 제46조 인용: 옛 제10조 → 협력규칙 제3조(옛 표시)', any('제3조' in t and '옛 특별사법경찰관리 수사준칙 제10조' in t for t in sh['t']), sh['t'])
        ok(tag + ' 집무규정 제46조 인용: 옛 제44조 → 대응 조문 없음', any('제44조' in t and '2026. 10. 2. 전부개정 · 대응 조문 없음' in t for t in sh['t']), sh['t'])
        ok(tag + ' 인용 창 안내: 기존 문구 그대로(옛 규칙 설명 문장 없음)', sh['h'] == '앱에 수록된 법령은 앱에서, 그 밖의 법령은 국가법령정보센터에서 열립니다.', sh['h'])
        ok(tag + ' 집무규정 하단 고지: 현행 법령', foot(p) == NOW, foot(p))
        shot(p, tag + '_8_집무규정_인용')
        p.locator('#xsheet button[data-xclose]').first.click(); p.wait_for_timeout(200)
        # ── 검색: 그 밖의 수사 법령 조문(접힘) ──
        find(p, '석면')
        fo = p.evaluate("(()=>{const b=document.querySelector('#results [data-fold=\"ol\"]'); return b?{t:b.textContent.replace(/\\s+/g,' '),open:b.getAttribute('aria-expanded')}:null})()")
        ok(tag + " '석면' 검색: 맨 아래 그 밖의 수사 법령 조문(접힘)", fo and fo['t'].startswith('그 밖의 수사 법령 조문') and fo['open'] == 'false', fo)
        first = p.evaluate("[...document.querySelectorAll('#results .row[data-art]')].slice(0,3).map(x=>x.dataset.art)")
        ok(tag + " '석면'(산업안전) 첫 결과는 산안법 조문", first[:1] == ['OSH:제119조'], first)
        p.evaluate("(()=>{const b=document.querySelector('#results [data-fold=\"ol\"]'); if(b){b.click(); scrollTo(0,b.getBoundingClientRect().top+scrollY-140);}})()"); p.wait_for_timeout(250)
        shot(p, tag + '_9_그밖의수사조문')
        find(p, '영상녹화')
        first = p.evaluate("[...document.querySelectorAll('#results .row[data-art]')].slice(0,2).map(x=>x.dataset.art)")
        ok(tag + " '영상녹화' 첫 결과 협력규칙 제29조", first[:1] == ['SPCR:제29조'], first)
        ok(tag + ' 검색 화면 넘침 없음', not over(p))
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
    br.close()
srv.shutdown()
print('전체 통과' if not fails else '실패 %d건' % len(fails))
sys.exit(1 if fails else 0)
