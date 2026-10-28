# 나이트 모드 스타일 만들기: 밝은 기본 스타일(styles.css, backstage/backstage.css)과
# 어두운 원본(scripts/theme-dark-source*.css)을 규칙별로 비교해, 색이 다른 선언만
# html[data-theme="dark"] 아래로 덮어쓰는 theme-dark.css 를 만든다.
#   python3 scripts/build-dark-theme.py
# 밝은 스타일에 새 규칙을 더하면 나이트에서는 밝은 색 그대로 보이니, 어두운 원본에도 같은 규칙을 넣고 다시 돌린다.
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = 'html[data-theme="dark"]'
COLORISH = re.compile(r'^(background|background-color|background-image|color|border|border-color|border-top|border-bottom|border-left|border-right|box-shadow|text-shadow|outline|outline-color|fill|stroke|filter|caret-color|text-decoration-color|accent-color)$')

def strip_comments(s): return re.sub(r'/\*.*?\*/', '', s, flags=re.S)

def parse(s, ctx=()):
    """[(context, selector, [(prop, value)])] 순서대로. @media 는 context 로, @keyframes 등은 건너뛴다."""
    out, i, n = [], 0, len(s)
    while i < n:
        j = s.find('{', i)
        if j < 0: break
        head = s[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if s[k] == '{': depth += 1
            elif s[k] == '}': depth -= 1
            k += 1
        body = s[j + 1:k - 1]
        if head.startswith('@media') or head.startswith('@supports'):
            out += parse(body, ctx + (head,))
        elif head.startswith('@'):
            pass
        else:
            decls = []
            for d in re.split(r';(?![^(]*\))', body):
                if ':' in d:
                    p, v = d.split(':', 1); decls.append((p.strip(), v.strip()))
            out.append((ctx, head, decls))
        i = k
    return out

def scope(sel):
    parts = re.split(r',(?![^(]*\))', sel)
    res = []
    for p in parts:
        p = p.strip()
        if p.startswith(':root'): res.append(P + p[5:])
        elif p == 'html' or p.startswith('html'): res.append(P + p[4:])
        else: res.append(P + ' ' + p)
    return ','.join(res)

def build(light_path, dark_path):
    L = parse(strip_comments(open(light_path, encoding='utf8').read()))
    D = parse(strip_comments(open(dark_path, encoding='utf8').read()))
    dmap = {}
    for ctx, sel, decls in D: dmap.setdefault((ctx, sel), {}).update(dict(decls))
    rules, missing = [], 0
    for ctx, sel, decls in L:
        dd = dmap.get((ctx, sel))
        if dd is None: missing += 1; continue
        # 덮어쓰기 규칙은 앞에 html[data-theme] 가 붙어 우선순위가 높아진다. 그래서 바뀐 색뿐 아니라
        # 색 관련 선언은 모두 다시 써서(원래 순서 그대로) .button 이 .button.primary 를 이기는 일이 없게 한다
        diff = [(p, dd[p]) for p, v in decls if p in dd and (dd[p] != v or COLORISH.search(p))]
        if diff: rules.append((ctx, scope(sel), diff))
    return rules, missing

def emit(rules):
    out, cur = [], None
    for ctx, sel, diff in rules:
        body = sel + '{' + ';'.join(p + ':' + v for p, v in diff) + '}'
        for c in reversed(ctx): body = c + '{' + body + '}'
        out.append(body)
    return '\n'.join(out)

r1, m1 = build(f'{ROOT}/styles.css', f'{ROOT}/scripts/theme-dark-source.css')
r2, m2 = build(f'{ROOT}/backstage/backstage.css', f'{ROOT}/scripts/theme-dark-source-backstage.css')
head = ('/* 나이트 모드: scripts/build-dark-theme.py 가 만든 파일 (직접 고치지 말고 스크립트를 다시 돌린다).\n'
        '   html[data-theme="dark"] 일 때 밝은 기본 스타일의 색만 어두운 버전으로 덮어쓴다. */\n')
extra = (P + '{--accent-text:#cbbcff}\n'
         + P + ' .only-light{display:none!important}\n'
         + 'html:not([data-theme="dark"]) .only-dark{display:none!important}\n')
open(f'{ROOT}/theme-dark.css', 'w', encoding='utf8').write(head + extra + emit(r1) + '\n')
open(f'{ROOT}/backstage/theme-dark.css', 'w', encoding='utf8').write(head + emit(r2) + '\n')
print('styles: %d rules (light-only rules %d) · backstage: %d rules (light-only %d)' % (len(r1), m1, len(r2), m2))
