import { paletteFor } from '../theme';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../i18n';

const { width } = Dimensions.get('window');

// Mecca Coordinates
const MECCA_LAT = 21.422487;
const MECCA_LON = 39.826206;

interface Props {
  darkMode: boolean;
  onBack: () => void;
}

const QiblaCompass: React.FC<Props> = ({ darkMode, onBack }) => {
  const pal = paletteFor(darkMode);
  useSettingsStore(s => s.language); // re-render on language change
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [isAligned, setIsAligned] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null); // 0–3 (iOS/Android), higher = better; <=1 means calibrate
  const smoothedRef = useRef<number | null>(null);

  // Colors
  const bg = pal.bg;
  const cardBg = pal.card;
  const border = pal.borderStrong;
  const textPrimary = pal.text;
  const textSec = pal.textSecondary;
  const accent = darkMode ? '#fbbf24' : '#d97706'; // Amber/Gold
  const successColor = '#10b981'; // Emerald when aligned

  // Reanimated values
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    let headingSub: Location.LocationSubscription;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasPermission(false);
          setErrorMsg(t('qibla.permissionNeeded'));
          return;
        }
        setHasPermission(true);

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const qAngle = calculateQibla(location.coords.latitude, location.coords.longitude);
        setQiblaAngle(qAngle);

        headingSub = await Location.watchHeadingAsync((h) => {
            const raw = h.trueHeading !== -1 ? h.trueHeading : h.magHeading;
            // Exponential smoothing on the unit circle so the needle doesn't jitter
            // (and doesn't spin the long way round when crossing 0°/360°).
            const prev = smoothedRef.current;
            if (prev === null) {
              smoothedRef.current = raw;
            } else {
              let delta = raw - prev;
              if (delta > 180) delta -= 360;
              if (delta < -180) delta += 360;
              smoothedRef.current = (prev + delta * 0.25 + 360) % 360;
            }
            setHeading(Math.round(smoothedRef.current));
            setAccuracy(typeof h.accuracy === 'number' ? h.accuracy : null);
        });
      } catch (e) {
        setErrorMsg(t('qibla.sensorError'));
      }
    })();

    return () => {
      if (headingSub) {
        headingSub.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (qiblaAngle === null) return;

    // Calculate shortest rotation path
    let diff = qiblaAngle - heading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    rotation.value = withTiming(diff, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });

    const isNowAligned = Math.abs(diff) < 3;
    
    if (isNowAligned !== isAligned) {
      setIsAligned(isNowAligned);
      if (isNowAligned) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        glowOpacity.value = withSpring(1);
      } else {
        glowOpacity.value = withTiming(0);
      }
    }
  }, [heading, qiblaAngle]);

  const calculateQibla = (lat: number, lon: number) => {
    const phiK = (MECCA_LAT * Math.PI) / 180.0;
    const lambdaK = (MECCA_LON * Math.PI) / 180.0;
    const phi = (lat * Math.PI) / 180.0;
    const lambda = (lon * Math.PI) / 180.0;

    const y = Math.sin(lambdaK - lambda);
    const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
    
    let qibla = (Math.atan2(y, x) * 180.0) / Math.PI;
    if (qibla < 0) qibla += 360;
    return Math.floor(qibla);
  };

  const animatedCompassStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
      transform: [{ scale: 1 + glowOpacity.value * 0.1 }],
    };
  });

  if (hasPermission === false || errorMsg) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
            <ChevronLeft size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('qibla.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: textSec }]}>{errorMsg || t('qibla.permissionDenied')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ChevronLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('qibla.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {qiblaAngle === null ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.loadingText, { color: textSec }]}>{t('qibla.locating')}</Text>
          </View>
        ) : (
          <View style={styles.compassContainer}>
            {/* Background Glow when aligned */}
            <Animated.View 
              style={[
                styles.glowLayer, 
                { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.2)' },
                animatedGlowStyle
              ]} 
            />

            {/* Fixed Outer Ring */}
            <View style={[styles.outerRing, { borderColor: border }]}>
              <View style={[styles.marker, styles.markerN, { backgroundColor: textSec }]} />
              <View style={[styles.marker, styles.markerE, { backgroundColor: border }]} />
              <View style={[styles.marker, styles.markerS, { backgroundColor: border }]} />
              <View style={[styles.marker, styles.markerW, { backgroundColor: border }]} />
            </View>

            {/* Rotating Compass Dial */}
            <Animated.View style={[styles.dial, animatedCompassStyle]}>
              <View style={[styles.kaabaPointer, { backgroundColor: isAligned ? successColor : accent }]}>
                {/* Kaaba Silhouette */}
                <View style={styles.kaabaIcon}>
                  <View style={styles.kaabaGoldBand} />
                </View>
              </View>
              
              {/* Pointer Arrow */}
              <View style={[styles.arrowBody, { backgroundColor: isAligned ? successColor : accent }]} />
              <View style={styles.centerDot} />
              <View style={[styles.arrowTail, { backgroundColor: darkMode ? '#334155' : '#cbd5e1' }]} />
            </Animated.View>
          </View>
        )}

        {qiblaAngle !== null && (
          <View style={styles.infoBox}>
            <Text style={[styles.angleText, { color: isAligned ? successColor : textPrimary }]}>
              {isAligned ? t('qibla.aligned') : t('qibla.turn')}
            </Text>
            <View style={[styles.locationRow, { backgroundColor: cardBg, borderColor: border }]}>
              <MapPin size={16} color={accent} />
              <Text style={[styles.locationText, { color: textSec }]}>
                {t('qibla.angle')} <Text style={{ color: textPrimary, fontWeight: '700' }}>{qiblaAngle}°</Text>
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const COMPASS_SIZE = width * 0.75;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 40, lineHeight: 24 },
  loadingText: { fontSize: 15, marginTop: 16 },
  
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowLayer: {
    position: 'absolute',
    width: COMPASS_SIZE + 40,
    height: COMPASS_SIZE + 40,
    borderRadius: (COMPASS_SIZE + 40) / 2,
  },
  outerRing: {
    position: 'absolute',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  marker: { position: 'absolute', width: 4, height: 16, borderRadius: 2 },
  markerN: { top: -8, left: COMPASS_SIZE / 2 - 2 },
  markerS: { bottom: -8, left: COMPASS_SIZE / 2 - 2 },
  markerE: { right: -8, top: COMPASS_SIZE / 2 - 2, width: 16, height: 4 },
  markerW: { left: -8, top: COMPASS_SIZE / 2 - 2, width: 16, height: 4 },

  dial: {
    width: COMPASS_SIZE - 40,
    height: COMPASS_SIZE - 40,
    borderRadius: (COMPASS_SIZE - 40) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'rgba(255,255,255,0.02)', // slight glass effect
  },
  kaabaPointer: {
    position: 'absolute',
    top: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  kaabaIcon: {
    width: 20,
    height: 24,
    backgroundColor: '#000', // Black Kaaba
    borderRadius: 2,
    justifyContent: 'center',
  },
  kaabaGoldBand: {
    width: '100%',
    height: 4,
    backgroundColor: '#fbbf24',
    marginTop: -8,
  },
  arrowBody: {
    position: 'absolute',
    top: 24,
    width: 4,
    height: (COMPASS_SIZE - 40) / 2 - 24,
    borderRadius: 2,
  },
  arrowTail: {
    position: 'absolute',
    bottom: 40,
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1c1917',
    borderWidth: 3,
    borderColor: '#ffffff',
    zIndex: 5,
  },
  infoBox: {
    marginTop: 60,
    alignItems: 'center',
    gap: 16,
  },
  angleText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  locationText: {
    fontSize: 14,
  }
});

export default QiblaCompass;
