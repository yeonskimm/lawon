# 법ON 여러 단계 개정 화면 검사(2026-10-02) — 사용: python3 tests/claude_due_ui_test.py <저장소 폴더>
# 날짜를 바꿔 조문 화면을 열고: 스크립트 오류·개정 예정/개정 전 표시·가로 넘침(390px, 320px 글자 크게)
import sys, os, threading, functools, http.server, socketserver, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8790),functools.partial(Q,directory=(sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))); threading.Thread(target=srv.serve_forever,daemon=True).start()
FIX="""(()=>{const T=new Date('%sT10:00:00').getTime(); const R=Date; class F extends R{constructor(...a){ if(a.length) super(...a); else super(T);} static now(){return T;}} window.Date=F; })();"""
fails=[]
def ok(n,c,i=''):
    print(('PASS ' if c else 'FAIL ')+n+('' if c else '  → '+str(i)[:300]));
    if not c: fails.append(n)
def open_art(p, field, q, no):
    p.click('.pick[data-field="%s"]'%field); p.wait_for_timeout(200)
    p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(200)
    p.fill('#q', q); p.wait_for_timeout(500)
    p.click('#results [data-art$=":%s"]'%no); p.wait_for_timeout(500)
    return p.evaluate("()=>{const s=[...document.querySelectorAll('main>section.sub')].find(x=>!x.hidden); return s?s.innerText:''}")
CASES=[('2026-10-02','labor','근기법 116조','제116조',['개정 예정','2026. 10. 8. · 2026. 12. 8. · 2027. 1. 1.','2026. 10. 8. 시행 조문 보기','2027. 1. 1. 시행 조문 보기'],['개정 전 조문']),
       ('2026-10-08','labor','근기법 116조','제116조',['2026. 12. 8. · 2027. 1. 1.','2026. 12. 8. 시행 조문 보기','개정 전','2026. 10. 7. 이전 위반행위','개정 전 조문 보기'],['2026. 10. 8. 시행 조문 보기']),
       ('2026-12-08','labor','근기법 116조','제116조',['개정 예정','2027. 1. 1.','2026. 10. 8. ~ 2026. 12. 7. 조문 보기','2026. 10. 7. 이전 조문 보기','2026. 12. 7. 이전 위반행위'],['2026. 12. 8. 시행 조문 보기']),
       ('2027-01-01','labor','근기법 116조','제116조',['개정 시행됨','2026. 12. 8. ~ 2026. 12. 31. 조문 보기','2026. 10. 8. ~ 2026. 12. 7. 조문 보기','2026. 10. 7. 이전 조문 보기'],['개정 예정']),
       ('2026-10-02','labor','근기법 110조','제110조',['2026. 12. 8. · 2027. 6. 10.','2027. 6. 10. 시행 조문 보기'],[]),
       ('2027-06-10','labor','근기법 110조','제110조',['2026. 12. 8. ~ 2027. 6. 9. 조문 보기','2026. 12. 7. 이전 조문 보기'],['개정 예정']),
       ('2026-12-08','osh','산안법 175조','제175조',['개정 예정','2027. 1. 8.','개정 전 조문 보기'],[]),
       ('2026-10-08','labor','근기법 109조','제109조',['개정 시행됨','개정 전 조문 보기'],['~']),   # 단일 단계는 기존 그대로
       ('2026-10-02','labor','근기법 105조','제105조',['삭제 예정'],[]),
]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for d,f,q,no,must,mustnot in CASES:
        for w,big in [(390,False),(320,True)]:
            c=b.new_context(viewport={'width':w,'height':760},device_scale_factor=1); p=c.new_page(); errs=[]
            p.on('response',lambda r: r.status==404 and print('404:',r.url)); p.on('pageerror',lambda e: errs.append(str(e))); p.on('console',lambda m: m.type=='error' and errs.append(m.text))
            p.add_init_script(FIX%d); p.goto('http://127.0.0.1:8790/index.html'); p.wait_for_timeout(700)
            if big: p.evaluate("()=>{try{document.documentElement.style.fontSize='120%'}catch(e){}}")
            try: txt=open_art(p,f,q,no)
            except Exception as ex: txt=''; errs.append(str(ex))
            tag='%s %s %dpx'%(d,no,w)
            ok(tag+' 오류 없음', not [x for x in errs if 'lawon-stats' not in x and 'net::' not in x], errs)
            miss=[m for m in must if m not in txt]; bad=[m for m in mustnot if m in txt and not (m=='~' and '~' not in txt)]
            ok(tag+' 표시', not miss and not bad, ('없음:',miss,'있으면 안 됨:',bad))
            ov=p.evaluate("()=>document.documentElement.scrollWidth>window.innerWidth+1")
            ok(tag+' 가로 넘침 없음', not ov)
            c.close()
    b.close()
print('실패 %d건'%len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
