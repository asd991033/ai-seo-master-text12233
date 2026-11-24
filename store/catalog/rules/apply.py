"""依 catalog/rules/subcategories.json 的規則，把子分類寫進 catalog/hicustom.json，並更新英文名稱。
在 store/ 目錄執行：python3 catalog/rules/apply.py，之後重新部署就會套用。"""
import json,re,collections
# 1) 把子分類寫進商品目錄；少於 3 件的子分類不獨立（留在大分類）
rules=json.load(open('catalog/rules/subcategories.json')); d=json.load(open('catalog/hicustom.json')); ps=d['products']
def pick(p):
    n=re.sub(r'^客製化','',p['name'])
    for name,en,rx in rules.get(p['category'],[]):
        if isinstance(rx,str) and re.search(rx,n): return name
    return None
cnt=collections.Counter((p['category'],pick(p)) for p in ps)
for p in ps:
    s=pick(p)
    if s and cnt[(p['category'],s)]>=3: p['subcategory']=s
    else: p.pop('subcategory',None)
json.dump(d,open('catalog/hicustom.json','w'),ensure_ascii=False)
print('subcategories:',len({(p['category'],p['subcategory']) for p in ps if p.get('subcategory')}),'products with sub:',sum(1 for p in ps if p.get('subcategory')))
# 英文名稱
T=json.load(open('src/i18n/terms-en.json'))
for cat,rows in rules.items():
    if cat.startswith('_'): continue
    for name,en,rx in rows: T[name]=en
T.update({"箱包皮具":"Bags","鞋帽配飾":"Hats & Accessories","環保杯/馬克杯/水壺":"Mugs, Tumblers & Bottles","消費電子":"Tech Accessories","節日用品":"Holiday & Seasonal","汽車用品":"Car Accessories","運動娛樂":"Sports & Leisure","其他商品":"More Products"})
json.dump(T,open('src/i18n/terms-en.json','w'),ensure_ascii=False,indent=0,sort_keys=True)
