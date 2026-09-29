// Android widget renderers (react-native-android-widget). Runs in a headless JS task,
// so keep it dependency-light: only AsyncStorage + pure data.
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlexWidget, TextWidget, type WidgetInfo } from 'react-native-android-widget';
import { dailyItemFor, ayahRange } from '../data/dailyContent';

const GREEN = '#0f8a5f';
const CREAM = '#fcfbf9';

type Lang = 'tr' | 'en';

const readJson = async (key: string): Promise<any | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? parsed;
  } catch {
    return null;
  }
};

const getLang = async (): Promise<Lang> => (await readJson('ruhnevaz.settings'))?.language === 'en' ? 'en' : 'tr';

const pad = (n: number) => n.toString().padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const NAMES: Record<Lang, Record<string, string>> = {
  tr: { Fajr: 'İmsak', Sunrise: 'Güneş', Dhuhr: 'Öğle', Asr: 'İkindi', Maghrib: 'Akşam', Isha: 'Yatsı' },
  en: { Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
};

// ---- Daily reflection widget ----

export const renderDailyWidget = async (info: WidgetInfo) => {
  const lang = await getLang();
  const item = dailyItemFor();
  const text = lang === 'tr' ? item.tr : item.en;
  const source = item.type === 'ayah'
    ? `${lang === 'tr' ? 'Kur\'an' : 'Quran'} ${item.surah}:${ayahRange(item)}`
    : (lang === 'tr' ? item.sourceTr : item.sourceEn) ?? '';
  const kind = item.type === 'ayah' ? (lang === 'tr' ? 'GÜNÜN AYETİ' : 'AYAH OF THE DAY')
    : item.type === 'hadith' ? (lang === 'tr' ? 'GÜNÜN HADİSİ' : 'HADITH OF THE DAY')
    : (lang === 'tr' ? 'GÜNÜN HİKMETİ' : 'WISDOM OF THE DAY');
  const tall = info.height > 140;
  const maxLines = tall ? 6 : 3;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: GREEN,
        borderRadius: 24,
        padding: 18,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget text={kind} style={{ fontSize: 10, color: '#d1fae5', letterSpacing: 1.5, fontWeight: '600' }} />
      <FlexWidget style={{ flexDirection: 'column', flex: 1, justifyContent: 'center', width: 'match_parent' }}>
        {tall && item.arabic ? (
          <TextWidget
            text={item.arabic}
            maxLines={2}
            truncate="END"
            style={{ fontSize: 18, color: CREAM, textAlign: 'right', width: 'match_parent', marginBottom: 8 }}
          />
        ) : null}
        <TextWidget
          text={text}
          maxLines={maxLines}
          truncate="END"
          style={{ fontSize: tall ? 14 : 13, color: CREAM, width: 'match_parent' }}
        />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <TextWidget text={source} maxLines={1} style={{ fontSize: 11, color: '#a7f3d0' }} />
        <TextWidget text="☾ Ruhnevâz" style={{ fontSize: 11, color: '#a7f3d0' }} />
      </FlexWidget>
    </FlexWidget>
  );
};

// ---- Next prayer widget ----

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const renderPrayerWidget = async (info: WidgetInfo) => {
  const lang = await getLang();
  const prayer = await readJson('ruhnevaz.prayer');
  const location = prayer?.location;
  const calendars: any[] = prayer?.calendars ?? [];
  const key = todayKey();
  const allDays = calendars.flatMap((c: any) => c.days ?? []);
  const today = allDays.find((d: any) => d.date === key);
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = allDays.find((d: any) => d.date === `${tomorrowDate.getFullYear()}-${pad(tomorrowDate.getMonth() + 1)}-${pad(tomorrowDate.getDate())}`);

  let nextName = '—';
  let nextTime = '';
  let subtitle = location?.label ?? (lang === 'tr' ? 'Konum seçilmedi' : 'No location set');
  const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  if (today) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const next = order.find(k => toMinutes(today.timings[k]) > nowMin);
    if (next) {
      nextName = NAMES[lang][next];
      nextTime = today.timings[next];
    } else if (tomorrow) {
      nextName = NAMES[lang].Fajr;
      nextTime = tomorrow.timings.Fajr;
    }
  }
  const wide = info.width > 250;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0b1220',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget text={(lang === 'tr' ? 'SIRADAKİ VAKİT' : 'NEXT PRAYER')} style={{ fontSize: 10, color: '#6ee7b7', letterSpacing: 1.5, fontWeight: '600' }} />
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={nextName} style={{ fontSize: 22, color: '#f8fafc', fontWeight: '700' }} />
        <TextWidget text={nextTime} style={{ fontSize: 30, color: '#34d399', fontWeight: '700' }} />
      </FlexWidget>
      {wide && today ? (
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
          {order.filter(k => k !== 'Sunrise').map(k => (
            <FlexWidget key={k} style={{ flexDirection: 'column', alignItems: 'center' }}>
              <TextWidget text={NAMES[lang][k]} style={{ fontSize: 10, color: '#94a3b8' }} />
              <TextWidget text={today.timings[k]} style={{ fontSize: 12, color: '#e2e8f0', fontWeight: '600' }} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <TextWidget text={subtitle} maxLines={1} style={{ fontSize: 11, color: '#94a3b8' }} />
      )}
    </FlexWidget>
  );
};
