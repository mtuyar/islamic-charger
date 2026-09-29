import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationSound } from '../store/usePrayerStore';
import { t } from '../i18n';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/** iOS caps pending local notifications at 64; keep a safety margin. */
export const MAX_SCHEDULED = 60;

/** `name` is an i18n key, resolved when the Android channel is (re)registered. */
const CHANNELS: Record<NotificationSound, { id: string; name: string; sound: string | null }> = {
    default: { id: 'prayer-default', name: 'prayer.channelDefault', sound: 'default' },
    chime: { id: 'prayer-chime', name: 'prayer.channelChime', sound: 'chime.wav' },
    adhan: { id: 'prayer-chime', name: 'prayer.channelChime', sound: 'chime.wav' },
    silent: { id: 'prayer-silent', name: 'prayer.channelSilent', sound: null },
};
const HOLY_CHANNEL = { id: 'holy-nights', name: 'prayer.channelHoly' };

let channelsReady = false;

export async function ensureChannels() {
    if (Platform.OS !== 'android' || channelsReady) return;
    for (const c of Object.values(CHANNELS)) {
        await Notifications.setNotificationChannelAsync(c.id, {
            name: t(c.name),
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0f8a5f',
            sound: c.sound ?? undefined,
            enableVibrate: c.sound !== null,
        });
    }
    await Notifications.setNotificationChannelAsync(HOLY_CHANNEL.id, {
        name: t(HOLY_CHANNEL.name),
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'chime.wav',
    });
    channelsReady = true;
}

/** Returns true if notifications are allowed. Does NOT prompt. */
export async function hasNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}

/** Prompts the user (call this in context, e.g. when they enable reminders). */
export async function requestNotificationPermission(): Promise<boolean> {
    await ensureChannels();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

/** @deprecated kept for older call sites; prefer requestNotificationPermission */
export const registerForPushNotificationsAsync = requestNotificationPermission;

interface ScheduleOpts {
    title: string;
    body: string;
    date: Date;
    sound?: NotificationSound;
    holy?: boolean;
    data?: Record<string, unknown>;
}

export async function scheduleAt({ title, body, date, sound = 'chime', holy = false, data }: ScheduleOpts): Promise<string | null> {
    if (date.getTime() <= Date.now()) return null;
    try {
        await ensureChannels();
        const channel = holy ? HOLY_CHANNEL.id : CHANNELS[sound].id;
        const iosSound = holy ? 'chime.wav' : CHANNELS[sound].sound;
        return await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: iosSound === null ? false : iosSound === 'default' ? true : iosSound,
                ...(Platform.OS === 'android' ? { channelId: channel } : {}),
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date,
                ...(Platform.OS === 'android' ? { channelId: channel } : {}),
            },
        });
    } catch (error) {
        console.warn('Notification schedule failed', error);
        return null;
    }
}

/** Kept for backwards compatibility with PrayerTimesWidget. */
export async function schedulePrayerNotification(title: string, body: string, triggerDate: Date) {
    return scheduleAt({ title, body, date: triggerDate });
}

export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledCount(): Promise<number> {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    return list.length;
}
