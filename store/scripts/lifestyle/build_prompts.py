"""Build image-generation prompts for every catalogue product's lifestyle hero image.
Usage: python3 build_prompts.py <out_dir> [chunk_size]
Writes <out_dir>/chunk-NN.json: [{sku, name, ref, prompt}]"""
import gzip, hashlib, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
out_dir = sys.argv[1]; size = int(sys.argv[2]) if len(sys.argv) > 2 else 48
products = json.load(open(os.path.join(ROOT, "catalog", "hicustom.json")))["products"]
names = json.load(gzip.open(os.path.join(ROOT, "catalog", "en.json.gz")))["names"]

NO_PEOPLE = "No people in the frame."
# scene by subcategory, falling back to category
SCENES = {
    "滑鼠墊・桌墊": "lying flat on a tidy oak desk with a keyboard, mouse, small plant and ceramic cup, seen from a slightly elevated three-quarter angle so the whole surface is visible. " + NO_PEOPLE,
    "3C 周邊": "on a tidy oak desk beside a laptop and a small plant, in soft side daylight. " + NO_PEOPLE,
    "嬰兒用品": "styled as a neat flat lay on a soft cream blanket in a bright nursery, with a wooden rattle and a small plush toy beside it. " + NO_PEOPLE,
    "兒童服裝": "styled as a neat flat lay on a pale wooden floor in a bright playroom, with wooden toys and picture books beside it. " + NO_PEOPLE,
    "化妝包・收納包": "on a marble bathroom vanity with a few skincare bottles and a folded towel, zipper partly open, in soft morning light. " + NO_PEOPLE,
    "午餐袋・保溫袋": "on a wooden picnic table in a sunny park with fresh fruit, a sandwich box and a water bottle beside it. " + NO_PEOPLE,
    "後背包": "worn on the back of a person walking through a leafy city street, seen from behind and cropped from shoulders to hips so the backpack fills the frame.",
    "托特包・購物袋": "carried on the shoulder of a person at a weekend farmers market, cropped from shoulders to hips so the bag is fully visible, flowers and a baguette peeking out.",
    "斜背包・肩背包": "worn by a person strolling a sunlit city street, cropped from shoulders to hips so the bag is fully visible.",
    "眼鏡包・小物包": "on a linen-covered side table with sunglasses, keys and a paperback book, in soft window light. " + NO_PEOPLE,
    "腰包・胸包": "worn across the body of a person on a city walk, cropped from shoulders to hips so the bag is the focus.",
    "運動・旅行袋": "on a wooden bench in a bright gym locker room with trainers and a folded towel beside it. " + NO_PEOPLE,
    "錢包・卡夾": "held in a person's hands at a cafe table next to a cup of coffee, close-up with only hands visible.",
    "包包・皮件": "carried by a person on a sunlit city street, cropped from shoulders to hips so the bag is fully visible.",
    "T恤・上衣": "worn by an adult model standing relaxed on a sunlit city street, cropped from chin to hips so the garment fills the frame.",
    "帽T・外套": "worn by an adult model in a cosy cafe corner by a window, cropped from chin to hips so the garment fills the frame.",
    "泳裝・運動服": "laid neatly on a wooden sun lounger beside a turquoise pool with a straw hat and sunglasses. " + NO_PEOPLE,
    "洋裝・裙子": "worn by an adult woman walking in a sunlit garden, cropped from shoulders to knees so the garment fills the frame.",
    "褲子": "worn by an adult model in a bright yoga studio, cropped from waist to ankles so the garment fills the frame.",
    "褲子・短褲": "worn by an adult man on a seaside boardwalk, cropped from waist to knees so the garment fills the frame.",
    "女士服裝": "worn by an adult woman on a sunlit city street, cropped from chin to hips so the garment fills the frame.",
    "男士服裝": "worn by an adult man on a sunlit city street, cropped from chin to hips so the garment fills the frame.",
    "外出包・玩具": "in a sunny park next to a happy dog sitting on the grass, the product prominent in the foreground. " + NO_PEOPLE,
    "寵物服飾": "worn by a happy small dog sitting on a living-room rug in warm window light, the garment clearly visible. " + NO_PEOPLE,
    "寵物牌・護理用品": "worn or used by a friendly dog in a bright hallway, close-up so the product is sharp and prominent. " + NO_PEOPLE,
    "寵物窩・墊子": "on a living-room floor with a relaxed cat or small dog resting on it, in warm window light. " + NO_PEOPLE,
    "寵物用品": "next to a happy dog at home on a wooden floor in warm window light. " + NO_PEOPLE,
    "圍巾・絲巾・頭巾": "worn by an adult model outdoors on a breezy autumn street, cropped close so the accessory fills the frame and the face is partly out of frame.",
    "帽子": "worn by a relaxed adult outdoors in a park at golden hour, three-quarter view, face softly out of focus so the hat is the sharp hero.",
    "襪子": "worn on a person's feet resting on a cosy sofa with a knitted blanket, cropped to ankles and feet only.",
    "髮飾・飾品": "on a small ceramic tray on a dressing table with a mirror and dried flowers, in soft window light. " + NO_PEOPLE,
    "帽子・配飾": "worn by a relaxed adult outdoors at golden hour, cropped close so the accessory is the sharp hero.",
    "圍裙・廚房用品": "in use in a bright home kitchen with a wooden counter, fresh herbs and a mixing bowl; if it is worn, crop from chin to thighs.",
    "桌布・餐墊・杯墊": "on a dining table set for brunch with plates, glasses and a small vase of flowers, in soft daylight. " + NO_PEOPLE,
    "掛畫・掛毯・牆面裝飾": "hanging on a warm white wall above a sofa or sideboard in a calm living room with a plant and a floor lamp. " + NO_PEOPLE,
    "開關面板": "installed on a painted wall in a stylish hallway next to a door frame, close-up, in soft daylight. " + NO_PEOPLE,
    "信箱套・庭院裝飾": "in a tidy front garden with green lawn and flowering plants in front of a house, in bright daylight. " + NO_PEOPLE,
    "旗幟": "flying from a pole on the porch of a house against blue sky, gently waving so the whole print is visible. " + NO_PEOPLE,
    "寢具・床品": "on a neatly made bed in a bright calm bedroom with linen curtains and a bedside plant. " + NO_PEOPLE,
    "抱枕・枕套": "propped on a light linen sofa in a calm sunlit living room next to a knitted throw. " + NO_PEOPLE,
    "毛毯・蓋毯": "casually draped over the arm and seat of a light linen sofa in a sunlit living room, with a mug and an open book nearby. " + NO_PEOPLE,
    "座椅套・方向盤套": "fitted inside a clean modern car interior, seen through the open driver's door in daylight. " + NO_PEOPLE,
    "車用收納・掛飾": "in use inside a clean modern car interior, in soft daylight through the windscreen. " + NO_PEOPLE,
    "車罩・備胎罩": "fitted on an SUV parked on a scenic coastal road in daylight. " + NO_PEOPLE,
    "遮陽・車窗": "fitted in a car parked in a sunny driveway, seen from outside so the whole print is visible. " + NO_PEOPLE,
    "汽車用品": "in use in a clean modern car in daylight. " + NO_PEOPLE,
    "保溫杯・保冰杯": "on a cafe table by a window next to a notebook and a croissant, in morning light. " + NO_PEOPLE,
    "吸管杯・玻璃杯": "on a sunny patio table filled with an iced drink, with citrus slices and mint beside it. " + NO_PEOPLE,
    "水壺・運動瓶": "standing on a wooden gym bench next to a folded towel and a yoga mat in a bright studio. " + NO_PEOPLE,
    "馬克杯": "on a wooden desk by a window with steam rising, next to an open book and a small plant. " + NO_PEOPLE,
    "掛件・吊飾": "hanging in a window or on a branch with soft blurred festive lights behind it, close-up. " + NO_PEOPLE,
    "派對・婚禮佈置": "set up at a bright garden party table with flowers and glassware. " + NO_PEOPLE,
    "聖誕節": "in a cosy living room with a decorated Christmas tree and warm fairy lights softly blurred behind it. " + NO_PEOPLE,
    "萬聖節": "on a front porch with carved pumpkins and autumn leaves at dusk. " + NO_PEOPLE,
    "賀卡・禮品袋": "on a wooden table with wrapped gifts, ribbon and dried flowers, in soft daylight. " + NO_PEOPLE,
    "節慶・派對": "in a warmly lit festive home setting with soft blurred lights. " + NO_PEOPLE,
    "地墊・門墊": "on the floor at a bright home entrance beside a pair of shoes and a potted plant, seen from a slightly elevated angle so the whole print is visible. " + NO_PEOPLE,
    "椅套・家具套": "fitted in place in a bright, tidy home interior. " + NO_PEOPLE,
    "毛巾・浴巾": "folded and partly unrolled on a wooden stool in a bright spa-like bathroom with a plant. " + NO_PEOPLE,
    "窗簾・門簾・浴簾": "hanging in place in a bright, tidy home interior with daylight coming through. " + NO_PEOPLE,
    "徽章・樂器小物": "on a wooden desk with a notebook and headphones, close-up in soft daylight. " + NO_PEOPLE,
    "遊戲・玩具": "on a living-room coffee table set up for a relaxed family game afternoon, with snacks beside it. " + NO_PEOPLE,
    "運動用品": "in use outdoors on a sunny sports ground or trail, with the product sharp in the foreground; any person cropped so no face is the focus.",
    "運動・休閒": "outdoors in a sunny park setting with the product sharp in the foreground. " + NO_PEOPLE,
    "收納・旅行用品": "on a bed next to an open suitcase with a passport and neatly folded clothes, in bright daylight. " + NO_PEOPLE,
    "鑰匙圈・擺件・小物": "on a wooden entryway console with a small plant and a ceramic dish, close-up in soft daylight. " + NO_PEOPLE,
    "旗幟・戶外裝飾": "outdoors in front of a house in bright daylight. " + NO_PEOPLE,
    "掛畫・牆面裝飾": "displayed on a warm white wall in a calm living room. " + NO_PEOPLE,
    "毛毯・抱枕・寢具": "on a light linen sofa in a calm sunlit living room. " + NO_PEOPLE,
    "廚房・餐桌用品": "in a bright home kitchen with a wooden counter. " + NO_PEOPLE,
    "衛浴・地墊・窗簾": "in place in a bright, tidy home interior. " + NO_PEOPLE,
    "環保杯/馬克杯/水壺": "on a wooden table by a window in morning light. " + NO_PEOPLE,
    "鑰匙圈・生活小物": "on a wooden console with a small plant, close-up in soft daylight. " + NO_PEOPLE,
}
THEMES = [
    "modern abstract botanical shapes in terracotta, sage green and cream",
    "soft abstract waves in ocean blue, sand and coral",
    "line-art citrus fruit and leaves in forest green and warm orange on cream",
    "calm topographic contour lines in deep forest green and sand",
    "hand-drawn wildflowers in dusty pink, mustard and olive on off-white",
    "bold geometric colour blocks in navy, rust and cream",
    "a watercolour mountain landscape at sunrise in muted blues and peach",
    "a mid-century pattern of arches and circles in mustard, teal and cream",
    "delicate eucalyptus branches in grey-green on warm white",
    "an abstract terrazzo pattern in blush, charcoal and ochre",
    "a minimalist sun and hills illustration in burnt orange and cream",
    "tropical monstera leaves in deep green on a pale sand ground",
    "a painterly night sky with small stars in indigo and gold",
    "a hand-painted checkerboard in sage green and cream",
]
done_pilot = {"HC-RI94IO", "HC-CX75VA", "HC-4KDTW8", "HC-FJ4ZO5", "HC-7RB8IO", "HC-MBUJLS", "HC-3QXBHA", "HC-GQ38Q4"}
items = []
for p in products:
    sku = p["sku"]
    if sku in done_pilot or not p.get("images"): continue
    name = names.get(sku) or p["name"]
    name = name[7:] if name.lower().startswith("custom ") else name
    scene = SCENES.get(p.get("subcategory") or "") or SCENES[p["category"]]
    theme = THEMES[int(hashlib.md5(sku.encode()).hexdigest(), 16) % len(THEMES)]
    prompt = (
        f"Editorial lifestyle product photo for a premium custom-gift store. The product is the exact {name} from the reference image: "
        "keep its shape, proportions, colours, materials, trims and hardware identical. Replace the placeholder print (the striped "
        "'YOUR DESIGN HERE' pattern, numbers and logo) with one tasteful original custom print on the same printable area: "
        f"{theme}. Scene: the product {scene} The product is the clear hero, sharp and fully visible. Soft natural light, warm neutral "
        "palette, authentic candid feel. Photorealistic. No text, letters, numbers, logos or watermarks anywhere."
    )
    items.append({"sku": sku, "name": name, "ref": p["images"].split("|")[0], "prompt": prompt})
os.makedirs(out_dir, exist_ok=True)
for i in range(0, len(items), size):
    json.dump(items[i:i + size], open(os.path.join(out_dir, f"chunk-{i // size + 1:02d}.json"), "w"), ensure_ascii=False, indent=1)
print(len(items), "products,", (len(items) + size - 1) // size, "chunks")
