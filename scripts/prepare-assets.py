"""Create responsive WebP copies; preserve uploaded and deck source files."""
from pathlib import Path
from PIL import Image, ImageOps
import argparse
import json

parser = argparse.ArgumentParser()
parser.add_argument('--room', required=True)
parser.add_argument('--logo', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
assets = root / 'public' / 'assets'
cards = assets / 'cards'
(cards / 'thumbs').mkdir(exist_ok=True)

def save_webp(image, dest, width, quality=82):
    scaled = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    scaled.save(dest, 'WEBP', quality=quality, method=6)

ids = [f'm{i:02d}' for i in range(22)] + [f'{s}{i:02d}' for s in 'wcsp' for i in range(1, 15)]
for cid in ids:
    with Image.open(cards / f'{cid}.jpg') as original:
        save_webp(original.convert('RGB'), cards / f'{cid}.webp', 400, 60)
        save_webp(original.convert('RGB'), cards / 'thumbs' / f'{cid}.webp', 240, 65)

room = Image.open(args.room).convert('RGB')
save_webp(room, assets / 'room.webp', 960, 82)
save_webp(room, assets / 'room-mobile.webp', 540, 80)
# Photograph crops keep the reader, candlelight and cloth consistent during play.
presence = room.crop((0, 30, room.width, 800))
save_webp(presence, assets / 'presence.webp', 840, 80)
save_webp(presence, assets / 'presence-mobile.webp', 480, 78)
felt = room.crop((70, 825, room.width - 70, 1250))
save_webp(felt, assets / 'felt.webp', 640, 76)
# The portrait is a responsive crop of the same generated room photograph.
portrait = room.crop((int(room.width * .30), int(room.height * .07), int(room.width * .68), int(room.height * .375)))
portrait = ImageOps.fit(portrait, (160, 160), Image.Resampling.LANCZOS)
portrait.save(assets / 'reader.webp', 'WEBP', quality=84, method=6)
logo = Image.open(args.logo).convert('RGBA')
bounds = logo.getchannel('A').getbbox()
if not bounds:
    raise ValueError('Logo has no visible pixels')
logo = logo.crop(bounds)
save_webp(logo, assets / 'brand.webp', 480, 90)

manifest = {
    'deck': 'Rider-Waite-Smith',
    'repository': 'https://github.com/mixvlad/TarotCards',
    'source': 'https://github.com/mixvlad/TarotCards/tree/main/tarot/rider-waite',
    'artist': 'Pamela Colman Smith',
    'designer': 'Arthur Edward Waite',
    'year': 1909,
    'license': 'Public Domain (as documented by the source repository)',
    'changes': 'Resized to 400px and 240px, encoded as WebP; artwork unchanged',
    'cardCount': len(ids),
    'totalBytes': sum((cards / f'{cid}.webp').stat().st_size for cid in ids),
    'thumbnailBytes': sum((cards / 'thumbs' / f'{cid}.webp').stat().st_size for cid in ids),
}
(cards / 'credits.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest))
print(json.dumps({p.name: p.stat().st_size for p in assets.glob('*.webp')}))
