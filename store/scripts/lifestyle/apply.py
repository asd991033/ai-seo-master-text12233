"""Publish generated lifestyle images: convert to WebP under public/lifestyle and point each product's
sampleImage (the first image shown on the site) at it.
Usage: python3 -I apply.py <gen_dir>   (reads result-*.json and img/<sku>.png)"""
import glob, json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
gen = sys.argv[1]
out = os.path.join(ROOT, "public", "lifestyle"); os.makedirs(out, exist_ok=True)
skip = set(json.load(open(f"{gen}/exclude.json"))) if os.path.exists(f"{gen}/exclude.json") else set()
done = 0
for f in sorted(glob.glob(f"{gen}/img/*.png")):
    sku = os.path.basename(f)[:-4]
    if sku in skip: continue
    dest = os.path.join(out, f"{sku}.webp")
    if not os.path.exists(dest) or os.path.getmtime(dest) < os.path.getmtime(f):
        im = Image.open(f).convert("RGB")
        if im.width > 1000: im = im.resize((1000, round(im.height * 1000 / im.width)), Image.LANCZOS)
        im.save(dest, "WEBP", quality=82, method=6)
    done += 1
path = os.path.join(ROOT, "catalog", "hicustom.json")
data = json.load(open(path)); n = 0
for p in data["products"]:
    if p["sku"] not in skip and os.path.exists(os.path.join(out, f"{p['sku']}.webp")):
        url = f"/lifestyle/{p['sku']}.webp"
        if p.get("sampleImage") != url: p["sampleImage"] = url; n += 1
json.dump(data, open(path, "w"), ensure_ascii=False)  # same single-line format as the existing file
total = sum(os.path.getsize(os.path.join(out, x)) for x in os.listdir(out))
print(f"webp files: {done}, catalogue entries updated: {n}, public/lifestyle size: {total/1e6:.1f} MB")
