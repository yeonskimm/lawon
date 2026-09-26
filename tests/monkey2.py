# 무작위 누르기 점검(빠른 판): 화면이 둘 이상/하나도 안 보이거나, 머리 띠·탭바가 화면과 어긋나거나, 스크립트 오류가 나는지
# 사용: python3 monkey2.py 파일.html 시작시드 시드개수 걸음수
import sys, os, random, threading, functools, http.server, socketserver, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=os.getcwd())); PORT=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
F,S0,NS,STEPS=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4])
CLICK="""(r)=>{ const sheet=['csheet','isheet','sheet'].map(id=>document.getElementById(id)).find(x=>!x.hidden);
  const root=sheet||document; const els=[...root.querySelectorAll('button,[data-art],[data-item]')].filter(el=>{ if(el.closest('[hidden]'))return false;
    if(el.matches('[data-install],[data-insthide],#updgo,a[target]'))return false; const b=el.getBoundingClientRect(); return b.width>0&&b.height>0; });
  if(!els.length)return ''; const el=els[Math.floor(r*els.length)]; const d=(el.id?'#'+el.id+' ':'')+[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value).join(' ')+' '+(el.textContent||'').trim().slice(0,14);
  el.click(); return d; }"""
CHECK="""()=>{ const vis=['vStart','vFind','vSite','vBook'].filter(id=>!document.getElementById(id).hidden);
  const subs=[...document.querySelectorAll('main>section.sub')].filter(x=>!x.hidden).length, bad=[];
  const hsub=!document.getElementById('hSub').hidden, hroot=!document.getElementById('hRoot').hidden, bar=!document.getElementById('tabbar').hidden;
  if(vis.length+subs!==1)bad.push('보이는 화면 '+(vis.length+subs)+'개 '+vis.join(','));
  if(hsub!==(subs===1)||hroot===hsub)bad.push('머리 띠 어긋남 sub='+subs+' hSub='+hsub+' hRoot='+hroot);
  if(bar===(vis[0]==='vStart'))bad.push('탭바 어긋남 '+vis.join(','));
  const cur=document.querySelector('#tabbar [aria-current="page"]'), map={vFind:'find',vSite:'site',vBook:'book'};
  if(vis.length===1&&map[vis[0]]&&(!cur||cur.dataset.nav!==map[vis[0]]))bad.push('탭 표시 어긋남 '+vis[0]+' vs '+(cur&&cur.dataset.nav));
  return {bad, d:(history.state&&history.state.d)||0}; }"""
QS=['지게차','주휴','톨루엔','성희롱','','비계, 안전난간','고평법 시행규칙','중처법 시행령 열사병','근로기준법 시행령','별표 5','없는말xyz']
log=open('monkey_%s.log'%F.replace('.html',''),'a',encoding='utf-8')
with sync_playwright() as pw:
    br=pw.chromium.launch()
    for seed in range(S0,S0+NS):
        rnd=random.Random(seed); c=br.new_context(viewport={'width':390,'height':844},service_workers='block'); p=c.new_page(); errs=[]; issue=None; trail=[]
        p.on('pageerror',lambda e: errs.append(str(e)))
        p.goto('http://127.0.0.1:%d/%s'%(PORT,F)); p.wait_for_selector('#vStart:not([hidden])')
        done=0
        for step in range(STEPS):
            x=rnd.random()
            if x<0.07:
                st=p.evaluate(CHECK)
                if st['d']>0: p.evaluate('history.back()'); trail.append('뒤로'); p.wait_for_timeout(130)
            elif x<0.17 and p.evaluate("!document.getElementById('vFind').hidden"):
                q=rnd.choice(QS); p.evaluate("(q)=>{const i=document.getElementById('q'); i.value=q; i.dispatchEvent(new Event('input',{bubbles:true}));}",q); trail.append('검색:'+q); p.wait_for_timeout(170)
            else:
                d=p.evaluate(CLICK,rnd.random()); trail.append(d); p.wait_for_timeout(35)
            st=p.evaluate(CHECK)
            if st['bad']:
                p.wait_for_timeout(500); st=p.evaluate(CHECK)   # 기록 이동 중인 잠깐의 상태는 한 번 더 확인
                if st['bad']: issue={'step':step,'bad':st['bad'],'trail':trail[-6:]}; break
            if errs: issue={'step':step,'pageerror':errs[:2],'trail':trail[-6:]}; break
            done+=1
        log.write(json.dumps({'seed':seed,'steps':done,'issue':issue},ensure_ascii=False)+'\n'); log.flush()
        print('seed',seed,'걸음',done,'문제' if issue else '이상 없음', json.dumps(issue,ensure_ascii=False) if issue else '')
        c.close()
    br.close()
