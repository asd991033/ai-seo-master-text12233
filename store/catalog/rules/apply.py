"""依 catalog/rules/subcategories.json 的規則，重新整理 catalog/hicustom.json 的大分類與子分類，並更新英文名稱。

在 store/ 目錄執行：python3 catalog/rules/apply.py，之後重新部署就會套用。

步驟：
1. 每件商品以「原始大分類」（第一次執行時記在 categoryOriginal）為準，先套用 _move（整個分類併到另一個）。
2. 用該分類的名稱規則找出子分類；少於 3 件的子分類不獨立。
3. 套用 _regroup：把太大的分類依子分類拆成幾個新的大分類。
4. 套用 _rename：分類改名（網址不變，由匯入程式的 CATEGORY_RENAMES 負責沿用原本的分類）。
"""
import json, re, collections

rules = json.load(open('catalog/rules/subcategories.json'))
d = json.load(open('catalog/hicustom.json'))
ps = d['products']
move, regroup, rename = rules.get('_move', {}), rules.get('_regroup', {}), rules.get('_rename', {})

def pick(base, name):
    n = re.sub(r'^客製化', '', name)
    for sub, en, rx in rules.get(base, []):
        if re.search(rx, n):
            return sub
    return None

rows = []
for p in ps:
    base = p.setdefault('categoryOriginal', p['category'])
    base = move.get(base, base)
    rows.append((p, base, pick(base, p['name'])))
cnt = collections.Counter((b, s) for _, b, s in rows)
for p, base, sub in rows:
    if sub and cnt[(base, sub)] < 3:
        sub = None
    top = base
    for new_top, spec in regroup.get(base, {}).items():
        if sub in spec['subs']:
            top = new_top
    p['category'] = rename.get(top, top)
    if sub: p['subcategory'] = sub
    else: p.pop('subcategory', None)
json.dump(d, open('catalog/hicustom.json', 'w'), ensure_ascii=False)

# 英文名稱
T = json.load(open('src/i18n/terms-en.json'))
for cat, v in rules.items():
    if cat.startswith('_'): continue
    for sub, en, rx in v: T[sub] = en
for base, tops in regroup.items():
    for new_top, spec in tops.items(): T[new_top] = spec['en']
T.update(rules.get('_en', {}))
json.dump(T, open('src/i18n/terms-en.json', 'w'), ensure_ascii=False, indent=0, sort_keys=True)

tree = collections.defaultdict(collections.Counter)
for p in ps: tree[p['category']][p.get('subcategory') or '（未分子類）'] += 1
for c, subs in sorted(tree.items(), key=lambda x: -sum(x[1].values())):
    print(f"{c}（{sum(subs.values())}）：" + '、'.join(f'{s} {n}' for s, n in subs.most_common()))
print('大分類', len(tree), '子分類', sum(1 for c in tree for s in tree[c] if s != '（未分子類）'))
