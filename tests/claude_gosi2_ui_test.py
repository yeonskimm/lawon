# 법ON 고시 10종 수록·앱 미수록 별표/서식 '원문' 링크·원문 연결 고시 7종(2026-10-18, 5-37) 화면 검사
# 사용: python3 claude_gosi2_ui_test.py <파일명.html> [캡처 폴더]   (tests 폴더 기준 파일명, 포트 8778)
import sys, os, re, threading, functools, http.server, socketserver, urllib.parse
from playwright.sync_api import sync_playwright

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8778), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
URL = 'http://127.0.0.1:8778/' + FILE
SUB = 'main>section.sub:not([hidden])'
fails = []
def ok(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  → ' + str(info)))
    if not cond: fails.append(name)
def shot(p, n):
    if SHOT: os.makedirs(SHOT, exist_ok=True); p.screenshot(path=os.path.join(SHOT, n + '.png'))
def heads(p, sel=SUB): return p.evaluate("[...document.querySelectorAll('%s .gl')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())" % sel)
def dec(u): return urllib.parse.unquote(u or '')
def art(p, q, key):   # 검색 → 조문 화면
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', q); p.wait_for_timeout(600)
    p.locator('#results [data-art="%s"]' % key).first.click(); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)')
def title_links(p):   # '조문' 제목 줄 오른쪽 링크들
    return p.evaluate("""(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.firstChild&&x.firstChild.textContent.trim()==='조문'); if(!g)return null;
      return {links:[...g.querySelectorAll('.xrl')].map(a=>({t:a.textContent.trim(),tag:a.tagName,href:a.getAttribute('href')||'',ms:a.dataset.ms||'',r:Math.round(a.getBoundingClientRect().right),h:Math.round(a.getBoundingClientRect().height)})), over:document.scrollingElement.scrollWidth>innerWidth||[...g.querySelectorAll('.xrl')].some(a=>a.getBoundingClientRect().right>innerWidth), top:Math.round(g.getBoundingClientRect().top)};})()""" % SUB)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w, big, dark, tag in [(390, False, False, '390'), (320, True, False, '320크게'), (430, False, True, '430어둡게')]:
        c = br.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, service_workers='block')
        errs = []
        def start(field):   # 새 탭(앱 상태 없이 분야 선택부터)
            q = c.new_page(); q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(URL); q.wait_for_selector('#vStart:not([hidden])')
            if big: q.evaluate("document.documentElement.dataset.fs='l'")
            if dark: q.evaluate("document.documentElement.dataset.theme='dark'")
            q.click('.pick[data-field="%s"]' % field); q.wait_for_timeout(200); return q
        p = start('osh')
        # 1. 법령집: 고시 12 + 앱 미수록 고시 7(국가법령정보센터 새 창)
        p.click('#tabbar [data-nav="book"]'); p.wait_for_timeout(300)
        H = heads(p, '#book')
        gi = next((i for i, x in enumerate(H) if x == '고시'), -1)
        ok(tag + " 법령집 '고시' 다음 '고시(앱 미수록) 7'", gi >= 0 and H[gi + 1] == '고시(앱 미수록) 7', H)
        g = p.evaluate("""(()=>{const hs=[...document.querySelectorAll('#book .gl')]; const a=hs.find(x=>x.textContent.trim()==='고시'), b=hs.find(x=>x.textContent.trim().startsWith('고시(앱 미수록)'));
          return {gosi:[...a.nextElementSibling.querySelectorAll('[data-bk]')].map(x=>x.dataset.bk), ext:[...b.nextElementSibling.querySelectorAll('a')].map(x=>[x.querySelector('b').textContent,x.target,x.getAttribute('href')])};})()""")
        ok(tag + ' 고시 묶음 12종(기존 3 + 새 9)', g['gosi'] == ['CSC', 'RAG', 'EDU', 'CSL', 'HRS', 'HRC', 'HRP', 'PSM', 'GRD', 'SCP', 'SIP', 'MSD'], g['gosi'])
        ok(tag + ' 앱 미수록 고시 7줄 — 새 창·국가법령정보센터 행정규칙', len(g['ext']) == 7 and all(x[1] == '_blank' and '/행정규칙/' in dec(x[2]) for x in g['ext']), g['ext'][:2])
        p.evaluate("document.querySelector('#book .gl:nth-last-of-type(1)')");
        p.evaluate("""(()=>{const b=[...document.querySelectorAll('#book .gl')].find(x=>x.textContent.trim()==='고시'); b.scrollIntoView();})()"""); p.wait_for_timeout(100); shot(p, tag + '_1_법령집_고시')
        # 2. 법령집 PSM 규정 → [별표·서식 27] 탭
        p.click('#book [data-bk="PSM"]'); p.wait_for_timeout(400)
        tabs = p.evaluate("[...document.querySelectorAll('%s [data-bktab]')].map(b=>b.textContent.trim())" % SUB)
        ok(tag + " PSM 규정 탭 '조문 62 | 별표·서식 27'", tabs == ['조문 62', '별표·서식 27'], tabs)
        p.click('%s [data-bktab="bt"]' % SUB); p.wait_for_timeout(300); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_2_PSM_별표서식')
        H = heads(p); ok(tag + " PSM 별표·서식 탭: 별표 2 → 별표·서식(앱 미수록) 25", H[:2] == ['별표 2', '별표·서식(앱 미수록) 25'], H)
        mr = p.evaluate("[...document.querySelectorAll('%s a.mrow')].map(a=>[a.querySelector('b').textContent,a.querySelector('small').textContent,a.getAttribute('href')])" % SUB)
        ok(tag + " 미수록 줄 이름 '별지 제17호의2서식 …'·'고시 원문 아래쪽에서 보기'", any(x[0].startswith('별지 제17호의2서식') for x in mr) and all('고시 원문 아래쪽에서 보기' in x[1] for x in mr) and all('/행정규칙/' in dec(x[2]) for x in mr), mr[:3])
        # 3. PSM 제23조: 제목 줄 '원문 5' → 아래 창 5건
        p.close(); p = start('osh')
        art(p, 'PSM 규정 배치도', 'PSM:제23조'); shot(p, tag + '_3_PSM23_조문')
        T = title_links(p)
        ok(tag + " PSM 제23조 제목 줄 '서식 원문 5' 단추", T and [x['t'] for x in T['links']] == ['서식 원문 5'] and T['links'][0]['ms'] == 'PSM:제23조', T)
        ok(tag + ' 제목 줄 넘침 없음·링크 화면 안·높이 44px', T and not T['over'] and all(x['r'] <= w - 8 and x['h'] >= 44 for x in T['links']), T)
        p.click('%s .gl [data-ms]' % SUB); p.wait_for_timeout(300); shot(p, tag + '_4_원문창')
        sh = p.evaluate("({t:document.getElementById('xsheetT').textContent, hint:document.getElementById('xhint').textContent, rows:[...document.querySelectorAll('#xlist a')].map(a=>a.querySelector('.no').textContent)})")
        ok(tag + ' 원문 창: 서식(앱 미수록) 5건(제17호의3~5·18·19 서식)', sh['t'] == '서식(앱 미수록) 5건' and sorted(sh['rows']) == sorted(['별지 제18호서식', '별지 제17호의3서식', '별지 제17호의4서식', '별지 제17호의5서식', '별지 제19호서식']), sh)
        ok(tag + ' 원문 창 안내: 별표·서식은 원문 아래쪽', '원문 아래쪽' in sh['hint'], sh['hint'])
        p.locator('#xsheet button[data-xclose]').first.click(); p.wait_for_timeout(200)
        ok(tag + ' 원문 창 닫힘', p.evaluate("document.getElementById('xsheet').hidden"))
        # 4. 안전보건대장 제5조: '서식 원문' 한 개는 바로 새 창 링크 + 과태료(제67조제1항)
        art(p, '기본안전보건대장', 'CSL:제5조'); shot(p, tag + '_5_CSL5')
        T = title_links(p)
        ok(tag + " 안전보건대장 제5조 '서식 원문' 바로 링크(새 창·행정규칙)", T and len(T['links']) == 1 and T['links'][0]['t'] == '서식 원문' and T['links'][0]['tag'] == 'A' and '/행정규칙/' in dec(T['links'][0]['href']), T)
        H = heads(p); ok(tag + ' 안전보건대장 제5조 과태료 구획', any(x.startswith('과태료') for x in H), H)
        txt = p.evaluate("document.querySelector('%s').innerText" % SUB)
        ok(tag + ' 안전보건대장 제5조: 제175조제4항제3호·제67조제1항 1천만원', '제175조제4항제3호' in txt and '제67조제1항' in txt and '1천만원' in txt, txt[:200])
        # 5. 시행령 제78조(안전검사 대상) → 검사 절차 고시 별표 1 → 크레인 2톤
        art(p, '안전검사대상기계', 'SD:제78조')
        ok(tag + ' 시행령 제78조 별표 구획에 검사 절차 고시 별표 1', p.evaluate("!!document.querySelector('%s [data-bt=\"SIP1\"]')" % SUB))
        p.click('%s [data-bt="SIP1"]' % SUB); p.wait_for_timeout(400); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_6_SIP별표1')
        ok(tag + ' 안전검사 대상 별표: 크레인 정격하중 2톤 이상', '정격하중이 2톤 이상' in p.evaluate("document.querySelector('%s').innerText" % SUB))
        # 6. 검색 '크레인 검사기준' → 앱 미수록 고시 카드(안전검사 고시)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', '크레인 검사기준'); p.wait_for_timeout(700); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_7_검사기준_검색')
        gl = p.evaluate("""(()=>{const g=[...document.querySelectorAll('#results .gl')].find(x=>x.textContent.trim().startsWith('고시(앱 미수록)')); return g?[...g.nextElementSibling.querySelectorAll('a')].map(a=>a.querySelector('b').textContent):null;})()""")
        ok(tag + " '크레인 검사기준' → 앱 미수록 고시 카드: 안전검사 고시", gl == ['안전검사 고시'], gl)
        p.fill('#q', '지게차'); p.wait_for_timeout(600)
        ok(tag + " '지게차'에는 미수록 고시 카드 없음", not p.evaluate("[...document.querySelectorAll('#results .gl')].some(x=>x.textContent.trim().startsWith('고시(앱 미수록)'))"))
        # 7. 근골격계 고시 제4조: 원문 2 + 작업 기준 링크가 한 줄에(넘침 없음)
        art(p, '근골격계 고시 유해요인조사', 'MSD:제4조')
        T = title_links(p)
        ok(tag + " 근골격계 고시 제4조 '서식 원문 2'와 작업 기준 링크, 넘침 없음", T and [x['t'] for x in T['links']] == ['서식 원문 2', '작업 기준 1'] and not T['over'], T)
        # 8. 방호조치 기준 제18조(지게차) → 벌칙 근거 법 조문(제80조) 위반 시
        art(p, '방호조치 기준 지게차', 'GRD:제18조')
        H = heads(p); ok(tag + ' 방호조치 기준 제18조 벌칙: 근거 법 조문(제80조) 위반 시', any(x.startswith('벌칙') and '제80조' in x for x in H), H)
        # 8-2. 조문 본문 그림 자리: '(그림은 원문 참조)', </img> 글자 안 보임
        art(p, '예초기 날접촉 예방장치', 'GRD:제6조'); t6 = p.evaluate("document.querySelector('%s .law').innerText" % SUB)
        ok(tag + " 방호조치 기준 제6조 그림 자리 '(그림은 원문 참조)'", '(그림은 원문 참조)' in t6 and 'img' not in t6, t6[-200:])
        T = title_links(p); ok(tag + " 방호조치 기준 제6조 제목 줄 '그림 원문' 바로 링크", T and [x['t'] for x in T['links']] == ['그림 원문'] and T['links'][0]['tag'] == 'A' and '/행정규칙/' in dec(T['links'][0]['href']), T)
        art(p, 'PSM 규정 동력기계 목록', 'PSM:제21조'); T = title_links(p)
        ok(tag + " PSM 제21조 '서식·그림 원문 5'", T and [x['t'] for x in T['links']] == ['서식·그림 원문 5'] and not T['over'], T)
        art(p, '충전부 접근 한계거리', 'RULE:제321조'); t3 = p.evaluate("document.querySelector('%s .law').innerText" % SUB)
        ok(tag + " 규칙 제321조 표 끝 '</img>' 글자 안 보임", 'img' not in t3, t3[-120:])
        # 9. 근로기준 법령집: 고시 묶음에 단순노무직종 고시, 앱 미수록 고시 없음
        p.close(); p = start('labor')
        p.click('#tabbar [data-nav="book"]'); p.wait_for_timeout(300)
        H = heads(p, '#book')
        lg = p.evaluate("""(()=>{const a=[...document.querySelectorAll('#book .gl')].find(x=>x.textContent.trim()==='고시'); return a?[...a.nextElementSibling.querySelectorAll('[data-bk]')].map(x=>x.dataset.bk):null;})()""")
        ok(tag + ' 근로기준 법령집 고시 묶음 = 단순노무직종 고시, 고시(앱 미수록) 없음', lg == ['MWS'] and not any(x.startswith('고시(앱 미수록)') for x in H), [lg, H])
        # 10. 단순노무직종 고시 → 대분류 9 분류 항목표(5-39), 직업명 검색 카드
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', '택배원'); p.wait_for_timeout(700); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_9_택배원_검색')
        kc = p.evaluate("""(()=>{const g=[...document.querySelectorAll('#results .gl')].find(x=>x.textContent.trim().startsWith('한국표준직업분류 대분류 9')); return g?[...g.nextElementSibling.querySelectorAll('[data-art]')].map(b=>[b.dataset.art,b.querySelector('.no').textContent,b.querySelector('.ttl').textContent]):null;})()""")
        ok(tag + " '택배원' → 대분류 9 카드 92220 택배원(단순노무직종 고시로)", kc == [['MWS:본문', '92220', '택배원']], kc)
        p.locator('#results [data-art="MWS:본문"]').first.click(); p.wait_for_timeout(400)
        r2 = p.evaluate("[...document.querySelectorAll('%s .k9r .r2')].map(x=>x.textContent)" % SUB); ok(tag + " 분류표 아래 줄은 7차 옛 이름 9줄만(가구 조립원 '대분류 8')", len(r2) == 9 and all(x.startswith('7차 ') for x in r2) and any('대분류 8' in x for x in r2), r2)
        H = heads(p); ok(tag + " 단순노무직종 고시 화면 '대분류 9 분류 항목' + 중분류 6", any(x.startswith('대분류 9 분류 항목') for x in H) and sum(1 for x in H if re.match(r'^9\d ', x)) == 6, H)
        k9 = p.evaluate("({n:document.querySelectorAll('%s .k9r').length, hit:[...document.querySelectorAll('%s .k9hit .no')].map(x=>x.textContent), sw:document.scrollingElement.scrollWidth})" % (SUB, SUB))
        ok(tag + ' 분류표 52줄·택배원 줄 강조·가로 넘침 없음', k9['n'] == 52 and k9['hit'] == ['92220'] and k9['sw'] <= w, k9)
        p.evaluate("""(()=>{const g=[...document.querySelectorAll('%s .gl')].find(x=>x.textContent.trim().startsWith('대분류 9 분류 항목')); window.scrollBy(0,g.getBoundingClientRect().top-120);})()""" % SUB); p.wait_for_timeout(100); shot(p, tag + '_10_대분류9')
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(150); p.fill('#q', '건물 경비원'); p.wait_for_timeout(700); p.evaluate('scrollTo(0,0)'); shot(p, tag + '_11_건물경비원')
        kc = p.evaluate("""(()=>{const g=[...document.querySelectorAll('#results .gl')].find(x=>x.textContent.trim().startsWith('한국표준직업분류 대분류 9')); return g?[...g.nextElementSibling.querySelectorAll('[data-art]')].map(b=>[b.querySelector('.no').textContent,b.querySelector('.r2').textContent]):null;})()""")
        ok(tag + " 7차 옛 이름 '건물 경비원' → 94209, '7차 건물 경비원 → 8차'", kc == [['94209', '7차 건물 경비원 → 8차 · 단순노무직종']], kc)
        q = start('osh'); q.click('#tabbar [data-nav="find"]'); q.fill('#q', '택배원'); q.wait_for_timeout(700)
        ok(tag + " 산업안전 분야 '택배원'에는 대분류 9 카드 없음", not q.evaluate("[...document.querySelectorAll('#results .gl')].some(x=>x.textContent.trim().startsWith('한국표준직업분류'))")); q.close()
        ok(tag + ' 화면 오류 없음', not errs, errs)
        c.close()
print('실패 %d건' % len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
