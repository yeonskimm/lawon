# 법ON 아래 창 화면 검사(2026-10-04) — 업종 창 제목·분류·검색칸 고정, 키보드(보이는 화면 축소) 흉내, '학교' 검색 — 사용: python3 claude_sheet_ui_test.py <파일명.html>
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8771), functools.partial(Q, directory=os.path.dirname(os.path.abspath(__file__))))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8771/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
fails = []
def ok(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  → ' + str(i)))
    if not c: fails.append(n)
RECT = "(sel)=>{const e=document.querySelector(sel); if(!e)return null; const r=e.getBoundingClientRect(); return [r.top,r.bottom];}"
def run(w, h, big):
    tag = '%dx%d%s' % (w, h, ' 크게' if big else '')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2)
        errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(URL); p.wait_for_timeout(1000)
        if big: p.evaluate("()=>{document.documentElement.classList.add('big');document.documentElement.style.fontSize='19px';}")
        p.click('.pick[data-field="osh"]'); p.wait_for_timeout(300)
        p.click('#tabbar [data-nav="find"]'); p.wait_for_timeout(300)
        p.evaluate("()=>{const c=document.querySelector('#otog');c&&c.click();}"); p.wait_for_timeout(300)
        p.locator('#igrp button', has_text='그 밖').first.click(); p.wait_for_timeout(400)
        h0 = p.evaluate(RECT, '#isheet .shh')
        p.evaluate("()=>{document.getElementById('ilist').scrollTop=100000}"); p.wait_for_timeout(200)
        h1 = p.evaluate(RECT, '#isheet .shh'); q1 = p.evaluate(RECT, '#iq')
        ok(tag + ' 목록을 끝까지 내려도 제목 그대로', h0 and h1 and abs(h0[0] - h1[0]) < 1, (h0, h1))
        ok(tag + ' 검색칸도 화면 안', q1 and q1[0] >= h1[1] - 1 and q1[1] < h, q1)
        ok(tag + ' 목록이 실제로 스크롤됨', p.evaluate("()=>document.getElementById('ilist').scrollTop") > 0)
        # 키보드 흉내: 보이는 화면을 아래 40%만큼 줄임(아이폰은 창 크기를 안 줄이고 visualViewport만 줄어듦)
        kv = int(h * 0.58)
        p.evaluate("(v)=>{const s=document.documentElement.style;s.setProperty('--vvh',v+'px');s.setProperty('--vvt','0px');}", kv); p.wait_for_timeout(200)
        p.fill('#iq', '학교'); p.wait_for_timeout(300)
        hk = p.evaluate(RECT, '#isheet .shh'); ck = p.evaluate(RECT, '#isheet .shcard')
        ok(tag + ' 키보드 열림: 창이 보이는 화면 안(위·아래)', ck and ck[0] >= 0 and ck[1] <= kv + 1, (ck, kv))
        ok(tag + ' 키보드 열림: 제목 줄 보임', hk and hk[0] >= 0 and hk[1] <= kv, hk)
        ids = p.evaluate("()=>[...document.querySelectorAll('#ilist [data-iset]')].map(x=>x.getAttribute('data-iset'))")
        ok(tag + " '학교' 검색 → 공공행정·학교만", ids == ['public'], ids)
        p.fill('#iq', '학원'); p.wait_for_timeout(300)
        ids = p.evaluate("()=>[...document.querySelectorAll('#ilist [data-iset]')].map(x=>x.getAttribute('data-iset'))")
        ok(tag + " '학원' 검색 → 교육서비스업", ids == ['edu'], ids)
        p.evaluate("()=>{const s=document.documentElement.style;s.removeProperty('--vvh');s.removeProperty('--vvt');}")
        ok(tag + ' 가로 넘침 없음', not p.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1"))
        # 다른 아래 창도 보이는 화면 안에(키보드 흉내)
        p.click('#isheet [data-iclose]:not(.shbg)'); p.wait_for_timeout(300)
        p.click('#tabbar [data-home]'); p.wait_for_timeout(300)
        for op, sid in [('#calcOpen', 'csheet'), ('#wageOpen', 'wsheet'), ('#leaveOpen', 'asheet'), ('#sevOpen', 'rsheet')]:
            p.evaluate("(v)=>{const s=document.documentElement.style;s.setProperty('--vvh',v+'px');s.setProperty('--vvt','0px');}", kv)
            p.click(op); p.wait_for_timeout(300)
            ck = p.evaluate(RECT, '#' + sid + ' .shcard'); hh = p.evaluate(RECT, '#' + sid + ' .shh')
            ok(tag + ' 키보드 열림 ' + sid + ' 창·제목 보임', ck and hh and ck[0] >= 0 and ck[1] <= kv + 1 and hh[0] >= 0, (ck, hh))
            p.evaluate("(id)=>{const s=document.documentElement.style;s.removeProperty('--vvh');s.removeProperty('--vvt');const b=document.querySelector('#'+id+' .shh button');b&&b.click();}", sid); p.wait_for_timeout(300)
        ok(tag + ' 스크립트 오류 없음', not errs, errs)
        b.close()
for w, h, big in [(390, 844, False), (320, 568, True), (430, 932, False), (375, 667, True)]:
    run(w, h, big)
print('실패 %d건' % len(fails) if fails else '전체 통과'); sys.exit(1 if fails else 0)
