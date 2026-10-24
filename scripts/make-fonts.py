#!/usr/bin/env python3
"""Builds the tiny embedded fonts used inside the SVGs (run once; output is committed).
Uses scripts/fonts/src/JetBrainsMono-{Regular,Bold}.ttf when present, else DejaVu Sans Mono.
Kana subset for the matrix rain comes from Noto Sans CJK JP (SIL OFL)."""
import json, os
from fontTools import subset
from fontTools.ttLib import TTFont, TTCollection

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "fonts"); SRC = os.path.join(OUT, "src")
ASCII = "".join(chr(c) for c in range(32, 127)) + "·–©"
KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょぁぃぅぇぉっャュョァィゥェォッヴファフィフェフォティディトゥドゥチェシェジェ0234"

def pick(name, fallback):
    p = os.path.join(SRC, name)
    return p if os.path.exists(p) else fallback

def sub(path, text, out, font_number=0):
    opts = subset.Options(); opts.flavor = "woff"; opts.layout_features = []; opts.hinting = False
    opts.notdef_outline = True; opts.name_IDs = [1, 2]
    f = TTFont(path, fontNumber=font_number)
    s = subset.Subsetter(opts); s.populate(text=text); s.subset(f)
    f.flavor = 'woff'; f.save(os.path.join(OUT, out))
    print(out, os.path.getsize(os.path.join(OUT, out)), "bytes")

reg = pick("JetBrainsMono-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
bold = pick("JetBrainsMono-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf")
sub(reg, ASCII, "mono.woff"); sub(bold, ASCII, "mono-bold.woff")
t = TTFont(reg); adv = t["hmtx"]["A"][0] / t["head"].unitsPerEm
json.dump({"adv": round(adv, 4)}, open(os.path.join(OUT, "meta.json"), "w"))
ttc = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
idx = next(i for i, f in enumerate(TTCollection(ttc).fonts) if "JP" in (f["name"].getDebugName(1) or ""))
sub(ttc, KANA, "kana.woff", idx)
print("advance", adv)
