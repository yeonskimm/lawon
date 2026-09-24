#!/usr/bin/env python3
# 배포 직전 배포본 index.html의 <script id="lawmeta"> 칸에 tools/law_meta.json(법제처 현행 공포번호·시행일)을 넣는다.
# - 어떤 문제가 있어도 배포를 막지 않는다: 오류면 경고만 찍고 파일을 그대로 둔다(앱은 수록 원문 기준 표기로 동작).
# - 사용: python3 tools/inject_meta.py _site/index.html tools/law_meta.json
import json, re, sys

def main(html_path, meta_path):
    try:
        meta = json.load(open(meta_path, encoding='utf-8'))
        laws = meta.get('laws')
        assert isinstance(laws, dict)
        for k, v in laws.items():   # 앱이 믿고 쓰는 형식만 통과
            assert re.fullmatch(r'[A-Z]{1,8}', k) and re.fullmatch(r'\d+', v.get('no', '')) \
                and re.fullmatch(r'\d{8}', v.get('eff', '')) and len(v.get('kind', '')) <= 12, k
    except Exception as ex:
        print('::warning::law_meta.json을 읽지 못해 넣지 않음 (%s)' % ex); return
    if not laws:
        print('법령 표기 정보 없음 — 원문 기준 표기로 배포'); return
    html = open(html_path, encoding='utf-8').read()
    tag = '<script id="lawmeta" type="application/json">'
    i = html.find(tag); j = html.find('</script>', i)
    if i < 0 or j < 0 or html.count(tag) != 1:
        print('::warning::index.html에 lawmeta 칸이 없어 넣지 않음'); return
    body = json.dumps({'updated': meta.get('updated', ''), 'laws': laws}, ensure_ascii=False).replace('</', '<\\/')
    html = html[:i + len(tag)] + body + html[j:]
    open(html_path, 'w', encoding='utf-8').write(html)
    print('법령 표기 정보 %d개 넣음 (갱신 %s)' % (len(laws), meta.get('updated', '')))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
