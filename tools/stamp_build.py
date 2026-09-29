#!/usr/bin/env python3
# 배포본 index.html에 앱 파일 반영 정보(마지막으로 앱 파일을 바꾼 커밋 번호·시각)를 넣는다. 2026-09-29
# - 관리자 화면 맨 아래 '앱 반영 abc1234 · 2026. 9. 29. 21:05 · 캐시 lawon-v7'과 설정의 '최종 업데이트'에 쓰임
# - 앱 파일(index.html·service-worker.js·manifest.json·아이콘)을 바꾼 커밋 기준: README 등만 올리면 같은 값이 들어가
#   배포본 index.html이 바뀌지 않음 → 설치된 앱에 불필요한 '업데이트' 알림이 뜨지 않음
# - 사용: python3 tools/stamp_build.py _site/index.html <커밋 SHA> <커밋 시각 YYYY-MM-DDTHH:MM, KST>
#         python3 tools/stamp_build.py --check index.html   (테스트 단계: 넣을 자리가 정확히 한 곳인지)
# - 넣을 자리가 없거나 둘 이상이면 실패 → 배포 중단(옛 화면 유지). 앱 코드를 고치다 자리를 지웠을 때 알기 위함
import json, re, sys

MARK = 'var BUILD={"sha":"","at":"","app":""};'

def main():
    if sys.argv[1] == '--check':
        n = open(sys.argv[2], encoding='utf-8').read().count(MARK)
        print('배포 정보 자리 %d곳' % n); sys.exit(0 if n == 1 else 1)
    path, sha, when = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else '')
    if not re.fullmatch(r'[0-9a-f]{7,40}', sha): print('커밋 번호 형식 오류: %r' % sha); sys.exit(1)
    m = re.fullmatch(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', when)
    if not m: print('커밋 시각 형식 오류: %r' % when); sys.exit(1)
    y, mo, d, hh, mi = m.groups()
    at = '%d. %d. %d. %s:%s' % (int(y), int(mo), int(d), hh, mi)
    html = open(path, encoding='utf-8').read()
    if html.count(MARK) != 1: print('index.html에 배포 정보 자리가 %d곳 — 중단' % html.count(MARK)); sys.exit(1)
    html = html.replace(MARK, 'var BUILD=' + json.dumps({'sha': sha, 'at': at, 'app': '%s-%s-%s' % (y, mo, d)}, ensure_ascii=False) + ';')
    open(path, 'w', encoding='utf-8').write(html)
    print('앱 반영 정보 넣음: %s · %s' % (sha[:7], at))

if __name__ == '__main__':
    main()
