from __future__ import annotations

import math
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFilter, ImageFont


OUT = Path("public/route-map-copenhagen.jpg")
Z = 13
BBOX = {
    "west": 12.505,
    "south": 55.606,
    "east": 12.682,
    "north": 55.713,
}

POINTS = [
    ("Mo", "Christianshavn", 55.6728, 12.5950, "#14777c"),
    ("Mo", "Vor Frelsers", 55.6721, 12.5978, "#14777c"),
    ("Mo", "GoBoat", 55.6656, 12.5786, "#14777c"),
    ("Di", "Rosenborg", 55.6854, 12.5779, "#c98624"),
    ("Di", "Designmuseum", 55.6869, 12.5893, "#c98624"),
    ("Di", "Absalon", 55.6676, 12.5439, "#c98624"),
    ("Mi", "CopenHill", 55.6848, 12.6205, "#de6246"),
    ("Mi", "Refshaleøen", 55.6925, 12.6098, "#de6246"),
    ("Mi", "Noerrebro", 55.6910, 12.5523, "#de6246"),
    ("Do", "Christiansborg", 55.6762, 12.5804, "#102f46"),
    ("Do", "Cisternerne", 55.6724, 12.5266, "#102f46"),
    ("Do", "CPH Airport", 55.6181, 12.6561, "#102f46"),
]

ROUTE = [
    ("Christianshavn", "Vor Frelsers"),
    ("Vor Frelsers", "GoBoat"),
    ("Rosenborg", "Designmuseum"),
    ("Designmuseum", "Absalon"),
    ("CopenHill", "Refshaleøen"),
    ("Refshaleøen", "Noerrebro"),
    ("Christiansborg", "Cisternerne"),
    ("Cisternerne", "CPH Airport"),
]


def lon_to_x(lon: float, z: int) -> float:
    return (lon + 180.0) / 360.0 * (2**z)


def lat_to_y(lat: float, z: int) -> float:
    lat_rad = math.radians(lat)
    return (1 - math.asinh(math.tan(lat_rad)) / math.pi) / 2 * (2**z)


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\bahnschrift.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fetch_tile(x: int, y: int) -> Image.Image:
    url = f"https://tile.openstreetmap.org/{Z}/{x}/{y}.png"
    req = Request(url, headers={"User-Agent": "CodexCopenhagenTravelMap/1.0"})
    with urlopen(req, timeout=30) as response:
        return Image.open(BytesIO(response.read())).convert("RGB")


def main() -> None:
    x1 = lon_to_x(BBOX["west"], Z)
    x2 = lon_to_x(BBOX["east"], Z)
    y1 = lat_to_y(BBOX["north"], Z)
    y2 = lat_to_y(BBOX["south"], Z)
    tx1, tx2 = math.floor(x1), math.floor(x2)
    ty1, ty2 = math.floor(y1), math.floor(y2)

    tile = 256
    canvas = Image.new("RGB", ((tx2 - tx1 + 1) * tile, (ty2 - ty1 + 1) * tile), "#f7f2e6")
    for x in range(tx1, tx2 + 1):
        for y in range(ty1, ty2 + 1):
            img = fetch_tile(x, y)
            canvas.paste(img, ((x - tx1) * tile, (y - ty1) * tile))

    crop = (
        int((x1 - tx1) * tile),
        int((y1 - ty1) * tile),
        int((x2 - tx1) * tile),
        int((y2 - ty1) * tile),
    )
    map_img = canvas.crop(crop).resize((1100, 1320), Image.Resampling.LANCZOS).convert("RGBA")

    tint = Image.new("RGBA", map_img.size, (248, 241, 229, 72))
    map_img = Image.alpha_composite(map_img, tint)
    map_img = Image.blend(map_img, map_img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=120)), 0.5)

    draw = ImageDraw.Draw(map_img)
    font = get_font(23, True)
    small = get_font(19, True)
    tiny = get_font(15, False)

    def xy(lat: float, lon: float) -> tuple[int, int]:
        x = (lon_to_x(lon, Z) - x1) / (x2 - x1) * map_img.width
        y = (lat_to_y(lat, Z) - y1) / (y2 - y1) * map_img.height
        return int(x), int(y)

    coord = {name: xy(lat, lon) for _, name, lat, lon, _ in POINTS}
    for a, b in ROUTE:
        ax, ay = coord[a]
        bx, by = coord[b]
        draw.line((ax, ay, bx, by), fill=(16, 47, 70, 150), width=8)
        draw.line((ax, ay, bx, by), fill=(255, 250, 240, 210), width=3)

    label_offsets = {
        "CPH Airport": (-210, -15),
        "Noerrebro": (16, -30),
        "Refshaleøen": (-210, -12),
        "CopenHill": (18, -34),
        "Cisternerne": (18, 0),
        "Absalon": (18, 4),
        "GoBoat": (-145, 10),
    }

    for day, name, lat, lon, color in POINTS:
        x, y = xy(lat, lon)
        ox, oy = label_offsets.get(name, (18, -18))
        label = name
        text_w = draw.textlength(label, font=small)
        box = (x + ox, y + oy, x + ox + text_w + 78, y + oy + 44)
        draw.rounded_rectangle(box, radius=18, fill=(255, 250, 240, 235), outline=(16, 47, 70, 38), width=2)
        draw.ellipse((x - 17, y - 17, x + 17, y + 17), fill=color, outline=(255, 250, 240, 255), width=5)
        draw.text((x - 10, y - 10), day, fill="white", font=tiny)
        draw.text((x + ox + 52, y + oy + 10), label, fill="#102f46", font=small)

    draw.rounded_rectangle((28, 28, 560, 116), radius=26, fill=(7, 27, 40, 225))
    draw.text((58, 48), "Kopenhagen Route", fill="white", font=get_font(38, True))
    draw.text((60, 92), "echte Karte mit Tagespins und Google-Maps-Stopps", fill=(232, 224, 208, 255), font=tiny)
    draw.rounded_rectangle((28, 1215, 610, 1286), radius=18, fill=(255, 250, 240, 230))
    draw.text((50, 1234), "Kartendaten © OpenStreetMap-Mitwirkende", fill="#102f46", font=get_font(20, False))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    map_img.convert("RGB").save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
    print(OUT.resolve())


if __name__ == "__main__":
    main()
