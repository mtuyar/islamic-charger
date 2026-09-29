#!/usr/bin/env python3
"""Compose App Store screenshots (iPhone 6.9", 1320x2868) from raw simulator shots.

Input:  appstore/_work/raw/{lang}-{id}-{theme}.png   (1320x2868, iPhone 17 Pro Max)
Output: appstore/screenshots/{lang}/iphone-6.9/NN.png

Run from the repo root: python3 scripts/composeScreenshots.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1320, 2868
FONT_DIR = 'node_modules/@expo-google-fonts/plus-jakarta-sans'
BOLD = f'{FONT_DIR}/700Bold/PlusJakartaSans_700Bold.ttf'
MEDIUM = f'{FONT_DIR}/500Medium/PlusJakartaSans_500Medium.ttf'

LIGHT = {'bg_top': (246, 243, 236), 'bg_bottom': (226, 240, 232), 'title': (18, 38, 30), 'sub': (78, 96, 88)}
DARK = {'bg_top': (6, 44, 32), 'bg_bottom': (2, 6, 23), 'title': (248, 250, 252), 'sub': (167, 205, 188)}

# id, theme, style, {lang: (title, subtitle)}
SHOTS = [
    ('01-home', 'light', LIGHT, {
        'tr': ('İbadet hayatın\ntek bir yerde', 'Namaz vakitleri, günün ayeti ve takibin'),
        'en': ('Your daily worship,\nin one place', 'Prayer times, verse of the day, your tracker'),
    }),
    ('02-prayer', 'light', LIGHT, {
        'tr': ('Doğru namaz\nvakitleri', 'Geri sayım, hatırlatma ve namaz takibi'),
        'en': ('Accurate\nprayer times', 'Countdown, reminders and a prayer tracker'),
    }),
    ('03-reader', 'light', LIGHT, {
        'tr': ("Kur'ân-ı Kerîm,\nDiyanet meali ile", 'İnternetsiz oku, ayet ayet dinle'),
        'en': ("The Holy Qur'an\nwith translation", 'Read offline, listen ayah by ayah'),
    }),
    ('04-quran', 'light', LIGHT, {
        'tr': ('Hatmini\ntakip et', 'Günlük hedef, kaldığın yerden devam'),
        'en': ('Track\nyour khatm', 'Daily goal, pick up where you left off'),
    }),
    ('05-hadith', 'light', LIGHT, {
        'tr': ('Kütüb-i Sitte\nelinin altında', 'Buhârî ve Müslim internetsiz'),
        'en': ('Six major hadith\ncollections', 'Bukhari and Muslim available offline'),
    }),
    ('06-dhikr', 'light', LIGHT, {
        'tr': ('Zikir, tesbihat\nve dualar', "Esmâ-ül Hüsnâ anlamlarıyla birlikte"),
        'en': ('Dhikr, tasbihat\nand duas', 'Plus the 99 Names of Allah'),
    }),
    ('07-holydays', 'light', LIGHT, {
        'tr': ('Kandilleri\nkaçırma', 'Hicri takvim ve hatırlatmalar'),
        'en': ('Never miss\na holy night', 'Hijri calendar with reminders'),
    }),
    ('08-home', 'dark', DARK, {
        'tr': ('Gece de\ngöz yormaz', 'Karanlık mod · Reklamsız · Hesapsız'),
        'en': ('Easy on the eyes\nat night', 'Dark mode · No ads · No account'),
    }),
]


def gradient(top, bottom):
    img = Image.new('RGB', (W, H), top)
    px = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        px.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def rounded(img, r):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def compose(lang, shot_id, theme, style, title, sub):
    raw = Image.open(f'appstore/_work/raw/{lang}-{shot_id}-{theme}.png').convert('RGB')
    canvas = gradient(style['bg_top'], style['bg_bottom']).convert('RGBA')
    draw = ImageDraw.Draw(canvas)

    title_font = ImageFont.truetype(BOLD, 112)
    sub_font = ImageFont.truetype(MEDIUM, 52)
    y = 190
    for line in title.split('\n'):
        w = draw.textlength(line, font=title_font)
        draw.text(((W - w) / 2, y), line, font=title_font, fill=style['title'])
        y += 134
    y += 26
    w = draw.textlength(sub, font=sub_font)
    draw.text(((W - w) / 2, y), sub, font=sub_font, fill=style['sub'])

    # Device screenshot: scaled, rounded, with a soft shadow; bleeds off the bottom edge.
    scale = 0.80
    sw, sh = int(W * scale), int(H * scale)
    shot = rounded(raw.resize((sw, sh), Image.LANCZOS), 88)
    x0, y0 = (W - sw) // 2, 700
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x0, y0 + 24, x0 + sw, y0 + sh + 24], 88, fill=(0, 0, 0, 70))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(40)))
    border = Image.new('RGBA', (sw + 16, sh + 16), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle([0, 0, sw + 15, sh + 15], 96, fill=(20, 24, 22, 255))
    canvas.alpha_composite(border, (x0 - 8, y0 - 8))
    canvas.alpha_composite(shot, (x0, y0))
    return canvas.convert('RGB')


def main():
    for lang in ('tr', 'en'):
        out_dir = f'appstore/screenshots/{lang}/iphone-6.9'
        os.makedirs(out_dir, exist_ok=True)
        for n, (shot_id, theme, style, texts) in enumerate(SHOTS, 1):
            title, sub = texts[lang]
            img = compose(lang, shot_id, theme, style, title, sub)
            assert img.size == (W, H)
            img.save(f'{out_dir}/{n:02d}.png', optimize=True)
            print(f'{out_dir}/{n:02d}.png')


if __name__ == '__main__':
    main()
