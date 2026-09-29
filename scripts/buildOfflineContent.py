#!/usr/bin/env python3
"""
Builds the offline content bundled into the app:

  assets/content/quran/surahs.json           surah list (Turkish names)
  assets/content/quran/NNN.jsondata          per-surah: Arabic (quran-simple) + Diyanet meal
  assets/content/hadith/<col>/meta.json      section names + section_details
  assets/content/hadith/<col>/sections/N.jsondata
  data/offlineAssets.ts                      generated require() maps

`.jsondata` is registered as a Metro asset extension in metro.config.js so the
files ship as raw assets (read at runtime) instead of being inlined into the JS
bundle. Downloads are cached in scripts/_cache/ (gitignored).

Usage:  python3 scripts/buildOfflineContent.py
"""
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', '_cache')
OUT = os.path.join(ROOT, 'assets', 'content')
ALQURAN = 'https://api.alquran.cloud/v1'
HADITH_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'

ARABIC_EDITION = 'quran-simple'      # standard (imlâî) orthography — matches Turkish mushaf spelling
TRANSLATION_EDITION = 'tr.diyanet'
HADITH_COLLECTIONS = ['tur-bukhari', 'tur-muslim']

sys.path.insert(0, os.path.join(ROOT, 'scripts'))

def fetch(name, url):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name + '.json')
    if not os.path.exists(path):
        print('  downloading', url)
        req = urllib.request.Request(url, headers={'User-Agent': 'ruhnevaz-build/1.0'})
        with urllib.request.urlopen(req, timeout=180) as r, open(path, 'wb') as f:
            f.write(r.read())
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def write_json(rel, obj):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    return os.path.getsize(path)

def turkish_names():
    # Parse TURKISH_SURAH_NAMES out of services/api.ts so there is a single source of truth.
    import re
    src = open(os.path.join(ROOT, 'services', 'api.ts'), encoding='utf-8').read()
    block = re.search(r'TURKISH_SURAH_NAMES[^{]*\{(.*?)\n\};', src, re.S).group(1)
    names = {int(k): v for k, v in re.findall(r'(\d+)\s*:\s*"([^"]+)"', block)}
    assert len(names) == 114, f'expected 114 Turkish surah names, got {len(names)}'
    return names

def build_quran():
    print('Quran')
    names = turkish_names()
    ar = fetch(ARABIC_EDITION, f'{ALQURAN}/quran/{ARABIC_EDITION}')['data']
    tr = fetch(TRANSLATION_EDITION, f'{ALQURAN}/quran/{TRANSLATION_EDITION}')['data']
    assert len(ar['surahs']) == 114 and len(tr['surahs']) == 114
    total = 0
    surah_list = []
    for a, t in zip(ar['surahs'], tr['surahs']):
        assert a['number'] == t['number'] and len(a['ayahs']) == len(t['ayahs'])
        for ay in a['ayahs'] + t['ayahs']:
            ay['text'] = ay['text'].replace('﻿', '').strip()
        def surah_obj(s, edition):
            return {
                'number': s['number'], 'name': s['name'],
                'englishName': names[s['number']],
                'englishNameTranslation': s['englishNameTranslation'],
                'revelationType': s['revelationType'],
                'numberOfAyahs': len(s['ayahs']),
                'ayahs': s['ayahs'], 'edition': edition,
            }
        total += write_json(f'quran/{a["number"]:03d}.jsondata',
                            {'arabic': surah_obj(a, ar['edition']), 'turkish': surah_obj(t, tr['edition'])})
        surah_list.append({
            'number': a['number'], 'name': a['name'], 'englishName': names[a['number']],
            'englishNameTranslation': a['englishNameTranslation'],
            'numberOfAyahs': len(a['ayahs']), 'revelationType': a['revelationType'],
        })
    total += write_json('quran/surahs.json', surah_list)
    assert sum(s['numberOfAyahs'] for s in surah_list) == 6236
    print(f'  {total/1e6:.1f} MB written')

def build_hadith(col):
    print('Hadith', col)
    data = fetch(col, f'{HADITH_CDN}/{col}.min.json')
    meta = data['metadata']
    sections = {k: v for k, v in meta['sections'].items()}
    details = meta.get('section_details', {})
    by_book = {}
    for h in data['hadiths']:
        book = str(h['reference']['book'])
        by_book.setdefault(book, []).append(h)
    missing = [k for k in sections if sections[k] and k != '0' and k not in by_book]
    if missing:
        print('  WARNING: sections without hadiths:', missing)
    total = write_json(f'hadith/{col}/meta.json',
                       {'name': meta['name'], 'sections': sections, 'section_details': details})
    for book, hs in by_book.items():
        total += write_json(f'hadith/{col}/sections/{book}.jsondata', {'hadiths': hs})
    print(f'  {len(data["hadiths"])} hadiths, {len(by_book)} sections, {total/1e6:.1f} MB written')
    return sorted(by_book, key=lambda k: int(k) if k.isdigit() else 10**9)

def write_asset_map(hadith_sections):
    lines = ['// AUTO-GENERATED by scripts/buildOfflineContent.py — do not edit by hand.', '',
             '/** Surah list with Turkish names (small; inlined JSON). */',
             "export const SURAH_LIST: import('../types').Surah[] = require('../assets/content/quran/surahs.json');", '',
             '/** Per-surah Arabic + Diyanet meal, as Metro asset module ids (read with readAssetJson). */',
             'export const QURAN_SURAH_ASSETS: Record<number, number> = {']
    for n in range(1, 115):
        lines.append(f"  {n}: require('../assets/content/quran/{n:03d}.jsondata'),")
    lines += ['};', '',
              'export interface HadithMeta { name: string; sections: Record<string, string>; section_details: Record<string, { hadithnumber_first: number; hadithnumber_last: number }> }',
              'export const HADITH_META: Record<string, HadithMeta> = {']
    for col in hadith_sections:
        lines.append(f"  '{col}': require('../assets/content/hadith/{col}/meta.json'),")
    lines += ['};', '',
              '/** Embedded hadith collections → section id → asset module id. */',
              'export const HADITH_SECTION_ASSETS: Record<string, Record<string, number>> = {']
    for col, secs in hadith_sections.items():
        lines.append(f"  '{col}': {{")
        for s in secs:
            lines.append(f"    '{s}': require('../assets/content/hadith/{col}/sections/{s}.jsondata'),")
        lines.append('  },')
    lines += ['};', '']
    path = os.path.join(ROOT, 'data', 'offlineAssets.ts')
    open(path, 'w', encoding='utf-8').write('\n'.join(lines))
    print('wrote', os.path.relpath(path, ROOT))

if __name__ == '__main__':
    build_quran()
    secs = {col: build_hadith(col) for col in HADITH_COLLECTIONS}
    write_asset_map(secs)
