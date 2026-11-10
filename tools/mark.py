"""Рамки и обрезка поверх готового кадра — для окон, которые не снимаются
через shots.mjs (Docker Desktop, установщики, терминал).

    python3 tools/mark.py исходный.png shots/имя.png \\
        --crop 0,1300,512,140 --box 80,1385,180,46:1

Координаты — в пикселях исходного файла: x,y,ширина,высота. --crop
применяется первым, координаты --box считаются уже от обрезанного кадра.
После двоеточия у --box — метка в кружке. Цвет и толщина рамки те же,
что в shots.mjs, чтобы кадры книги выглядели одинаково.
"""

import argparse

from PIL import Image, ImageDraw, ImageFont

MARK = (224, 68, 43)
WHITE = (255, 255, 255)


def nums(text):
    return [int(v) for v in text.split(",")]


parser = argparse.ArgumentParser()
parser.add_argument("src")
parser.add_argument("dst")
parser.add_argument("--crop")
parser.add_argument("--box", action="append", default=[])
parser.add_argument("--scale", type=float, default=2, help="пикселей на точку: 2 для кадров Retina")
args = parser.parse_args()

img = Image.open(args.src).convert("RGB")
if args.crop:
    x, y, w, h = nums(args.crop)
    img = img.crop((x, y, x + w, y + h))

draw = ImageDraw.Draw(img)
s = args.scale
line, pad, rad = round(3 * s), round(5 * s), round(6 * s)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", round(14 * s))
except OSError:
    font = ImageFont.load_default()

for spec in args.box:
    coords, _, label = spec.partition(":")
    x, y, w, h = nums(coords)
    outer = (x - pad - round(2 * s), y - pad - round(2 * s), x + w + pad + round(2 * s), y + h + pad + round(2 * s))
    draw.rounded_rectangle(outer, radius=rad + 2, outline=WHITE, width=round(2 * s))
    draw.rounded_rectangle((x - pad, y - pad, x + w + pad, y + h + pad), radius=rad, outline=MARK, width=line)
    if label:
        r = round(12 * s)
        cx, cy = x + w + pad, y - pad
        draw.ellipse((cx - r - 2 * s, cy - r - 2 * s, cx + r + 2 * s, cy + r + 2 * s), fill=WHITE)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=MARK)
        draw.text((cx, cy), label, fill=WHITE, font=font, anchor="mm")

img.save(args.dst, optimize=True)
print("готово", args.dst, img.size)
