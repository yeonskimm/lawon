#!/usr/bin/env python3
# 법ON 법령 본문 대조(신구대조 보고서) — 2026. 9. 27. 신설
# - 법제처 국가법령정보 Open API(law.go.kr, 인증키 LAW_OC)로 수록 법령의 조문·별표를 받아
#   tools/law_snapshot/<코드>.json(앱이 반영한 기준본)과 조문별로 비교하고, 바뀐 조문을 보고서로 만든다.
# - 발견·보고만 한다. 앱 데이터(index.html)는 고치지 않는다(반영은 원문 확인 후 사람이 한다).
# - 사용: python3 tools/law_diff.py diff            → 주간 대조(보고서: law_diff_report.md)
#         python3 tools/law_diff.py base all|GK,OSH → 기준본 갱신(반영을 마친 법령만). all이면 앱 대조표도 만든다
# - 표준 라이브러리만 사용. 인증키는 어떤 파일·출력에도 남기지 않는다.
import datetime, difflib, hashlib, json, os, re, sys, time
import urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SNAP = os.path.join(HERE, 'law_snapshot')
BASE = 'https://www.law.go.kr/DRF/'
KST = datetime.timezone(datetime.timedelta(hours=9))
NOW = datetime.datetime.now(KST)
TODAY = NOW.strftime('%Y%m%d')
OC = os.environ.get('LAW_OC', '').strip()
DIAG = {}


class ApiError(Exception):
    pass


def scrub(s):
    s = str(s)
    return s.replace(OC, '***') if OC else s


# ───────── 통신 ─────────
def call(endpoint, params, kind='JSON', tries=3):
    q = dict(params, OC=OC, type=kind)
    url = BASE + endpoint + '?' + urllib.parse.urlencode(q)
    last = ''
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'lawon-law-diff'})
            with urllib.request.urlopen(req, timeout=60) as r:
                t = r.read().decode('utf-8', 'replace')
            if '검증에 실패' in t:
                raise ApiError('인증키·IP 검증 거절')
            if kind == 'JSON':
                s = t.lstrip()
                if not s.startswith('{'):
                    raise ApiError('JSON이 아닌 응답: ' + scrub(s[:120]))
                return json.loads(s)
            return ET.fromstring(t)
        except ApiError:
            raise
        except Exception as ex:
            last = '%s %s' % (type(ex).__name__, scrub(ex))
            if i < tries - 1:
                time.sleep(10 * (i + 1))
    raise ApiError('접속 실패(3회): ' + last)


def listify(v):
    if v is None or v == '':
        return []
    return v if isinstance(v, list) else [v]


def flat(v):
    if v is None:
        return ''
    if isinstance(v, str):
        return '' if v.startswith('<img') or v.startswith('</img') else v
    if isinstance(v, list):
        return '\n'.join(x for x in (flat(i) for i in v) if x)
    if isinstance(v, dict):
        return flat(v.get('content', ''))
    return str(v)


def nz(s):
    return ''.join(ch for ch in (s or '') if ch not in ' \u00b7\u318d\u2027\u30fb\t\n')


# ───────── 비교용 정규화 ─────────
TAG = re.compile(r'<[^<>]*>|\[[^\[\]]*(?:개정|신설|삭제|이동|종전|시행일|본조|제목)[^\[\]]*\]')


def norm(s):
    s = TAG.sub('', s or '')
    for a, b in (('“', '"'), ('”', '"'), ('‘', "'"), ('’', "'"), ('ㆍ', '·'), ('∙', '·'), ('•', '·'), ('〈', '<'), ('〉', '>')):
        s = s.replace(a, b)
    return re.sub(r'\s+', '', s)


def h(s):
    return hashlib.sha1(s.encode('utf-8')).hexdigest()[:12]


HEAD = re.compile(r'^\s*제\d+조(?:의\d+)?\s*(?:\((?:[^()]|\([^()]*\))*\))?\s*')


def art_key(no, br):
    no = str(int(no)) if str(no).isdigit() else str(no)
    br = str(br or '0').strip()
    return '제%s조' % no + ('의%d' % int(br) if br.isdigit() and int(br) else '')


def compose(u):
    out = []
    head = flat(u.get('조문내용')).strip()
    rest = HEAD.sub('', head, count=1).strip() if head else ''
    if rest:
        out.append(rest)

    def walk(node):
        if isinstance(node, list):
            for n in node:
                walk(n)
            return
        if not isinstance(node, dict):
            return
        for k in ('항내용', '호내용', '목내용'):
            if k in node:
                t = flat(node[k]).strip()
                if t:
                    out.append(t)
        for k in ('호', '목'):
            if k in node:
                walk(node[k])
    walk(u.get('항'))
    walk(u.get('호'))
    walk(u.get('목'))
    return '\n'.join(out)


def parse_law(j):
    L = j.get('법령') if isinstance(j, dict) else None
    if not isinstance(L, dict):
        raise ApiError('법령 본문 없음(응답 키: %s)' % ','.join(list(j)[:5]) if isinstance(j, dict) else '법령 본문 없음')
    arts = {}
    for u in listify((L.get('조문') or {}).get('조문단위')):
        if not isinstance(u, dict) or u.get('조문여부') != '조문' or not str(u.get('조문번호', '')).strip():
            continue
        k = art_key(u.get('조문번호'), u.get('조문가지번호'))
        arts[k] = {'t': flat(u.get('조문제목')).strip(), 'x': compose(u)}
    bts = {}
    for b in listify((L.get('별표') or {}).get('별표단위')):
        if not isinstance(b, dict) or (b.get('별표구분') or '별표') != '별표':
            continue
        n, g = str(b.get('별표번호', '')).lstrip('0') or '0', str(b.get('별표가지번호', '')).lstrip('0')
        k = '별표 %s' % n + ('의%s' % g if g else '')
        body = flat(b.get('별표내용'))
        bts[k] = {'t': flat(b.get('별표제목')).strip(), 'h': h(norm(body)) if body else ''}
    info = L.get('기본정보') or {}
    return {'arts': arts, 'bts': bts,
            'pno': str(info.get('공포번호', '')), 'ef': str(info.get('시행일자', ''))}


def parse_adm(root):
    arts, cur = {}, None
    for el in root.iter('조문내용'):
        for line in (el.text or '').strip().split('\n\n') if el.text else []:
            s = line.strip()
            m = re.match(r'^제(\d+)조(?:의(\d+))?\s*(?:\(((?:[^()]|\([^()]*\))*)\))?\s*', s)
            if m:
                cur = art_key(m.group(1), m.group(2))
                arts[cur] = {'t': (m.group(3) or '').strip(), 'x': s[m.end():].strip()}
            elif cur and s and not re.match(r'^제\d+(장|절|관)', s):
                arts[cur]['x'] += '\n' + s
    bts = {}
    for i, el in enumerate(root.iter('별표제목')):
        bts['별표 %d' % (i + 1)] = {'t': (el.text or '').strip(), 'h': ''}
    info = root.find('행정규칙기본정보')
    g = (lambda t: (info.findtext(t) or '').strip()) if info is not None else (lambda t: '')
    return {'arts': arts, 'bts': bts, 'pno': g('발령번호'), 'ef': g('시행일자')}


# ───────── 조회 ─────────
def law_versions(name):
    """→ (현행 {mst,id,pno,ef}|None, 시행예정 [{mst,id,pno,ef}])"""
    cur = None
    j = call('lawSearch.do', {'target': 'law', 'query': name, 'display': 100})
    for x in listify((j.get('LawSearch') or {}).get('law')):
        if nz(x.get('법령명한글')) == nz(name) and x.get('현행연혁코드', '현행') == '현행':
            cur = {'mst': str(x.get('법령일련번호')), 'id': str(x.get('법령ID')),
                   'pno': str(x.get('공포번호')), 'ef': str(x.get('시행일자'))}
            break
    pend = []
    try:
        j = call('lawSearch.do', {'target': 'eflaw', 'query': name, 'display': 100, 'nw': 2})
        rows = listify((j.get('LawSearch') or {}).get('law'))
        DIAG.setdefault('eflaw_sample', [scrub(json.dumps(r, ensure_ascii=False))[:400] for r in rows[:3]])
        seen = set()
        for x in rows:
            if x.get('현행연혁코드') != '시행예정':
                continue
            if nz(x.get('법령명한글')) != nz(name) and not (cur and str(x.get('법령ID')) == cur['id']):
                continue
            key = (str(x.get('법령일련번호')), str(x.get('시행일자')))
            if key in seen:
                continue
            seen.add(key)
            pend.append({'mst': key[0], 'id': str(x.get('법령ID')), 'pno': str(x.get('공포번호')), 'ef': key[1]})
    except ApiError as ex:
        raise ApiError('시행예정 목록 조회 실패 — ' + str(ex))
    pend.sort(key=lambda p: p['ef'])
    return cur, pend


def fetch_slice(ver, today=False):
    if today:
        try:
            j = call('lawService.do', {'target': 'eflaw', 'ID': ver['id'], 'efYd': TODAY})
            parse_law(j)
            DIAG.setdefault('today_path', 'eflaw ID+efYd')
        except ApiError as ex:
            DIAG['today_path'] = 'law MST 대체(%s)' % ex
            j = call('lawService.do', {'target': 'law', 'MST': ver['mst']})
    else:
        j = call('lawService.do', {'target': 'eflaw', 'MST': ver['mst'], 'efYd': ver['ef']})
    if 'raw_top' not in DIAG:
        L = j.get('법령', {}) if isinstance(j, dict) else {}
        us = listify((L.get('조문') or {}).get('조문단위'))
        DIAG['raw_top'] = list(j)[:10] if isinstance(j, dict) else str(type(j))
        DIAG['raw_law_keys'] = list(L)[:20]
        DIAG['raw_units'] = [scrub(json.dumps(u, ensure_ascii=False))[:1500] for u in us[:4]]
        bs = listify((L.get('별표') or {}).get('별표단위'))
        DIAG['raw_bt'] = [scrub(json.dumps({k: (v if k != '별표내용' else '(%d자)' % len(flat(v))) for k, v in b.items()}, ensure_ascii=False))[:600] for b in bs[:2]]
    p = parse_law(j)
    if not p['arts']:
        raise ApiError('조문 0건')
    return p


def adm_current(name):
    hits = []
    for q in dict.fromkeys([name, name.split('(')[0].strip()]):
        root = call('lawSearch.do', {'target': 'admrul', 'query': q, 'display': 50}, kind='XML')
        hits = list(root.iter('admrul'))
        if any(nz(x.findtext('행정규칙명')) == nz(name) for x in hits):
            break
    for x in hits:
        if nz(x.findtext('행정규칙명')) == nz(name) and (x.findtext('현행연혁구분') or '현행') == '현행':
            seq = (x.findtext('행정규칙일련번호') or '').strip()
            r = call('lawService.do', {'target': 'admrul', 'ID': seq}, kind='XML')
            if 'adm_top' not in DIAG:
                DIAG['adm_top'] = [c.tag for c in r][:15]
            p = parse_adm(r)
            if not p['arts']:
                raise ApiError('행정규칙 조문 0건')
            p['mst'] = seq
            return p
    raise ApiError('행정규칙 현행 검색 결과 없음')


# ───────── 앱 데이터 ─────────
def load_app():
    s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    m = re.search(r'<script id="data"[^>]*>(.*?)</script>', s, re.S)
    D = json.loads(m.group(1))
    idx = {}
    for a in D['arts']:
        idx[(a['l'], a['no'])] = a
    return D['meta']['laws'], idx


def app_note(code, key, new_x, app):
    a = app.get((code, key))
    if not a:
        return '앱 미수록'
    tags = []
    if a.get('s') or a.get('fn') or a.get('sn'):
        tags.append('벌칙·과태료 연결')
    target = norm(new_x)
    if a.get('chg'):
        c = a['chg']
        same = norm(c.get('x', '')) == target
        tags.append('앱에 개정 예정(%s) 수록 — %s' % (c.get('date', ''), '신 조문과 일치' if same else '🔵 신 조문과 다름'))
    elif a.get('fut'):
        tags.append('앱에 시행 예정 조문 수록 — ' + ('일치' if norm(a.get('x', '')) == target else '🔵 다름'))
    else:
        tags.append('앱 조문 ' + ('이미 일치' if norm(a.get('x', '')) == target else '🔴 수정 필요'))
    return ' · '.join(tags)


# ───────── 비교·보고 ─────────
def wdiff(a, b, ctx=8, limit=1500):
    A, B = (a or '').split(), (b or '').split()
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    parts = []
    ops = sm.get_opcodes()
    for i, (op, a1, a2, b1, b2) in enumerate(ops):
        if op == 'equal':
            seg = A[a1:a2]
            if len(seg) > ctx * 2:
                left = ' '.join(seg[:ctx]) if i > 0 else ''
                right = ' '.join(seg[-ctx:]) if i < len(ops) - 1 else ''
                parts.append(' … '.join(x for x in (left, right) if x) if (left and right) else (left + (' …' if left else '') if not right else '… ' + right))
            else:
                parts.append(' '.join(seg))
        else:
            if a2 > a1:
                parts.append('~~' + ' '.join(A[a1:a2]) + '~~')
            if b2 > b1:
                parts.append('**' + ' '.join(B[b1:b2]) + '**')
    s = ' '.join(p for p in parts if p)
    return s if len(s) <= limit else s[:limit] + ' …(생략)'


def compare(old, new):
    ch, add, rm = [], [], []
    for k, v in new['arts'].items():
        o = old['arts'].get(k)
        if o is None:
            add.append(k)
        elif norm(o['x']) != norm(v['x']) or norm(o['t']) != norm(v['t']):
            ch.append(k)
    rm = [k for k in old['arts'] if k not in new['arts']]
    bch = []
    for k, v in new['bts'].items():
        o = old['bts'].get(k)
        if o is None:
            bch.append((k, '신설', v['t']))
        elif (o['h'] and v['h'] and o['h'] != v['h']) or norm(o['t']) != norm(v['t']):
            bch.append((k, '변경', v['t']))
    for k, o in old['bts'].items():
        if k not in new['bts']:
            bch.append((k, '삭제', o['t']))
    return ch, add, rm, bch


def sortkey(k):
    m = re.match(r'제(\d+)조(?:의(\d+))?', k)
    return (int(m.group(1)), int(m.group(2) or 0)) if m else (99999, 0)


def section(code, name, label, old, new, app):
    ch, add, rm, bch = compare(old, new)
    if not (ch or add or rm or bch):
        return ''
    L = ['### %s — %s' % (name, label),
         '- 조문: 변경 %d · 신설 %d · 삭제 %d / 별표: %d' % (len(ch), len(add), len(rm), len(bch))]
    for k in sorted(ch, key=sortkey):
        o, n = old['arts'][k], new['arts'][k]
        L += ['<details><summary>%s(%s) — %s</summary>' % (k, n['t'] or o['t'], app_note(code, k, n['x'], app)), '']
        if norm(o['t']) != norm(n['t']):
            L.append('- 제목: ~~%s~~ → **%s**' % (o['t'], n['t']))
        L += ['- ' + wdiff(o['x'], n['x']), '', '</details>']
    for k in sorted(add, key=sortkey):
        n = new['arts'][k]
        L += ['<details><summary>%s(%s) 신설 — %s</summary>' % (k, n['t'], app_note(code, k, n['x'], app)), '',
              '- ' + (n['x'][:800] + (' …' if len(n['x']) > 800 else '')), '', '</details>']
    for k in sorted(rm, key=sortkey):
        L.append('- %s(%s) 조문 없어짐 — %s' % (k, old['arts'][k]['t'], '앱 수록' if (code, k) in app else '앱 미수록'))
    for k, how, t in bch:
        L.append('- %s(%s) %s — 원문 파일로 대조 필요' % (k, t, how))
    return '\n'.join(L) + '\n'


def snap_path(code):
    return os.path.join(SNAP, code + '.json')


def load_snap(code):
    try:
        return json.load(open(snap_path(code), encoding='utf-8'))
    except FileNotFoundError:
        return None


def ymd(s):
    s = re.sub(r'\D', '', s or '')
    return '%s. %d. %d.' % (s[:4], int(s[4:6]), int(s[6:8])) if len(s) == 8 else '-'


def get_state(code, meta):
    """→ {'cur': slice, 'pend': [slice...]}"""
    name = meta['name']
    if meta.get('adm'):
        p = adm_current(name)
        p['mst'] = p.get('mst', '')
        return {'cur': p, 'pend': []}
    cur, pend = law_versions(name)
    if cur:
        c = fetch_slice(cur, today=True)
        c.update(mst=cur['mst'], id=cur['id'], pno=c['pno'] or cur['pno'])
    elif pend:
        first = pend.pop(0)
        c = fetch_slice(first)
        c.update(mst=first['mst'], id=first['id'], pno=first['pno'], ef=first['ef'], pending_as_cur=1)
    else:
        raise ApiError('법제처 현행·시행예정 검색 결과 없음')
    ps = []
    for v in pend:
        s = fetch_slice(v)
        s.update(mst=v['mst'], pno=v['pno'], ef=v['ef'])
        ps.append(s)
    return {'cur': c, 'pend': ps}


def whole(p):
    return h(json.dumps({k: norm(v['x']) + '|' + norm(v['t']) for k, v in sorted(p['arts'].items())}, ensure_ascii=False))


def cmd_diff(codes, metas, app):
    secs, fails, pend_new = [], [], 0
    for code in codes:
        meta = metas[code]
        snap = load_snap(code)
        if not snap:
            fails.append('%s: 기준본 없음 — base 실행 필요' % meta['name'])
            continue
        try:
            st = get_state(code, meta)
        except ApiError as ex:
            fails.append('%s: %s' % (meta['name'], ex))
            continue
        old = snap['cur']
        c = st['cur']
        if whole(c) != whole(old):
            acked = {p['h']: p for p in snap.get('pend', [])}
            lab = ('예정 개정 시행됨(%s) — 확인 후 기준 갱신' % ymd(acked[whole(c)]['ef'])) if whole(c) in acked else \
                  ('현행 변경(공포번호 %s, 시행 %s)' % (c.get('pno') or '-', ymd(c.get('ef'))))
            secs.append(section(code, meta['name'], lab, old, c, app))
        known = {(p['mst'], p['ef']) for p in snap.get('pend', [])}
        for p in st['pend']:
            if (p['mst'], p['ef']) in known:
                continue
            pend_new += 1
            secs.append(section(code, meta['name'], '새 시행 예정 개정(공포번호 %s, 시행 %s)' % (p['pno'] or '-', ymd(p['ef'])), old, p, app)
                        or '### %s — 새 시행 예정 개정(공포번호 %s, 시행 %s)\n- 조문 차이 없음(부칙 등만 변경으로 보임)\n' % (meta['name'], p['pno'] or '-', ymd(p['ef'])))
    secs = [s for s in secs if s]
    body = ''.join(s + '\n' for s in secs)
    if fails:
        body += '### 조회 실패\n' + ''.join('- %s\n' % f for f in fails)
    sig = h(norm(body))
    head = '법ON 법령 대조 %s — ' % NOW.strftime('%Y. %-m. %-d.')
    title = head + ('%d건 확인 필요' % len(secs) if secs else ('조회 실패 %d건' % len(fails) if fails else '변경 없음'))
    guide = ('- 🔴 수정 필요: 앱 조문을 고쳐야 함 / 🔵 다름: 앱의 개정 예정 조문과 법제처 조문이 다름\n'
             '- ~~지운 부분~~ **추가된 부분** (띄어쓰기 단위 비교)\n'
             '- 반영을 마치면 Actions → 법령 본문 대조 → Run workflow에서 mode=base, codes=해당 코드로 기준본 갱신\n\n')
    rep = '## ' + title + '\n' + (guide if secs else '') + body + '\n<!-- law-diff:%s -->\n' % sig
    open(os.path.join(ROOT, 'law_diff_report.md'), 'w', encoding='utf-8').write(rep)
    short = rep if len(rep) <= 60000 else (rep[:58000] + '\n\n</details>\n\n…(길어서 생략 — 전체는 이 실행의 Actions 요약 화면에 있음)\n<!-- law-diff:%s -->\n' % sig)
    open(os.path.join(ROOT, 'law_diff_issue.md'), 'w', encoding='utf-8').write(short)
    open(os.path.join(ROOT, 'law_diff_title.txt'), 'w', encoding='utf-8').write(title)
    alert = bool(secs or fails)
    status = 'error' if fails and len(fails) >= max(3, len(codes) // 2) else 'ok'
    out(alert=int(alert), sig=sig, status=status)
    print(rep)


def audit(code, meta, cur, app):
    """앱 조문 ↔ 법제처 현행(오늘 시행) 1회 대조"""
    mine = {k[1]: a for k, a in app.items() if k[0] == code}
    same = diff = 0
    rows, only_app = [], []
    for no, a in sorted(mine.items(), key=lambda x: sortkey(x[0])):
        if a.get('fut'):
            continue
        x = a['x']
        c = a.get('chg')
        if c and c.get('date', '9') <= NOW.strftime('%Y-%m-%d'):
            x = c.get('x', x)
        n = cur['arts'].get(no)
        if n is None:
            only_app.append(no)
        elif norm(x) == norm(n['x']):
            same += 1
        else:
            diff += 1
            rows.append('<details><summary>%s(%s)</summary>\n\n- %s\n\n</details>' % (no, n['t'], wdiff(x, n['x'], ctx=6, limit=900)))
    only_api = [k for k in cur['arts'] if k not in mine and not re.search(r'삭제', cur['arts'][k]['x'][:20])]
    s = '### %s (%s)\n- 일치 %d · 다름 %d · 앱에만 %d · 법제처에만 %d\n' % (meta['name'], code, same, diff, len(only_app), len(only_api))
    if only_app:
        s += '- 앱에만: ' + ', '.join(only_app[:30]) + (' …' if len(only_app) > 30 else '') + '\n'
    if only_api:
        s += '- 법제처에만(앱 미수록): ' + ', '.join(sorted(only_api, key=sortkey)[:30]) + (' …' if len(only_api) > 30 else '') + '\n'
    return s + '\n'.join(rows) + '\n', (same, diff)


def cmd_base(codes, metas, app, do_audit):
    os.makedirs(SNAP, exist_ok=True)
    done, fails, aud, tot = [], [], [], [0, 0]
    for code in codes:
        meta = metas[code]
        try:
            st = get_state(code, meta)
        except ApiError as ex:
            fails.append('%s(%s): %s' % (meta['name'], code, ex))
            continue
        c = st['cur']
        snap = {'code': code, 'name': meta['name'], 'updated': NOW.strftime('%Y-%m-%d'),
                'cur': {k: c.get(k) for k in ('mst', 'id', 'pno', 'ef', 'arts', 'bts', 'pending_as_cur') if c.get(k) is not None},
                'pend': [{'mst': p['mst'], 'pno': p['pno'], 'ef': p['ef'], 'h': whole(p)} for p in st['pend']]}
        with open(snap_path(code), 'w', encoding='utf-8') as f:
            f.write(scrub(json.dumps(snap, ensure_ascii=False, indent=0, sort_keys=True)))
        done.append('%s(%s) 조문 %d · 별표 %d · 시행예정 %d' % (meta['name'], code, len(c['arts']), len(c['bts']), len(st['pend'])))
        if do_audit:
            s, (a, b) = audit(code, meta, c, app)
            aud.append(s)
            tot[0] += a
            tot[1] += b
    rep = '## 기준본 갱신 %s\n' % NOW.strftime('%Y. %-m. %-d.') + ''.join('- %s\n' % d for d in done)
    if fails:
        rep += '\n### 실패\n' + ''.join('- %s\n' % f for f in fails)
    if do_audit:
        a = ('# 앱 ↔ 법제처 현행 조문 대조 (%s)\n' % NOW.strftime('%Y. %-m. %-d.') +
             '- 비교: 띄어쓰기·개정표시(<개정 …>, [본조신설 …])·따옴표·가운뎃점 차이 무시. 시행 전 조문(fut) 제외\n'
             '- 전체: 일치 %d · 다름 %d\n\n' % tuple(tot) + '\n'.join(aud))
        open(os.path.join(SNAP, '_app_audit.md'), 'w', encoding='utf-8').write(scrub(a))
    json.dump(DIAG, open(os.path.join(SNAP, '_diag.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(ROOT, 'law_diff_report.md'), 'w', encoding='utf-8').write(rep)
    out(changed=int(bool(done)), status='error' if fails else 'ok')
    print(rep)


def out(**kw):
    p = os.environ.get('GITHUB_OUTPUT')
    if p:
        with open(p, 'a') as f:
            for k, v in kw.items():
                f.write('%s=%s\n' % (k, v))


def main():
    if not OC:
        print('LAW_OC 비밀값이 없습니다.')
        out(status='error')
        sys.exit(1)
    mode = sys.argv[1] if len(sys.argv) > 1 else 'diff'
    arg = (sys.argv[2] if len(sys.argv) > 2 else 'all').strip() or 'all'
    metas, app = load_app()
    vers = json.load(open(os.path.join(HERE, 'law_versions.json'), encoding='utf-8'))
    allc = list(metas)
    codes = allc if arg.lower() == 'all' else [c.strip().upper() for c in arg.split(',') if c.strip()]
    bad = [c for c in codes if c not in metas]
    if bad:
        print('모르는 코드:', ', '.join(bad), '/ 가능한 코드:', ', '.join(allc))
        out(status='error')
        sys.exit(1)
    if mode == 'base':
        cmd_base(codes, metas, app, do_audit=(arg.lower() == 'all'))
    else:
        cmd_diff(codes, metas, app)


if __name__ == '__main__':
    main()
