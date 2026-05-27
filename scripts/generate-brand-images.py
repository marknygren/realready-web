#!/usr/bin/env python3
"""
Generate the default OG image (1200x630) and Apple touch icon (180x180)
for realready.app. Outputs go in public/.

Re-run any time the wordmark / palette / tagline changes:
    python3 scripts/generate-brand-images.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'

# Palette (matches src/styles/global.css)
NAVY = (2, 48, 71)         # #023047
NAVY_DEEP = (1, 30, 46)    # #011e2e
ORANGE = (255, 183, 3)     # #ffb703
ORANGE_DEEP = (251, 133, 0)  # #fb8500
TEAL = (33, 158, 188)      # #219ebc
WARM = (245, 245, 240)     # #f5f5f0
TEXT_DARK = (15, 23, 42)   # #0f172a
TEXT_MUTED = (100, 116, 139)  # #64748b

# System font fallbacks (Avenir is the closest macOS-built-in match to Outfit's geometric feel).
FONT_DISPLAY = '/System/Library/Fonts/Avenir Next.ttc'
FONT_BODY = '/System/Library/Fonts/HelveticaNeue.ttc'


def load_font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size=size, index=index)
    except Exception:
        # Fallback to PIL default if the font file is unavailable.
        return ImageFont.load_default()


def make_og() -> Image.Image:
    """1200x630 — Open Graph image, the standard FB/Twitter/LinkedIn size."""
    W, H = 1200, 630
    img = Image.new('RGB', (W, H), WARM)
    draw = ImageDraw.Draw(img)

    # Top navy band (the brand bar)
    draw.rectangle([(0, 0), (W, 14)], fill=NAVY)

    # Accent strip near the band
    draw.rectangle([(0, 14), (W, 18)], fill=ORANGE)

    # Wordmark — "Real" navy + "Ready" orange — center-left, large
    wordmark_font = load_font(FONT_DISPLAY, 132, index=8)  # bold variant
    real_text = 'Real'
    ready_text = 'Ready'
    pad_left = 80
    word_y = 150

    # Measure each chunk
    real_w = draw.textlength(real_text, font=wordmark_font)
    ready_w = draw.textlength(ready_text, font=wordmark_font)

    draw.text((pad_left, word_y), real_text, fill=NAVY, font=wordmark_font)
    draw.text((pad_left + real_w, word_y), ready_text, fill=ORANGE_DEEP, font=wordmark_font)

    # Eyebrow above the wordmark
    eyebrow_font = load_font(FONT_BODY, 32, index=1)  # medium
    eyebrow_text = 'realready.app'
    draw.text((pad_left, word_y - 50), eyebrow_text, fill=TEAL, font=eyebrow_font)

    # Tagline below wordmark
    tagline_font = load_font(FONT_DISPLAY, 56, index=4)  # medium
    tagline_text = 'Real estate exam prep'
    draw.text((pad_left, word_y + 160), tagline_text, fill=NAVY, font=tagline_font)

    sub_font = load_font(FONT_BODY, 36, index=0)
    sub_text = 'Free state-targeted practice for all 50 states + DC'
    draw.text((pad_left, word_y + 240), sub_text, fill=TEXT_MUTED, font=sub_font)

    # Bottom accent dots — visual flourish (5 dots, alternating teal/orange)
    dot_y = H - 50
    dot_x = pad_left
    for i, color in enumerate([NAVY, TEAL, ORANGE, TEAL, NAVY]):
        draw.ellipse(
            [(dot_x + i * 32, dot_y), (dot_x + i * 32 + 18, dot_y + 18)],
            fill=color,
        )

    # Decorative circle on the right (warm brand presence)
    draw.ellipse([(W - 320, H - 320), (W - 60, H - 60)], outline=ORANGE, width=4)
    draw.ellipse([(W - 280, H - 280), (W - 100, H - 100)], outline=TEAL, width=3)

    return img


def make_apple_icon() -> Image.Image:
    """180x180 — Apple touch icon for home-screen save."""
    SIZE = 180
    img = Image.new('RGB', (SIZE, SIZE), NAVY)
    draw = ImageDraw.Draw(img)

    # Big "R" centered, orange
    font = load_font(FONT_DISPLAY, 130, index=8)
    text = 'R'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    # Center it (accounting for bbox offset)
    draw.text(
        ((SIZE - tw) / 2 - bbox[0], (SIZE - th) / 2 - bbox[1] - 8),
        text,
        fill=ORANGE,
        font=font,
    )
    return img


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)

    og = make_og()
    og_path = PUBLIC / 'og-default.png'
    og.save(og_path, 'PNG', optimize=True)
    print(f'wrote {og_path.relative_to(ROOT)} ({og_path.stat().st_size:,} bytes)')

    icon = make_apple_icon()
    icon_path = PUBLIC / 'apple-touch-icon.png'
    icon.save(icon_path, 'PNG', optimize=True)
    print(f'wrote {icon_path.relative_to(ROOT)} ({icon_path.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
