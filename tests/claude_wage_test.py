# 최저임금·임금 단가 도구 화면 검사(2026-09-26) — 사용: python3 claude_wage_test.py <파일명.html> (이 파일과 같은 폴더의 html)
# 월급제 판정·요일별 입력·연도 접기·시급제 지급액 대조·공휴일, 무작위 700번, 폭 320~430px·글자 크게·어두운 화면에서 넘침 확인
import sys, os, threading, functools, http.server, socketserver, random, re
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8771),functools.partial(Q,directory=os.path.dirname(os.path.abspath(__file__)))); threading.Thread(target=srv.serve_forever,daemon=True).start()
URL='http://127.0.0.1:8771/'+(sys.argv[1] if len(sys.argv)>1 else 'index.html')
fail=0
def ok(name,cond,extra=''):
    global fail
    if not cond: fail+=1
    print(('PASS ' if cond else 'FAIL ')+name+('' if cond else '  → '+extra))
def R(p): return p.inner_text('#wres').replace('\n',' | ')
def K(p): return p.inner_text('#wchk').replace('\n',' | ')
with sync_playwright() as pw:
    br=pw.chromium.launch()
    c=br.new_context(viewport={'width':390,'height':844},service_workers='block'); p=c.new_page(); errs=[]
    p.on('pageerror',lambda e: errs.append(str(e)))
    p.goto(URL); p.wait_for_selector('#vStart:not([hidden])')
    p.click('#wageOpen'); p.wait_for_selector('#wsheet:not([hidden])')
    ok('처음: 월급제 선택',p.get_attribute('[data-wd="m"]','aria-pressed')=='true')
    ok('처음: 연도 한 줄(2026년 10,320원), 버튼 줄 접힘',p.inner_text('#wyrv')=='2026년 10,320원' and p.is_hidden('#wyr'),p.inner_text('#wyrv'))
    ok('처음: 5명 이상 안내',p.inner_text('#wszsub').startswith('주휴·공휴일 유급휴일'))
    p.fill('#wamt','2156880'); r=R(p); ok('월급 2,156,880 → 이상, 10,320',('최저임금 이상' in r) and ('10,320원' in r),r)
    p.fill('#wamt','2100000'); r=R(p); ok('2,100,000 → 미만, 월 56,880원 미달',('최저임금 미만' in r) and ('56,880원 미달' in r),r)
    ok('미만 → 주휴 최대 안내',('주휴를 최대로 잡은 결과' in r),r)
    p.fill('#wamt','2156879'); r=R(p); ok('2,156,879 → 반올림 갈림',('반올림에 따라 결론이 갈림' in r) and ('209시간(반올림)이면 미만' in r),r)
    p.fill('#wamt','2300000'); p.fill('#wwh','48'); r=R(p); ok('48시간 5명 이상 → 연장 8시간 제외 안내',('넘는 8시간은 연장·휴일근로' in r),r)
    p.click('[data-wsz="4"]'); r=R(p); ok('5명 미만 → 가산 적용 안 함, 월 243시간',('적용 안 함(5명 미만)' in r) and ('243시간' in r),r)
    ok('5명 미만 안내 문구',p.inner_text('#wszsub').startswith('주휴만 적용'))
    p.click('[data-wsz="5"]'); p.fill('#wwh','40')
    p.click('#wdtog'); ok('요일별 펼침·1주 칸 잠김',p.is_visible('#wdwrap') and p.is_disabled('#wwh'))
    ok('요일별 기본 월~금 8',[p.input_value('[data-whi="%d"]'%i) for i in range(5)]==['8']*5)
    p.click('[data-wdi="5"]')
    for i in range(5): p.fill('[data-whi="%d"]'%i,'7')
    p.fill('[data-whi="5"]','5'); p.fill('#wamt','2120000'); r=R(p)
    ok('평일 7·토 5, 2,120,000 → 주휴 산정 방식 갈림, 10,143 ~ 10,392',('주휴 산정 방식에 따라 결론이 갈림' in r) and ('10,143 ~ 10,392' in r),r)
    ok('1주 칸 = 요일 합계 40',p.input_value('#wwh')=='40')
    p.fill('[data-whi="5"]','5,5'); r=R(p); ok('쉼표 시간 → 오류 표시',('토요일 시간 확인' in r) and 'bad' in (p.get_attribute('[data-whi="5"]','class') or ''),r)
    p.fill('[data-whi="5"]','5:30'); r=R(p); ok('5:30 입력 → 합계 40.5',p.input_value('#wwh')=='40.5',p.input_value('#wwh'))
    p.click('#wdtog'); ok('합계로 돌아오면 1주 칸 40.5·잠금 해제',p.input_value('#wwh')=='40.5' and not p.is_disabled('#wwh'))
    p.click('#wyrtog'); ok('연도 변경 펼침',p.is_visible('#wyr'))
    p.click('[data-wy="2024"]'); ok('2024 선택 → 접힘·올해 아님 표시·강조',p.is_hidden('#wyr') and '올해 아님' in p.inner_text('#wyrv') and 'alt' in p.get_attribute('#wyrrow','class'),p.inner_text('#wyrv'))
    r=R(p); ok('판정 문구도 2024년 9,860원',('2024년 최저임금 9,860원' in r),r)
    p.click('#wclr'); ok('지우기 → 연도 올해로·요일별 닫힘·1주 40',p.inner_text('#wyrv')=='2026년 10,320원' and p.is_hidden('#wdwrap') and p.input_value('#wwh')=='40' and p.is_hidden('#wclr'))
    # 시급제
    p.click('[data-wd="h"]'); ok('시급제: 대조 칸은 시급 넣기 전 숨김',p.is_hidden('#wchkbox'))
    p.fill('#wamt','11000'); r=R(p); ok('시급 11,000 → 이상, 주휴 88,000, 연장 16,500, 야간 5,500',all(x in r for x in ['최저임금 이상','88,000원','16,500원','22,000원','5,500원']),r)
    ok('대조 칸 보임',p.is_visible('#wchkbox'))
    p.fill('#wpd','1760000'); p.fill('#whr','160'); k=K(p)
    ok('지급 1,760,000·160시간·4회 → 2,112,000, 미지급 352,000, 주휴 미지급 문구',all(x in k for x in ['2,112,000원','352,000원','주휴수당(근로기준법 제55조①) 미지급으로 보임']),k)
    p.click('#wpubtog'); ok('공휴일 펼침·기본 1일·8시간',p.is_visible('#wpubb') and p.get_attribute('[data-wpub="1"]','aria-pressed')=='true' and p.input_value('#wpubh')=='8')
    k=K(p); ok('공휴일 1일 → 88,000 더해 2,200,000, 미지급 440,000·공휴일 문구',all(x in k for x in ['공휴일 1일 × 8시간 × 11,000원','2,200,000원','440,000원','공휴일 유급휴일(제55조②)']),k)
    p.click('[data-wpub="2"]'); p.fill('#wpubh','7'); k=K(p); ok('공휴일 2일 7시간 → 154,000',('154,000원' in k),k)
    p.click('[data-wsz="4"]'); k=K(p); ok('5명 미만 → 공휴일 줄 숨김·금액에서 빠짐',p.is_hidden('#wpubw') and '공휴일' not in k and '2,112,000원' in k,k)
    ok('5명 미만 → 가산 적용 안 함',('적용 안 함' in R(p)))
    p.click('[data-wsz="5"]'); p.fill('#wamt','10000'); p.fill('#wpd','1600000'); r=R(p); k=K(p)
    ok('시급 10,000 → 미만·수당 합산·수습 안내',('최저임금 미만' in r) and ('합산 비교' in r) and ('수습' in r),r)
    ok('미달: 최저임금 기준 2,125,920, 약정 기준 460,000, 미달분 65,920',all(x in k for x in ['2,125,920원','460,000원','65,920원']),k)
    p.click('[data-wnh="5"]'); k=K(p); ok('주휴 5회 → 주휴 줄 5회',('주휴 5회' in k),k)
    p.fill('#wpd','220만'); ok('지급액 220만 → 오류',('원 단위 숫자로 입력' in K(p)),K(p))
    p.fill('#wpd',''); p.fill('#whr','1,60'); ok('근로시간 1,60 → 오류',('숫자로 입력' in K(p)),K(p))
    p.fill('#whr','160'); p.fill('#wwh','14'); k=K(p); r=R(p); ok('주 14시간 → 주휴 없음',('주휴 없음' in r) and ('주휴 없음' in k),r+' / '+k)
    p.keyboard.press('Escape'); ok('Esc로 닫힘',p.is_hidden('#wsheet'))
    p.click('#wageOpen'); ok('다시 열면 상태 유지(시급제)',p.get_attribute('[data-wd="h"]','aria-pressed')=='true')
    # 무작위
    rnd=random.Random(7)
    for i in range(700):
        if rnd.random()<.55:
            bs=[b for b in p.query_selector_all('#wsheet button') if b.is_visible()]
            b=rnd.choice(bs)
            if b.get_attribute('data-wclose'): continue
            b.click()
        else:
            ins=[x for x in p.query_selector_all('#wsheet input') if x.is_visible() and x.is_enabled()]
            if ins: rnd.choice(ins).fill(rnd.choice(['','0','7','7.5','7:30','8','9','25','40','48','15','14','abc','1,760,000','160','11000','10000','2300000','-1','1,60','220만']))
    ok('무작위 700번 스크립트 오류 없음',not errs,str(errs[:3]))
    ok('무작위 후 결과 칸 비어 있지 않음',len(p.inner_text('#wres'))>0)
    # 화면 폭·글자 크기·어두운 화면
    for w in (320,375,430):
        for big in (False,True):
            for dark in (False,True):
                c2=br.new_context(viewport={'width':w,'height':900},service_workers='block',color_scheme='dark' if dark else 'light'); q=c2.new_page()
                q.goto(URL); q.wait_for_selector('#vStart:not([hidden])')
                if big: q.evaluate("document.documentElement.setAttribute('data-fs','l')")
                q.click('#wageOpen'); q.click('[data-wd="h"]'); q.fill('#wamt','11000'); q.fill('#wpd','1760000'); q.fill('#whr','160'); q.click('#wpubtog'); q.click('#wdtog'); q.click('#wyrtog')
                bad=q.evaluate("""()=>{ const card=document.querySelector('#wsheet .shcard'), cw=card.clientWidth; const out=[];
                  document.querySelectorAll('#wsheet button, #wsheet input, #wsheet .wg-brk p').forEach(e=>{ if(!e.offsetParent)return; const r=e.getBoundingClientRect(); const cr=card.getBoundingClientRect();
                    if(r.right>cr.right+1||r.left<cr.left-1)out.push((e.id||e.textContent||'').trim().slice(0,12)); if(e.tagName==='BUTTON'&&!e.classList.contains('clr')&&r.height<40)out.push('작은버튼:'+(e.textContent||'').trim().slice(0,8)); });
                  if(card.scrollWidth>card.clientWidth+1)out.push('가로스크롤'); return out; }""")
                ok('화면 %dpx 글자%s %s: 넘침·작은 버튼 없음'%(w,'크게' if big else '보통','어둡게' if dark else '밝게'),not bad,str(bad[:6]))
                if w==320 and big and not dark: q.screenshot(path='wage_320_big.png',full_page=True)
                if w==390 or (w==375 and not big and dark): q.screenshot(path='wage_375_dark.png',full_page=True)
                c2.close()
    br.close()
print('전체 통과' if not fail else '실패 %d건'%fail); sys.exit(1 if fail else 0)
