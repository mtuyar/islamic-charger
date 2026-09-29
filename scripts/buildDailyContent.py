import json, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
# scripts/_ayahs.json is produced by scripts/generateDailyContent.py (run that first).
ayahs = json.load(open('scripts/_ayahs.json'))

H = [
 ("bukhari",1,"إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى.","Ameller ancak niyetlere göredir; herkese niyet ettiği şey vardır.","Actions are judged by intentions, and every person will have what they intended.","Buhârî, Bed'ü'l-Vahy 1","Bukhari 1"),
 ("bukhari",13,"لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ.","Sizden biriniz kendisi için sevdiğini kardeşi için de sevmedikçe iman etmiş olmaz.","None of you truly believes until he loves for his brother what he loves for himself.","Buhârî, Îmân 7","Bukhari 13"),
 ("bukhari",10,"الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ.","Müslüman, diğer Müslümanların elinden ve dilinden emin olduğu kimsedir.","A Muslim is the one from whose tongue and hand other Muslims are safe.","Buhârî, Îmân 4","Bukhari 10"),
 ("bukhari",6018,"مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ.","Allah'a ve ahiret gününe iman eden kimse ya hayır söylesin ya da sussun.","Whoever believes in Allah and the Last Day should speak good or remain silent.","Buhârî, Edeb 31","Bukhari 6018"),
 ("bukhari",5027,"خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ.","Sizin en hayırlınız Kur'an'ı öğrenen ve öğretendir.","The best among you are those who learn the Quran and teach it.","Buhârî, Fezâilü'l-Kur'ân 21","Bukhari 5027"),
 ("muslim",55,"الدِّينُ النَّصِيحَةُ.","Din nasihattir (samimiyettir).","Religion is sincerity.","Müslim, Îmân 95","Muslim 55"),
 ("bukhari",6114,"لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ.","Güçlü kimse güreşte yenen değil, öfkelendiğinde kendine hâkim olandır.","The strong one is not the one who overcomes others, but the one who controls himself when angry.","Buhârî, Edeb 76","Bukhari 6114"),
 ("muslim",223,"الطُّهُورُ شَطْرُ الْإِيمَانِ.","Temizlik imanın yarısıdır.","Purity is half of faith.","Müslim, Tahâret 1","Muslim 223"),
 ("bukhari",5997,"مَنْ لَا يَرْحَمُ لَا يُرْحَمُ.","Merhamet etmeyene merhamet olunmaz.","Whoever does not show mercy will not be shown mercy.","Buhârî, Edeb 18","Bukhari 5997"),
 ("tirmidhi",1956,"تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ.","Kardeşine tebessüm etmen senin için bir sadakadır.","Your smile for your brother is charity.","Tirmizî, Birr 36","Tirmidhi 1956"),
 ("bukhari",2989,"وَالْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ.","Güzel söz sadakadır.","A good word is charity.","Buhârî, Cihâd 72","Bukhari 2989"),
 ("muslim",2593,"إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ.","Allah Refîk'tir; yumuşaklığı (nezaketi) sever.","Allah is gentle and loves gentleness.","Müslim, Birr 77","Muslim 2593"),
 ("muslim",2588,"مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ.","Sadaka malı eksiltmez.","Charity does not decrease wealth.","Müslim, Birr 69","Muslim 2588"),
 ("tirmidhi",1987,"اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ.","Nerede olursan ol Allah'tan kork; kötülüğün ardından bir iyilik yap ki onu silsin; insanlara güzel ahlakla davran.","Fear Allah wherever you are, follow a bad deed with a good one to erase it, and treat people with good character.","Tirmizî, Birr 55","Tirmidhi 1987"),
 ("tirmidhi",1924,"الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ، ارْحَمُوا مَنْ فِي الْأَرْضِ يَرْحَمْكُمْ مَنْ فِي السَّمَاءِ.","Merhamet edenlere Rahmân merhamet eder. Yeryüzündekilere merhamet edin ki göktekiler de size merhamet etsin.","The merciful are shown mercy by the Most Merciful. Be merciful to those on earth, and the One in the heavens will be merciful to you.","Tirmizî, Birr 16","Tirmidhi 1924"),
 ("bukhari",6465,"أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ.","Allah'a en sevimli amel, az da olsa devamlı olanıdır.","The most beloved deeds to Allah are those done consistently, even if small.","Buhârî, Rikâk 18","Bukhari 6465"),
 ("muslim",2699,"مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ.","Kim ilim öğrenmek için bir yola girerse, Allah ona cennete giden yolu kolaylaştırır.","Whoever travels a path in search of knowledge, Allah makes easy for him a path to Paradise.","Müslim, Zikir 38","Muslim 2699"),
 ("muslim",2564,"إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ، وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ.","Allah sizin suretlerinize ve mallarınıza bakmaz; kalplerinize ve amellerinize bakar.","Allah does not look at your appearance or wealth, but He looks at your hearts and deeds.","Müslim, Birr 34","Muslim 2564"),
 ("tirmidhi",2969,"الدُّعَاءُ هُوَ الْعِبَادَةُ.","Dua ibadetin ta kendisidir.","Supplication is the essence of worship.","Tirmizî, Tefsîr 2","Tirmidhi 2969"),
 ("bukhari",6406,"كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ.","Dile hafif, mizanda ağır, Rahmân'a sevimli iki söz: Sübhânallâhi ve bihamdihî, Sübhânallâhi'l-azîm.","Two phrases light on the tongue, heavy on the scale, beloved to the Most Merciful: SubhanAllahi wa bihamdihi, SubhanAllahil-Azim.","Buhârî, Deavât 65","Bukhari 6406"),
 ("muslim",408,"مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا.","Kim bana bir salât getirirse Allah ona on rahmet eder.","Whoever sends one blessing upon me, Allah sends ten blessings upon him.","Müslim, Salât 70","Muslim 408"),
 ("bukhari",481,"الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا.","Mümin mümine karşı, birbirini destekleyen bir binanın tuğlaları gibidir.","A believer to another believer is like a building whose parts support one another.","Buhârî, Salât 88","Bukhari 481"),
 ("ibnmajah",2340,"لَا ضَرَرَ وَلَا ضِرَارَ.","Zarar vermek de zarara zararla karşılık vermek de yoktur.","There should be neither harm nor reciprocating harm.","İbn Mâce, Ahkâm 17","Ibn Majah 2340"),
 ("bukhari",3559,"إِنَّ مِنْ خِيَارِكُمْ أَحْسَنَكُمْ أَخْلَاقًا.","Sizin en hayırlınız ahlakı en güzel olanınızdır.","The best of you are those with the best character.","Buhârî, Menâkıb 23","Bukhari 3559"),
 ("bukhari",6502,"مَنْ عَادَى لِي وَلِيًّا فَقَدْ آذَنْتُهُ بِالْحَرْبِ... وَمَا يَزَالُ عَبْدِي يَتَقَرَّبُ إِلَيَّ بِالنَّوَافِلِ حَتَّى أُحِبَّهُ.","Kulum nafile ibadetlerle bana yaklaşmaya devam eder; nihayet onu severim.","My servant continues to draw near to Me with voluntary deeds until I love him.","Buhârî, Rikâk 38","Bukhari 6502"),
]

W = [
 ("Mevlânâ'ya atfedilir","Ya olduğun gibi görün, ya göründüğün gibi ol.","Either appear as you are, or be as you appear.","Attributed to Rumi"),
 ("Yunus Emre","Sevelim, sevilelim; dünya kimseye kalmaz.","Let us love and be loved; this world remains for no one.","Yunus Emre"),
 ("Hz. Ali","İnsanlar uykudadır, öldükleri zaman uyanırlar.","People are asleep; when they die, they awaken.","Ali ibn Abi Talib"),
 ("Mevlânâ","Dünle beraber gitti cancağızım, ne kadar söz varsa düne ait. Şimdi yeni şeyler söylemek lazım.","Yesterday is gone with all its words. Now it is time to say new things.","Rumi"),
 ("Hz. Ömer","Hesaba çekilmeden önce kendinizi hesaba çekin.","Take account of yourselves before you are taken to account.","Umar ibn al-Khattab"),
 ("İmam Şâfiî","Kendini hakla meşgul etmezsen, batıl seni meşgul eder.","If you do not occupy yourself with truth, falsehood will occupy you.","Imam al-Shafi'i"),
 ("Ra'd Suresi 28. ayetin mânâsından","Kalp, Allah'ı zikretmedikçe huzur bulmaz.","The heart finds no rest until it remembers Allah.","From the meaning of Qur'an 13:28"),
 ("Yunus Emre","Bir kez gönül yıktın ise bu kıldığın namaz değil.","If you have broken a heart, the prayer you performed is no prayer.","Yunus Emre"),
]

COL_TR = {"bukhari":"Buhârî","muslim":"Müslim","tirmidhi":"Tirmizî","ibnmajah":"İbn Mâce","abudawud":"Ebû Dâvûd","nasai":"Nesâî"}

items=[]
for a in ayahs:
    items.append({**a, "sourceTr": None, "sourceEn": None})
for col,num,ar,tr_,en,srcTr,srcEn in H:
    items.append({"id":f"hadith_{col}_{num}","type":"hadith","arabic":ar,"tr":tr_,"en":en,"sourceTr":srcTr,"sourceEn":srcEn,"collection":col,"hadithNumber":num})
for who,tr_,en,whoEn in W:
    items.append({"id":"wisdom_"+str(len(items)),"type":"wisdom","arabic":None,"tr":tr_,"en":en,"sourceTr":who,"sourceEn":whoEn})

# interleave: pattern ayah, ayah, hadith, ayah, hadith, wisdom ...
ay=[i for i in items if i["type"]=="ayah"]; hd=[i for i in items if i["type"]=="hadith"]; wd=[i for i in items if i["type"]=="wisdom"]
order=[]
ai=hi=wi=0
while ai<len(ay) or hi<len(hd) or wi<len(wd):
    for _ in range(2):
        if ai<len(ay): order.append(ay[ai]); ai+=1
    if hi<len(hd): order.append(hd[hi]); hi+=1
    if ai<len(ay): order.append(ay[ai]); ai+=1
    if wi<len(wd) and (ai%3==0): order.append(wd[wi]); wi+=1

def ts(v):
    return json.dumps(v, ensure_ascii=False)

lines=["// AUTO-GENERATED by scripts/buildDailyContent.py — curated daily content shown on the",
"// home screen and in the lock-screen / home-screen widgets. Works fully offline.",
"// Ayah text: Uthmani script (alquran.cloud). TR: Diyanet İşleri. EN: Saheeh International.",
"",
"export type DailyItemType = 'ayah' | 'hadith' | 'wisdom';",
"",
"export interface DailyItem {",
"  id: string;",
"  type: DailyItemType;",
"  arabic?: string;",
"  tr: string;",
"  en: string;",
"  /** Ayah: surah & ayah numbers. `ayahEnd` is set when the entry spans a range",
"   *  (Diyanet translates some verse groups jointly, so those are cited as a whole). */",
"  surah?: number;",
"  ayah?: number;",
"  ayahEnd?: number;",
"  /** Hadith / wisdom: human-readable source. */",
"  sourceTr?: string;",
"  sourceEn?: string;",
"  collection?: string;",
"  hadithNumber?: number;",
"}",
"",
"export const DAILY_CONTENT: DailyItem[] = ["]
for it in order:
    parts=[f"id: {ts(it['id'])}", f"type: {ts(it['type'])}"]
    if it.get("arabic"): parts.append(f"arabic: {ts(it['arabic'])}")
    parts.append(f"tr: {ts(it['tr'])}"); parts.append(f"en: {ts(it['en'])}")
    if it.get("surah"): parts.append(f"surah: {it['surah']}"); parts.append(f"ayah: {it['ayah']}")
    if it.get("ayahEnd"): parts.append(f"ayahEnd: {it['ayahEnd']}")
    if it.get("sourceTr"): parts.append(f"sourceTr: {ts(it['sourceTr'])}"); parts.append(f"sourceEn: {ts(it['sourceEn'])}")
    if it.get("collection"): parts.append(f"collection: {ts(it['collection'])}"); parts.append(f"hadithNumber: {it['hadithNumber']}")
    lines.append("  { "+", ".join(parts)+" },")
lines.append("];")
lines.append("")
lines.append("/** Ayah number(s) for citations: \"80\" or \"2-3\". */")
lines.append("export const ayahRange = (d: DailyItem): string =>")
lines.append("  d.ayahEnd && d.ayahEnd !== d.ayah ? `${d.ayah}-${d.ayahEnd}` : String(d.ayah ?? '');")
lines.append("")
lines.append("/** Deterministic pick for a given day so the app and the widgets always agree. */")
lines.append("export const dailyItemFor = (date: Date = new Date()): DailyItem => {")
lines.append("  const dayNumber = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000);")
lines.append("  return DAILY_CONTENT[dayNumber % DAILY_CONTENT.length];")
lines.append("};")
open('data/dailyContent.ts','w').write("\n".join(lines)+"\n")
print(len(order), "items")
