#!/usr/bin/env python3
"""Google Play store graphics for Ruhnevâz.

Output (appstore/play/):
  {lang}/phone/NN.png   1080x1920 phone screenshots (Play allows at most 2:1)
  icon-512.png          512x512 hi-res icon
  {lang}/feature.png    1024x500 feature graphic

The phone shots reuse the raw simulator captures (appstore/_work/raw) with the
iOS status bar and home indicator cropped off, so no iOS chrome shows on Play.
Run from the repo root: python3 scripts/composePlayAssets.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from composeScreenshots import BOLD, DARK, LIGHT, MEDIUM, SHOTS, gradient, rounded

W, H = 1080, 1920
STATUS_BAR, HOME_INDICATOR = 190, 90  # px at 1320x2868


def phone(lang, shot_id, theme, style, title, sub):
    raw = Image.open(f'appstore/_work/raw/{lang}-{shot_id}-{theme}.png').convert('RGB')
    raw = raw.crop((0, STATUS_BAR, raw.width, raw.height - HOME_INDICATOR))
    canvas = Image.new('RGB', (W, H), style['bg_top'])
    top, bottom = style['bg_top'], style['bg_bottom']
    d = ImageDraw.Draw(canvas)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    canvas = canvas.convert('RGBA')
    draw = ImageDraw.Draw(canvas)

    title_font, sub_font = ImageFont.truetype(BOLD, 76), ImageFont.truetype(MEDIUM, 36)
    y = 96
    for line in title.split('\n'):
        w = draw.textlength(line, font=title_font)
        draw.text(((W - w) / 2, y), line, font=title_font, fill=style['title'])
        y += 92
    y += 14
    w = draw.textlength(sub, font=sub_font)
    draw.text(((W - w) / 2, y), sub, font=sub_font, fill=style['sub'])

    sw = int(W * 0.80)
    sh = int(raw.height * sw / raw.width)
    shot = rounded(raw.resize((sw, sh), Image.LANCZOS), 48)
    x0, y0 = (W - sw) // 2, 430
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x0, y0 + 18, x0 + sw, y0 + sh + 18], 48, fill=(0, 0, 0, 60))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(30)))
    canvas.alpha_composite(shot, (x0, y0))
    return canvas.convert('RGB')


FEATURE = {
    'tr': ('Ruhnevâz', 'Namaz vakitleri, Kur\'ân-ı Kerîm, hadis, zikir ve dua'),
    'en': ('Ruhnevâz', "Prayer times, the Holy Qur'an, hadith, dhikr and duas"),
}


def feature(lang):
    fw, fh = 1024, 500
    img = Image.new('RGB', (fw, fh))
    d = ImageDraw.Draw(img)
    top, bottom = (15, 138, 95), (6, 78, 59)
    for x in range(fw):
        t = x / (fw - 1)
        d.line([(x, 0), (x, fh)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    icon = Image.open('assets/icon.png').convert('RGBA').resize((220, 220), Image.LANCZOS)
    img.paste(rounded(icon.convert('RGB'), 48), (90, 140), rounded(icon.convert('RGB'), 48))
    name, tagline = FEATURE[lang]
    d.text((360, 150), name, font=ImageFont.truetype(BOLD, 96), fill=(255, 255, 255))
    font = ImageFont.truetype(MEDIUM, 32)
    words, lines, cur = tagline.split(), [], ''
    for wd in words:  # wrap to ~590px
        trial = f'{cur} {wd}'.strip()
        if d.textlength(trial, font=font) > 590:
            lines.append(cur)
            cur = wd
        else:
            cur = trial
    lines.append(cur)
    for i, line in enumerate(lines):
        d.text((364, 280 + i * 44), line, font=font, fill=(209, 250, 229))
    return img


def main():
    os.makedirs('appstore/play', exist_ok=True)
    Image.open('assets/icon.png').convert('RGB').resize((512, 512), Image.LANCZOS).save('appstore/play/icon-512.png')
    for lang in ('tr', 'en'):
        out = f'appstore/play/{lang}/phone'
        os.makedirs(out, exist_ok=True)
        for n, (shot_id, theme, style, texts) in enumerate(SHOTS, 1):
            phone(lang, shot_id, theme, style, *texts[lang]).save(f'{out}/{n:02d}.png', optimize=True)
        feature(lang).save(f'appstore/play/{lang}/feature.png')
        print(lang, 'ok')


if __name__ == '__main__':
    main()
