"""Download a chunk's generated images and build before/after contact sheets for review.
Usage: python3 -I qc_sheet.py <gen_dir> <chunk_no>
Reads chunk-NN.json and result-NN.json ([{sku, url}]); saves img/<sku>.png and qc/chunk-NN-K.jpg"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw

gen, n = sys.argv[1], int(sys.argv[2])
chunk = {x["sku"]: x for x in json.load(open(f"{gen}/chunk-{n:02d}.json"))}
res = {x["sku"]: x for x in json.load(open(f"{gen}/result-{n:02d}.json")) if x.get("url")}
for d in ("img", "ref", "qc"): os.makedirs(f"{gen}/{d}", exist_ok=True)

def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 2000: return True
    subprocess.run(["curl", "-s", "-m", "90", "-L", "-o", dest, url])
    return os.path.exists(dest) and os.path.getsize(dest) > 2000

def load(path, s):
    try: return Image.open(path).convert("RGB").resize((s, s))
    except Exception: return Image.new("RGB", (s, s), "#cc3333")

missing = [s for s in chunk if s not in res]
skus = [s for s in chunk if s in res]
bad = []
for s in skus:
    fetch(chunk[s]["ref"], f"{gen}/ref/{s}.jpg")
    if not fetch(res[s]["url"], f"{gen}/img/{s}.png"): bad.append(s)
S, COLS = 256, 6
sheets = []
for k in range(0, len(skus), 12):
    part = skus[k:k + 12]
    m = Image.new("RGB", (S * COLS, (S * 2 + 22) * 2), "white"); dr = ImageDraw.Draw(m)
    for i, s in enumerate(part):
        x, y = (i % COLS) * S, (i // COLS) * (S * 2 + 22)
        m.paste(load(f"{gen}/ref/{s}.jpg", S), (x, y)); m.paste(load(f"{gen}/img/{s}.png", S), (x, y + S))
        dr.text((x + 4, y + S * 2 + 4), s, fill="black")
    out = f"{gen}/qc/chunk-{n:02d}-{k // 12 + 1}.jpg"; m.save(out, quality=85); sheets.append(out)
print("sheets:", *sheets, sep="\n  ")
print("no result yet:", missing)
print("download failed:", bad)
