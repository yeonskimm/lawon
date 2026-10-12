#!/usr/bin/env python3
# 법ON 법령 개정 점검: 공공데이터포털 '법제처 국가법령정보 공유서비스'(법령정보 목록 조회)로
# 수록 법령의 공포번호를 조회해 tools/law_versions.json(앱이 반영한 공포번호)과 비교한다.
# - 발견만 하고 앱 데이터는 고치지 않는다(반영은 원문 확인 후 사람이 한다).
# - 인증키: 환경변수 LAW_API_KEY (GitHub 저장소 Secrets). 표준 라이브러리만 사용.
# - 2026-09-24: 법령집 표기용 tools/law_meta.json 갱신 추가. 법제처 현행 버전(이미 시행된 것 중 시행일이 가장 늦은 것)의
#   공포번호가 기준표 known에 있을 때만 적는다(앱이 반영하지 않은 개정의 날짜는 표시하지 않음). 바뀐 경우에만 파일을 쓴다.
# - 2026-09-25: 기준표에 시행일(eff)이 있는 제정 법령은 시행일 전까지 '조회되지 않음' 알림에서 뺀다
#   (예: 노동감독관 직무집행법 — 시행 전이라 법제처 현행 목록에 없어 매주 거짓 알림이 났음). 시행일부터는 평소처럼 대조.
# - 2026-10-12: 공공데이터포털(apis.data.go.kr) 접속이 GitHub에서 시간 초과로 막혀 점검 전체가 멈춘 일이 있었음
#   → 접속 실패 시 법제처 Open API(law.go.kr DRF, 비밀값 LAW_OC — 법령 본문 대조와 같은 키)로 같은 목록을 받아 계속 점검.
#   한 번 대체로 바뀌면 나머지 법령도 대체로 조회(법령마다 2분씩 기다리지 않게). 보고서 오류 문구의 <…>는 이스케이프.
import html, json, os, sys, time, datetime, urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

URL = 'https://apis.data.go.kr/1170000/law/lawSearchList.do'
DRF = 'https://www.law.go.kr/DRF/lawSearch.do'
FIELDS = ('법령명한글', '법령구분명', '제개정구분명', '공포번호', '공포일자', '시행일자')
HERE = os.path.dirname(os.path.abspath(__file__))
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).strftime('%Y%m%d')


def nz(s):   # 법령명 비교: 띄어쓰기·가운뎃점 차이 무시
    return ''.join(ch for ch in (s or '') if ch not in ' \u00b7\u318d\u2027\u30fb\t\n')


def num(s):
    s = ''.join(ch for ch in (s or '') if ch.isdigit())
    return str(int(s)) if s else ''


def ymd(s):
    s = num(s).zfill(8) if s else ''
    return '%s.%s.%s.' % (s[:4], int(s[4:6]), int(s[6:8])) if len(s) == 8 and s != '00000000' else '-'


def fetch(key, name, tries=3):
    # 2026-09-25: 법제처 서버 접속이 가끔 한 번씩 끊김(SSL handshake timeout) → 10초·20초 쉬고 최대 3번까지 다시 시도
    q = urllib.parse.urlencode({'serviceKey': key, 'target': 'law', 'query': name, 'numOfRows': 50, 'pageNo': 1})
    req = urllib.request.Request(URL + '?' + q, headers={'User-Agent': 'lawon-law-check'})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as ex:
            if isinstance(ex, urllib.error.HTTPError) and ex.code < 500:
                raise   # 인증키·요청 오류는 다시 해도 같음
            if i == tries - 1:
                raise
            time.sleep(10 * (i + 1))


def fetch_drf(oc, name, tries=3):
    """법제처 Open API eflaw 검색(현행 nw=3 + 시행예정 nw=2) → 공공데이터포털과 같은 모양의 기록 목록."""
    recs, seen = [], set()
    for nw in (3, 2):
        q = urllib.parse.urlencode({'OC': oc, 'target': 'eflaw', 'type': 'JSON', 'query': name, 'display': 100, 'nw': nw})
        req = urllib.request.Request(DRF + '?' + q, headers={'User-Agent': 'lawon-law-check'})
        for i in range(tries):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    t = r.read().decode('utf-8', 'replace')
                break
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as ex:
                if isinstance(ex, urllib.error.HTTPError) and ex.code < 500:
                    raise
                if i == tries - 1:
                    raise
                time.sleep(10 * (i + 1))
        if '검증에 실패' in t:
            raise RuntimeError('법제처 Open API 인증키(LAW_OC)·IP 검증 거절')
        try:
            rows = (json.loads(t).get('LawSearch') or {}).get('law') or []
        except ValueError:
            raise RuntimeError('법제처 Open API 응답을 읽을 수 없음: ' + t[:120].replace(oc, '***'))
        if isinstance(rows, dict):
            rows = [rows]
        for x in rows:
            if nw == 3 and x.get('현행연혁코드') not in (None, '현행'):
                continue
            if nw == 2 and x.get('현행연혁코드') not in (None, '시행예정'):
                continue
            rec = {k: str(x.get(k) or '').strip() for k in FIELDS}
            k = (rec['공포번호'], rec['시행일자'], nz(rec['법령명한글']))
            if k not in seen:
                seen.add(k); recs.append(rec)
        time.sleep(0.3)
    return recs


def parse(raw):
    """→ (기록 목록, 오류 문구). 게이트웨이 오류 응답(OpenAPI_ServiceResponse)도 잡는다."""
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return [], '응답을 읽을 수 없음: ' + raw[:200].decode('utf-8', 'replace')
    recs = []
    for el in root.iter():
        kids = {c.tag: (c.text or '').strip() for c in el}
        if '법령명한글' in kids:
            recs.append(kids)
    if recs:
        return recs, ''
    txt = {el.tag: (el.text or '').strip() for el in root.iter()}
    code = txt.get('resultCode') or txt.get('returnReasonCode') or ''
    msg = txt.get('returnAuthMsg') or txt.get('resultMsg') or txt.get('errMsg') or ''
    if code and code not in ('00', '0'):
        return [], '오류 %s %s' % (code, msg)
    return [], ''


def main():
    key = os.environ.get('LAW_API_KEY', '').strip()
    oc = os.environ.get('LAW_OC', '').strip()
    use_drf = not key and bool(oc)   # 공공데이터포털 키가 없으면 처음부터 법제처 Open API
    drf_note = ''
    if '%' in key:   # 'Encoding' 키를 넣은 경우 한 번 풀어서 사용(두 번 인코딩 방지)
        key = urllib.parse.unquote(key)
    base = json.load(open(os.path.join(HERE, 'law_versions.json'), encoding='utf-8'))
    new, miss, err, ok, reg, pend = [], [], [], [], [], []
    meta_new = {}   # code → 법령집 표기 정보
    if not key and not oc:
        err.append('인증키(LAW_API_KEY·LAW_OC)가 등록되지 않았습니다. 저장소 Settings → Secrets and variables → Actions 확인')
    down = 0   # 연속 접속 실패 수
    for L in (base['laws'] if (key or oc) else []):
        recs, e = [], ''
        if not use_drf:
            try:
                recs, e = parse(fetch(key, L['name']))
                down = 0
            except Exception as ex:   # 네트워크·차단 등(3번 다시 시도한 뒤)
                e = '%s: %s' % (type(ex).__name__, ex)
                if oc and not (isinstance(ex, urllib.error.HTTPError) and ex.code < 500):
                    use_drf = True   # 이 법령부터 법제처 Open API로
                    drf_note = '공공데이터포털 접속 실패(%s 조회 중 — %s)로 %s부터 법제처 Open API(law.go.kr)로 조회했습니다.' % (L['name'], e, L['name'])
                else:
                    down += 1
        if use_drf:
            try:
                recs, e = fetch_drf(oc, L['name']), ''
                down = 0
            except Exception as ex:
                recs, e = [], '%s: %s (법제처 Open API)' % (type(ex).__name__, str(ex).replace(oc, '***'))
                down += 1
        if e:
            err.append('%s — %s' % (L['name'], e))
            if down >= 2:   # 연달아 두 법령이 접속 실패면 서버 장애로 보고 중단(작업 시간 10분 제한 안에 보고서를 남기기 위해)
                err.append('법제처 서버 접속이 계속 실패해 나머지 법령 점검을 멈췄습니다. 잠시 뒤 Actions에서 다시 실행하세요.')
                break
            if 'SERVICE_KEY' in e or 'DEADLINE' in e or 'ACCESS_DENIED' in e:
                break   # 키 문제면 나머지도 같은 결과
            continue
        mine = [r for r in recs if nz(r.get('법령명한글')) == nz(L['name'])]
        if not mine:
            if (num(L.get('eff', '')) or '0').zfill(8) > TODAY:   # 시행 전 제정 법령: 현행 목록에 아직 없음(정상)
                pend.append(L); continue
            miss.append(L['name']); continue
        known = set(num(x) for x in L['known'])
        cur = [r for r in mine if num(r.get('시행일자')) and num(r.get('시행일자')).zfill(8) <= TODAY]
        if cur:
            c = max(cur, key=lambda r: (num(r.get('시행일자')).zfill(8), num(r.get('공포일자')).zfill(8), int(num(r.get('공포번호')) or 0)))
            if num(c.get('공포번호')) in known:
                meta_new[L['code']] = {'kind': c.get('법령구분명', ''), 'no': num(c.get('공포번호')),
                                       'prom': num(c.get('공포일자')).zfill(8), 'eff': num(c.get('시행일자')).zfill(8)}
        for r in mine:
            no = num(r.get('공포번호'))
            line = '%s %s 제%s호 · %s · 공포 %s · 시행 %s%s' % (
                L['name'], r.get('법령구분명', ''), no, r.get('제개정구분명', ''),
                ymd(r.get('공포일자')), ymd(r.get('시행일자')),
                ' (시행 전)' if num(r.get('시행일자')) > TODAY else '')
            (reg if not known else ok if no in known else new).append((L, line))
        time.sleep(0.3)   # 초당 호출 한도 여유

    title, body = '', []
    if new:
        title = '법령 개정 확인 필요 (%d건)' % len(new)
        body.append('## 앱에 반영되지 않은 공포번호\n')
        body += ['- %s' % ln for _, ln in new]
        body.append('\n**할 일**: 국가법령정보센터에서 해당 법령 원문을 받아 프로젝트에 올리고, 반영 요청.')
    if reg:
        title = title or '법령 점검: 기준 공포번호 등록 필요'
        body.append('\n## 기준표에 번호가 없는 법령(현재 번호를 기준표에 등록)\n')
        body += ['- %s' % ln for _, ln in reg]
    if miss:
        title = title or '법령 점검: 법령명 확인 필요'
        body.append('\n## 조회되지 않은 법령명\n')
        body += ['- %s (법령명 변경·폐지 여부 확인)' % n for n in miss]
    if err:
        title = '법령 점검 실패' if not new else title
        body.append('\n## 점검 오류\n')
        body += ['- %s' % html.escape(e, quote=False) for e in err]
        if any('DEADLINE' in e for e in err):
            body.append('\n인증키 사용 기한이 끝났습니다. 공공데이터포털 마이페이지에서 활용기간 연장 신청.')
    body.append('\n---\n점검일 %s · 대조 %d건 · 이상 없음 %d건' % (TODAY, len(ok) + len(new), len(ok)))
    if drf_note:
        body.append('\n' + html.escape(drf_note, quote=False))
    if pend:
        body.append('\n시행 전이라 조회 제외: ' + ', '.join('%s(%s 시행)' % (L['name'], ymd(L['eff'])) for L in pend))
    if ok:
        body.append('\n<details><summary>이상 없는 법령</summary>\n\n' + '\n'.join('- %s' % ln for _, ln in ok) + '\n</details>')
    # 법령집 표기 정보: 조회에 성공한 법령만 갱신, 나머지는 이전 값 유지
    mpath = os.path.join(HERE, 'law_meta.json')
    try:
        meta = json.load(open(mpath, encoding='utf-8'))
    except Exception:
        meta = {'updated': '', 'laws': {}}
    old = meta.get('laws') or {}
    diff = sorted(k for k, v in meta_new.items() if old.get(k) != v)
    changed = bool(diff)
    if changed:
        laws = dict(old); laws.update(meta_new)
        meta = {'updated': '%s-%s-%s' % (TODAY[:4], TODAY[4:6], TODAY[6:]), 'laws': dict(sorted(laws.items()))}
        open(mpath, 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
        body.append('\n법령집 표기(공포번호·시행일) 갱신: ' + ', '.join(diff))
    report = '\n'.join(body)
    print(title or '이상 없음'); print(report)

    open('report.md', 'w', encoding='utf-8').write(report)
    open('title.txt', 'w', encoding='utf-8').write(title)
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as f:
            f.write('alert=%s\nstatus=%s\nmeta_changed=%s\n' % ('1' if title else '0', 'error' if err else 'ok', '1' if changed else '0'))
    summ = os.environ.get('GITHUB_STEP_SUMMARY')
    if summ:
        with open(summ, 'a', encoding='utf-8') as f:
            f.write('# ' + (title or '법령 점검: 이상 없음') + '\n\n' + report + '\n')


if __name__ == '__main__':
    main()
