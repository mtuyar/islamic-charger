"""Step 1 of data/dailyContent.ts: fetches the curated ayat from alquran.cloud in
Arabic (Uthmani) + Diyanet TR + Saheeh EN into scripts/_ayahs.json.
Step 2 is scripts/buildDailyContent.py (adds hadith/wisdom and writes the TS file).

Diyanet's meal translates some verse groups jointly, and alquran.cloud repeats that
joint text on EVERY ayah of the group (e.g. 26:75-83 all carry the same paragraph).
So a single ayah inside such a group would show text that belongs to other ayat.
Entries may therefore be a range ("S:A-B"); the Turkish is de-duplicated and the
Arabic/English are concatenated. `check_groups()` validates every entry against the
embedded Diyanet meal (assets/content/quran/NNN.jsondata) and aborts if an entry
starts or ends inside a jointly-translated group — pick a self-contained ayah or
widen the range to the whole group.
"""
import json, os, sys, time, unicodedata, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

AYAHS = ["2:152","2:186","2:286","3:139","3:159","3:173","6:162","7:56","8:2-3","9:51",
 "10:57","11:88","12:87","13:28","14:7","14:34","16:18","16:97","17:80","18:10",
 "20:114","21:87","24:35","25:63","17:82","27:62","57:4","29:45","29:69","30:21",
 "31:17","33:41","33:70-71","39:53","40:60","42:19","47:7","49:13","50:16","51:56",
 "53:39","55:13","58:11","62:10","64:11","3:160","67:2","73:8","89:28","93:5",
 "94:5","94:6","96:1","99:7","110:1-3","112:1","2:45-46","2:153","3:8","4:36",
 "5:2","7:199","10:62","16:90","17:24","19:96","23:1","31:18","35:5","41:34"]
# Replaced (Diyanet translates them jointly with other ayat; the full group is too long
# for a daily card/widget): 26:80 (group 26:75-83) -> 17:82, 28:77 (group 28:76-77)
# -> 57:4, 65:3 (group 65:2-3) -> 3:160.


def parse(ref):
    s, rng = ref.split(':')
    a, _, b = rng.partition('-')
    return int(s), int(a), int(b or a)


def embedded_tr(surah):
    with open(os.path.join(ROOT, f'assets/content/quran/{surah:03d}.jsondata'), encoding='utf-8') as f:
        return [x['text'] for x in json.load(f)['turkish']['ayahs']]


def check_groups():
    bad = []
    for ref in AYAHS:
        s, a, b = parse(ref)
        tr = embedded_tr(s)
        starts_inside = a > 1 and tr[a - 1] == tr[a - 2]
        ends_inside = b < len(tr) and tr[b - 1] == tr[b]
        if starts_inside or ends_inside:
            grp = [i for i in range(1, len(tr) + 1) if tr[i - 1] in (tr[a - 1], tr[b - 1])]
            bad.append(f"{ref}: Diyanet translates {s}:{grp[0]}-{grp[-1]} jointly")
    if bad:
        sys.exit("Grouped-translation boundary errors:\n  " + "\n  ".join(bad))


def _skeleton(text):
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


BASMALA = "بسم ٱلله ٱلرحمن ٱلرحيم"  # compared without harakat (mark order varies)


def fetch_one(s, n):
    url = f"https://api.alquran.cloud/v1/ayah/{s}:{n}/editions/quran-uthmani,tr.diyanet,en.sahih"
    with urllib.request.urlopen(url, timeout=20) as r:
        d = json.load(r)["data"]
    assert d[0]["surah"]["number"] == s and d[0]["numberInSurah"] == n
    ar = d[0]["text"]
    # alquran.cloud prefixes the basmala to ayah 1 of every surah; it is only an ayah of
    # al-Fâtiha (and absent from at-Tawba), so don't show it as part of e.g. 96:1.
    words = ar.split(" ")
    if n == 1 and s not in (1, 9) and _skeleton(" ".join(words[:4])) == BASMALA:
        ar = " ".join(words[4:])
    return ar.strip(), d[1]["text"].strip(), d[2]["text"].strip()


def fetch(ref):
    s, a, b = parse(ref)
    ar, tr, en = [], [], []
    for n in range(a, b + 1):
        x, y, z = fetch_one(s, n)
        ar.append(x); en.append(z)
        if not tr or tr[-1] != y:  # joint Diyanet text is repeated on each ayah
            tr.append(y)
        time.sleep(0.15)
    item = {
        "id": f"ayah_{s}_{a}" + (f"_{b}" if b != a else ""),
        "type": "ayah",
        "arabic": " ".join(ar),
        "tr": " ".join(tr),
        "en": " ".join(en),
        "surah": s,
        "ayah": a,
    }
    if b != a:
        item["ayahEnd"] = b
    return item


if __name__ == "__main__":
    check_groups()
    items = []
    for ref in AYAHS:
        try:
            items.append(fetch(ref)); print("ok", ref)
        except Exception as e:
            print("FAIL", ref, e)
    json.dump(items, open(os.path.join(ROOT, "scripts/_ayahs.json"), "w"), ensure_ascii=False, indent=1)
    print(len(items))
