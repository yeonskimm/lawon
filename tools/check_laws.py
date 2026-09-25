#!/usr/bin/env python3
# 법ON 법령 개정 점검: 공공데이터포털 '법제처 국가법령정보 공유서비스'(법령정보 목록 조회)로
# 수록 법령의 공포번호를 조회해 tools/law_versions.json(앱이 반영한 공포번호)과 비교한다.
# - 발견만 하고 앱 데이터는 고치지 않는다(반영은 원문 확인 후 사람이 한다).
# - 인증키: 환경변수 LAW_API_KEY (GitHub 저장소 Secrets). 표준 라이브러리만 사용.
# - 2026-09-24: 법령집 표기용 tools/law_meta.json 갱신 추가. 법제처 현행 버전(이미 시행된 것 중 시행일이 가장 늦은 것)의
#   공포번호가 기준표 known에 있을 때만 적는다(앱이 반영하지 않은 개정의 날짜는 표시하지 않음). 바뀐 경우에만 파일을 쓴다.
# - 2026-09-25: 기준표에 시행일(eff)이 있는 제정 법령은 시행일 전까지 '조회되지 않음' 알림에서 뺀다
#   (예: 노동감독관 직무집행법 — 시행 전이라 법제처 현행 목록에 없어 매주 거짓 알림이 났음). 시행일부터는 평소처럼 대조.
import json, os, sys, time, datetime, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

URL = 'https://apis.data.go.kr/1170000/law/lawSearchList.do'
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


def fetch(key, name):
    q = urllib.parse.urlencode({'serviceKey': key, 'target': 'law', 'query': name, 'numOfRows': 50, 'pageNo': 1})
    req = urllib.request.Request(URL + '?' + q, headers={'User-Agent': 'lawon-law-check'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


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
    if '%' in key:   # 'Encoding' 키를 넣은 경우 한 번 풀어서 사용(두 번 인코딩 방지)
        key = urllib.parse.unquote(key)
    base = json.load(open(os.path.join(HERE, 'law_versions.json'), encoding='utf-8'))
    new, miss, err, ok, reg, pend = [], [], [], [], [], []
    meta_new = {}   # code → 법령집 표기 정보
    if not key:
        err.append('인증키(LAW_API_KEY)가 등록되지 않았습니다. 저장소 Settings → Secrets and variables → Actions 확인')
    for L in (base['laws'] if key else []):
        try:
            recs, e = parse(fetch(key, L['name']))
        except Exception as ex:   # 네트워크·차단 등
            recs, e = [], '%s: %s' % (type(ex).__name__, ex)
        if e:
            err.append('%s — %s' % (L['name'], e))
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
        body += ['- %s' % e for e in err]
        if any('DEADLINE' in e for e in err):
            body.append('\n인증키 사용 기한이 끝났습니다. 공공데이터포털 마이페이지에서 활용기간 연장 신청.')
    body.append('\n---\n점검일 %s · 대조 %d건 · 이상 없음 %d건' % (TODAY, len(ok) + len(new), len(ok)))
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
