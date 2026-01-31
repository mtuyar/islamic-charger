import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { getPrayerTimes } from '../services/api';
import { MapPin, ChevronDown, X, Check, Search, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schedulePrayerNotification, cancelAllNotifications } from '../services/notifications';

const PRAYER_NAMES: { [key: string]: string } = {
    Fajr: 'İmsak',
    Sunrise: 'Güneş',
    Dhuhr: 'Öğle',
    Asr: 'İkindi',
    Maghrib: 'Akşam',
    Isha: 'Yatsı'
};

const CITIES = [
    { name: 'Adana', country: 'Turkey', label: 'Adana' },
    { name: 'Adiyaman', country: 'Turkey', label: 'Adıyaman' },
    { name: 'Afyonkarahisar', country: 'Turkey', label: 'Afyonkarahisar' },
    { name: 'Agri', country: 'Turkey', label: 'Ağrı' },
    { name: 'Aksaray', country: 'Turkey', label: 'Aksaray' },
    { name: 'Amasya', country: 'Turkey', label: 'Amasya' },
    { name: 'Ankara', country: 'Turkey', label: 'Ankara' },
    { name: 'Antalya', country: 'Turkey', label: 'Antalya' },
    { name: 'Ardahan', country: 'Turkey', label: 'Ardahan' },
    { name: 'Artvin', country: 'Turkey', label: 'Artvin' },
    { name: 'Aydin', country: 'Turkey', label: 'Aydın' },
    { name: 'Balikesir', country: 'Turkey', label: 'Balıkesir' },
    { name: 'Bartin', country: 'Turkey', label: 'Bartın' },
    { name: 'Batman', country: 'Turkey', label: 'Batman' },
    { name: 'Bayburt', country: 'Turkey', label: 'Bayburt' },
    { name: 'Bilecik', country: 'Turkey', label: 'Bilecik' },
    { name: 'Bingol', country: 'Turkey', label: 'Bingöl' },
    { name: 'Bitlis', country: 'Turkey', label: 'Bitlis' },
    { name: 'Bolu', country: 'Turkey', label: 'Bolu' },
    { name: 'Burdur', country: 'Turkey', label: 'Burdur' },
    { name: 'Bursa', country: 'Turkey', label: 'Bursa' },
    { name: 'Canakkale', country: 'Turkey', label: 'Çanakkale' },
    { name: 'Cankiri', country: 'Turkey', label: 'Çankırı' },
    { name: 'Corum', country: 'Turkey', label: 'Çorum' },
    { name: 'Denizli', country: 'Turkey', label: 'Denizli' },
    { name: 'Diyarbakir', country: 'Turkey', label: 'Diyarbakır' },
    { name: 'Duzce', country: 'Turkey', label: 'Düzce' },
    { name: 'Edirne', country: 'Turkey', label: 'Edirne' },
    { name: 'Elazig', country: 'Turkey', label: 'Elazığ' },
    { name: 'Erzincan', country: 'Turkey', label: 'Erzincan' },
    { name: 'Erzurum', country: 'Turkey', label: 'Erzurum' },
    { name: 'Eskisehir', country: 'Turkey', label: 'Eskişehir' },
    { name: 'Gaziantep', country: 'Turkey', label: 'Gaziantep' },
    { name: 'Giresun', country: 'Turkey', label: 'Giresun' },
    { name: 'Gumushane', country: 'Turkey', label: 'Gümüşhane' },
    { name: 'Hakkari', country: 'Turkey', label: 'Hakkari' },
    { name: 'Hatay', country: 'Turkey', label: 'Hatay' },
    { name: 'Igdir', country: 'Turkey', label: 'Iğdır' },
    { name: 'Isparta', country: 'Turkey', label: 'Isparta' },
    { name: 'Istanbul', country: 'Turkey', label: 'İstanbul' },
    { name: 'Izmir', country: 'Turkey', label: 'İzmir' },
    { name: 'Kahramanmaras', country: 'Turkey', label: 'Kahramanmaraş' },
    { name: 'Karabuk', country: 'Turkey', label: 'Karabük' },
    { name: 'Karaman', country: 'Turkey', label: 'Karaman' },
    { name: 'Kars', country: 'Turkey', label: 'Kars' },
    { name: 'Kastamonu', country: 'Turkey', label: 'Kastamonu' },
    { name: 'Kayseri', country: 'Turkey', label: 'Kayseri' },
    { name: 'Kirikkale', country: 'Turkey', label: 'Kırıkkale' },
    { name: 'Kirklareli', country: 'Turkey', label: 'Kırklareli' },
    { name: 'Kirsehir', country: 'Turkey', label: 'Kırşehir' },
    { name: 'Kilis', country: 'Turkey', label: 'Kilis' },
    { name: 'Kocaeli', country: 'Turkey', label: 'Kocaeli' },
    { name: 'Konya', country: 'Turkey', label: 'Konya' },
    { name: 'Kutahya', country: 'Turkey', label: 'Kütahya' },
    { name: 'Malatya', country: 'Turkey', label: 'Malatya' },
    { name: 'Manisa', country: 'Turkey', label: 'Manisa' },
    { name: 'Mardin', country: 'Turkey', label: 'Mardin' },
    { name: 'Mersin', country: 'Turkey', label: 'Mersin' },
    { name: 'Mugla', country: 'Turkey', label: 'Muğla' },
    { name: 'Mus', country: 'Turkey', label: 'Muş' },
    { name: 'Nevsehir', country: 'Turkey', label: 'Nevşehir' },
    { name: 'Nigde', country: 'Turkey', label: 'Niğde' },
    { name: 'Ordu', country: 'Turkey', label: 'Ordu' },
    { name: 'Osmaniye', country: 'Turkey', label: 'Osmaniye' },
    { name: 'Rize', country: 'Turkey', label: 'Rize' },
    { name: 'Sakarya', country: 'Turkey', label: 'Sakarya' },
    { name: 'Samsun', country: 'Turkey', label: 'Samsun' },
    { name: 'Sanliurfa', country: 'Turkey', label: 'Şanlıurfa' },
    { name: 'Siirt', country: 'Turkey', label: 'Siirt' },
    { name: 'Sinop', country: 'Turkey', label: 'Sinop' },
    { name: 'Sirnak', country: 'Turkey', label: 'Şırnak' },
    { name: 'Sivas', country: 'Turkey', label: 'Sivas' },
    { name: 'Tekirdag', country: 'Turkey', label: 'Tekirdağ' },
    { name: 'Tokat', country: 'Turkey', label: 'Tokat' },
    { name: 'Trabzon', country: 'Turkey', label: 'Trabzon' },
    { name: 'Tunceli', country: 'Turkey', label: 'Tunceli' },
    { name: 'Usak', country: 'Turkey', label: 'Uşak' },
    { name: 'Van', country: 'Turkey', label: 'Van' },
    { name: 'Yalova', country: 'Turkey', label: 'Yalova' },
    { name: 'Yozgat', country: 'Turkey', label: 'Yozgat' },
    { name: 'Zonguldak', country: 'Turkey', label: 'Zonguldak' }
];

interface PrayerTimesWidgetProps {
    darkMode?: boolean;
}

const PrayerTimesWidget: React.FC<PrayerTimesWidgetProps> = ({ darkMode = false }) => {
    const [times, setTimes] = useState<any>(null);
    const [dateInfo, setDateInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCity, setSelectedCity] = useState(CITIES.find(c => c.name === 'Istanbul') || CITIES[0]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [nextPrayer, setNextPrayer] = useState<{ name: string; key: string; timeLeft: string; percent: number } | null>(null);
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState<{ [key: string]: boolean }>({
        Fajr: true,
        Sunrise: false,
        Dhuhr: true,
        Asr: true,
        Maghrib: true,
        Isha: true
    });

    const bgColor = darkMode ? '#1e293b' : '#ffffff';
    const borderColor = darkMode ? '#334155' : '#f5f5f4';
    const textPrimary = darkMode ? '#ffffff' : '#1c1917';
    const textSecondary = darkMode ? '#94a3b8' : '#78716c';
    const inputBg = darkMode ? '#0f172a' : '#f5f5f4';

    useEffect(() => {
        loadSavedCity();
    }, []);

    useEffect(() => {
        loadNotificationPrefs();
    }, []);

    useEffect(() => {
        fetchTimes();
    }, [selectedCity]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (times) calculateTimeline(times);
        }, 60000);
        return () => clearInterval(interval);
    }, [times]);

    const loadSavedCity = async () => {
        try {
            const savedCity = await AsyncStorage.getItem('selectedCity');
            if (savedCity) {
                const city = JSON.parse(savedCity);
                setSelectedCity(city);
            }
        } catch (e) {
            console.error("Failed to load city", e);
        }
    };

    const saveCity = async (city: typeof CITIES[0]) => {
        try {
            await AsyncStorage.setItem('selectedCity', JSON.stringify(city));
            setSelectedCity(city);
            setShowCityPicker(false);
        } catch (e) {
            console.error("Failed to save city", e);
        }
    };

    const loadNotificationPrefs = async () => {
        try {
            const saved = await AsyncStorage.getItem('notificationPrefs');
            if (saved) {
                setNotificationPrefs(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load notification prefs", e);
        }
    };

    const toggleNotification = async (key: string) => {
        const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
        setNotificationPrefs(newPrefs);
        try {
            await AsyncStorage.setItem('notificationPrefs', JSON.stringify(newPrefs));
            // Reschedule with new prefs if times exist
            if (times) scheduleNotifications(times, newPrefs);
        } catch (e) {
            console.error("Failed to save notification prefs", e);
        }
    };

    const scheduleNotifications = async (timings: any, prefs = notificationPrefs) => {
        await cancelAllNotifications();
        const now = new Date();
        const prayerOrder = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        const MESSAGES: { [key: string]: string } = {
            Fajr: "Gözlerini aç ve ruhunu uyandır. Sabahın bereketi seni bekliyor. Namaz, uykudan hayırlıdır.",
            Sunrise: "Güneş doğdu, günün aydınlandı. Şükürle başla, günün bereketlensin.",
            Dhuhr: "Dünya telaşına kısa bir mola. Ruhunu dinlendir, Rabbine yönel. Öğle vakti, yenilenme vaktidir.",
            Asr: "Günün yorgunluğunu secdeyle at. Zaman hızla akıp gidiyor. İkindi vakti, huzur vaktidir.",
            Maghrib: "Güneş batarken hüzün değil, huzur dolsun kalbine. Günün şükrünü eda etme vakti.",
            Isha: "Gecenin karanlığında nurunu ara. Günü huzurla kapat, yarına umutla uyan. Yatsı namazı, ruhun miracıdır."
        };

        prayerOrder.forEach(p => {
            if (!prefs[p]) return; // Skip if disabled

            const [h, m] = timings[p].split(':').map(Number);
            const prayerDate = new Date();
            prayerDate.setHours(h, m, 0, 0);

            if (prayerDate > now) {
                schedulePrayerNotification(
                    `${PRAYER_NAMES[p]} Vakti`,
                    MESSAGES[p],
                    prayerDate
                );
            }
        });
    };

    const fetchTimes = async () => {
        setLoading(true);
        const data = await getPrayerTimes(selectedCity.name, selectedCity.country);
        if (data) {
            setTimes(data.timings);
            setDateInfo(data.date);
            calculateTimeline(data.timings);
            scheduleNotifications(data.timings, notificationPrefs);
        }
        setLoading(false);
    };

    const calculateTimeline = (timings: any) => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const prayerOrder = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const timeInMinutes = prayerOrder.map(p => {
            const [h, m] = timings[p].split(':').map(Number);
            return h * 60 + m;
        });

        let nextIndex = -1;
        for (let i = 0; i < timeInMinutes.length; i++) {
            if (timeInMinutes[i] > currentMinutes) {
                nextIndex = i;
                break;
            }
        }

        let prevTime, nextTime, targetName, targetKey;

        if (nextIndex === -1) {
            // After Isha, next is Fajr (tomorrow)
            // Interval: Isha -> Fajr (tomorrow)
            prevTime = timeInMinutes[5]; // Isha
            nextTime = timeInMinutes[0] + 1440; // Fajr + 24h
            targetName = PRAYER_NAMES['Fajr'];
            targetKey = 'Fajr';
        } else if (nextIndex === 0) {
            // Before Fajr, next is Fajr
            // Interval: Isha (yesterday) -> Fajr
            prevTime = timeInMinutes[5] - 1440; // Isha - 24h
            nextTime = timeInMinutes[0]; // Fajr
            targetName = PRAYER_NAMES['Fajr'];
            targetKey = 'Fajr';
        } else {
            // Normal interval
            prevTime = timeInMinutes[nextIndex - 1];
            nextTime = timeInMinutes[nextIndex];
            targetName = PRAYER_NAMES[prayerOrder[nextIndex]];
            targetKey = prayerOrder[nextIndex];
        }

        const totalDuration = nextTime - prevTime;
        const elapsed = currentMinutes - prevTime;
        const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        // Calculate remaining time for display
        let diff = nextTime - currentMinutes;
        const h = Math.floor(diff / 60);
        const m = diff % 60;

        setNextPrayer({
            name: targetName,
            key: targetKey,
            timeLeft: h > 0 ? `${h}sa ${m}dk` : `${m}dk`,
            percent: percent
        });
    };

    const filteredCities = CITIES.filter(city =>
        city.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]} />
    );

    if (!times) return null;

    const progressWidth = nextPrayer ? `${nextPrayer.percent}%` : '0%';

    return (
        <>
            <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
                {/* Header with City & Date */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => setShowCityPicker(true)}
                        style={[styles.cityButton, { backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#ecfdf5' }]}
                    >
                        <MapPin size={14} color="#047857" />
                        <Text style={styles.cityText}>{selectedCity.label.toUpperCase()}</Text>
                        <ChevronDown size={14} color="#047857" />
                    </TouchableOpacity>

                    <View style={styles.headerRight}>
                        <View style={styles.dateContainer}>
                            <Text style={[styles.hijriDate, { color: textSecondary }]}>
                                {dateInfo?.hijri?.day} {dateInfo?.hijri?.month?.ar}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowNotificationSettings(true)}
                            style={[styles.iconButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f4' }]}
                        >
                            <Bell size={16} color={textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Journey Timeline Design */}
                <View style={styles.timelineSection}>
                    {/* Main Countdown */}
                    <View style={styles.mainCountdown}>
                        <Text style={[styles.timeLeftLabel, { color: textSecondary }]}>KALAN SÜRE</Text>
                        <Text style={[styles.timeLeftBig, { color: textPrimary }]}>{nextPrayer?.timeLeft}</Text>
                    </View>

                    {/* Timeline Bar */}
                    <View style={styles.timelineContainer}>
                        {/* Start Label */}
                        <View style={styles.timelineLabelLeft}>
                            <Text style={[styles.timelineTime, { color: textSecondary }]}>
                                {times && nextPrayer ? times[Object.keys(PRAYER_NAMES).find(key => PRAYER_NAMES[key] === nextPrayer.name) === 'Fajr' ? 'Isha' : 'Fajr'] : '--:--'}
                            </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={[styles.progressBarBg, { backgroundColor: darkMode ? '#334155' : '#e5e7eb' }]}>
                            <View style={[styles.progressBarFill, {
                                width: progressWidth as any,
                                backgroundColor: darkMode ? '#34d399' : '#10b981'
                            }]} />
                            <View style={[styles.progressIndicator, {
                                left: progressWidth as any,
                                backgroundColor: darkMode ? '#34d399' : '#10b981',
                                borderColor: darkMode ? '#1e293b' : '#ffffff'
                            }]} />
                        </View>

                        {/* End Label */}
                        <View style={styles.timelineLabelRight}>
                            <Text style={[styles.timelineTime, { color: textPrimary }]}>
                                {times && nextPrayer ? times[nextPrayer.key] : '--:--'}
                            </Text>
                        </View>
                    </View>

                    {/* Next Prayer Name */}
                    <View style={styles.nextPrayerInfo}>
                        <Text style={[styles.nextLabel, { color: textSecondary }]}>SONRAKİ VAKİT</Text>
                        <Text style={[styles.nextPrayerName, { color: textPrimary }]}>{nextPrayer?.name}</Text>
                    </View>
                </View>

                {/* All Prayer Times Grid */}
                <View style={styles.timesGrid}>
                    {Object.entries(PRAYER_NAMES).map(([key, name]) => {
                        const isActive = nextPrayer?.key === key;
                        return (
                            <View
                                key={key}
                                style={[
                                    styles.timeItem,
                                    {
                                        backgroundColor: isActive
                                            ? (darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5')
                                            : 'transparent',
                                        borderColor: isActive
                                            ? (darkMode ? 'rgba(16,185,129,0.3)' : '#a7f3d0')
                                            : 'transparent',
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.timeName,
                                    { color: isActive ? (darkMode ? '#34d399' : '#047857') : textSecondary }
                                ]}>
                                    {name}
                                </Text>
                                <Text style={[
                                    styles.timeValue,
                                    { color: isActive ? (darkMode ? '#34d399' : '#047857') : textPrimary }
                                ]}>
                                    {times[key]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Notification Settings Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showNotificationSettings}
                onRequestClose={() => setShowNotificationSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowNotificationSettings(false)}
                    />
                    <View style={[styles.settingsModal, { backgroundColor: darkMode ? '#1e293b' : '#ffffff' }]}>
                        <View style={styles.settingsHeader}>
                            <Text style={[styles.settingsTitle, { color: textPrimary }]}>Bildirim Ayarları</Text>
                            <TouchableOpacity onPress={() => setShowNotificationSettings(false)}>
                                <X size={20} color={textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.settingsSubtitle, { color: textSecondary }]}>
                            Bildirim almak istediğiniz vakitleri seçin.
                        </Text>

                        <View style={styles.settingsList}>
                            {Object.entries(PRAYER_NAMES).map(([key, name]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.settingItem, { borderBottomColor: darkMode ? '#334155' : '#f5f5f4' }]}
                                    onPress={() => toggleNotification(key)}
                                >
                                    <View style={styles.settingLabel}>
                                        <Text style={[styles.settingName, { color: textPrimary }]}>{name}</Text>
                                        <Text style={[styles.settingTime, { color: textSecondary }]}>{times?.[key]}</Text>
                                    </View>
                                    <View style={[
                                        styles.toggle,
                                        {
                                            backgroundColor: notificationPrefs[key]
                                                ? (darkMode ? '#10b981' : '#059669')
                                                : (darkMode ? '#334155' : '#e5e7eb')
                                        }
                                    ]}>
                                        <View style={[
                                            styles.toggleKnob,
                                            {
                                                transform: [{ translateX: notificationPrefs[key] ? 20 : 2 }]
                                            }
                                        ]} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>


                    </View>
                </View>
            </Modal>

            {/* City Picker Modal (Existing) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showCityPicker}
                onRequestClose={() => setShowCityPicker(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowCityPicker(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: darkMode ? '#0f172a' : '#ffffff' }]}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Şehir Seçin</Text>
                            <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                                <X size={24} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={[styles.searchInput, { backgroundColor: inputBg, borderColor }]}>
                            <Search size={18} color={textSecondary} />
                            <TextInput
                                placeholder="Şehir ara..."
                                placeholderTextColor={textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={[styles.searchTextInput, { color: textPrimary }]}
                            />
                        </View>

                        <ScrollView style={styles.cityList} keyboardShouldPersistTaps="handled">
                            {filteredCities.map((city) => (
                                <TouchableOpacity
                                    key={city.name}
                                    onPress={() => saveCity(city)}
                                    style={[
                                        styles.cityOption,
                                        {
                                            backgroundColor: selectedCity.name === city.name
                                                ? (darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5')
                                                : (darkMode ? '#1e293b' : '#fafaf9'),
                                            borderColor: selectedCity.name === city.name
                                                ? (darkMode ? 'rgba(16,185,129,0.3)' : '#a7f3d0')
                                                : borderColor,
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        styles.cityOptionText,
                                        { color: selectedCity.name === city.name ? '#047857' : textPrimary }
                                    ]}>
                                        {city.label}
                                    </Text>
                                    {selectedCity.name === city.name && (
                                        <Check size={20} color="#047857" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    loadingContainer: {
        height: 280,
        borderRadius: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    cityText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#047857',
        letterSpacing: 0.5,
    },
    dateContainer: {
        marginRight: 8,
    },
    hijriDate: {
        fontSize: 12,
        fontWeight: '600',
    },
    gregorianDate: {
        fontSize: 11,
        marginTop: 2,
    },
    timelineSection: {
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    mainCountdown: {
        alignItems: 'center',
        marginBottom: 20,
    },
    timeLeftLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
        opacity: 0.7,
        textTransform: 'uppercase',
    },
    timeLeftBig: {
        fontSize: 36,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
        letterSpacing: -1,
    },
    timelineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    timelineLabelLeft: {
        width: 40,
        alignItems: 'flex-end',
    },
    timelineLabelRight: {
        width: 40,
        alignItems: 'flex-start',
    },
    timelineTime: {
        fontSize: 12,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        position: 'relative',
        justifyContent: 'center',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressIndicator: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        marginLeft: -7, // Center on end of bar
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    nextPrayerInfo: {
        alignItems: 'center',
    },
    nextLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
        opacity: 0.6,
    },
    nextPrayerName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    timesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    timeItem: {
        width: '31%',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    timeName: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeValue: {
        fontSize: 15,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 12,
        maxHeight: '80%',
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#d6d3d1',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    cityList: {
        maxHeight: 400,
    },
    cityOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    cityOptionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    settingsModal: {
        margin: 24,
        marginBottom: 'auto',
        marginTop: 'auto',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    settingsTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    settingsSubtitle: {
        fontSize: 13,
        marginBottom: 20,
    },
    settingsList: {
        gap: 4,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    settingLabel: {
        gap: 2,
    },
    settingName: {
        fontSize: 15,
        fontWeight: '600',
    },
    settingTime: {
        fontSize: 12,
    },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
        justifyContent: 'center',
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
});

export default PrayerTimesWidget;