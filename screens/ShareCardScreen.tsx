import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { Screen, Header, Button, Chip, SectionTitle } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

type Style = 'green' | 'light' | 'dark';

const PALETTES: Record<Style, { colors: [string, string]; text: string; sub: string; brand: string }> = {
  green: { colors: ['#0f8a5f', '#054d38'], text: '#ffffff', sub: 'rgba(255,255,255,0.78)', brand: 'rgba(255,255,255,0.7)' },
  light: { colors: ['#fcfbf9', '#efece4'], text: '#1c1917', sub: '#78716c', brand: '#0f8a5f' },
  dark: { colors: ['#0b1220', '#020617'], text: '#f8fafc', sub: '#94a3b8', brand: '#34d399' },
};

const ShareCardScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ShareCard'>>();
  const arabicFont = useSettingsStore(s => s.arabicFont);
  const shot = useRef<ViewShot>(null);
  const [style, setStyle] = useState<Style>('green');
  const [showTranslation, setShowTranslation] = useState(true);
  const [sharing, setSharing] = useState(false);
  const p = PALETTES[style];
  const longArabic = (params.arabic?.length ?? 0) > 160;

  const share = async () => {
    setSharing(true);
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <Header title={t('share.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ borderRadius: RADIUS.xl, overflow: 'hidden' }}>
        <ViewShot ref={shot} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: p.colors[0] }}>
          <LinearGradient colors={p.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <Text style={[styles.ornament, { color: p.brand }]}>﴾ ﴿</Text>
            {params.arabic ? (
              <Text style={[styles.arabic, { color: p.text, fontFamily: arabicFont === 'MeQuran' ? 'Amiri_400Regular' : arabicFont, fontSize: longArabic ? 22 : 28, lineHeight: longArabic ? 40 : 50 }]}>
                {params.arabic}
              </Text>
            ) : null}
            {showTranslation || !params.arabic ? (
              <Text style={[styles.text, { color: params.arabic ? p.sub : p.text, fontSize: params.arabic ? 15 : 19, lineHeight: params.arabic ? 24 : 30 }]}>
                {params.text}
              </Text>
            ) : null}
            <View style={styles.footer}>
              <Text style={[styles.source, { color: p.sub }]}>{params.source}</Text>
              <Text style={[styles.brand, { color: p.brand }]}>☾ {t('share.watermark')}</Text>
            </View>
          </LinearGradient>
        </ViewShot>
        </View>

        <View>
          <SectionTitle title={t('share.style')} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label={t('share.styleGreen')} active={style === 'green'} onPress={() => setStyle('green')} />
            <Chip label={t('share.styleLight')} active={style === 'light'} onPress={() => setStyle('light')} />
            <Chip label={t('share.styleDark')} active={style === 'dark'} onPress={() => setStyle('dark')} />
          </View>
        </View>

        {params.arabic ? (
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: c.text }]}>{t('share.showTranslation')}</Text>
            <Switch value={showTranslation} onValueChange={setShowTranslation} trackColor={{ true: c.accent, false: c.borderStrong }} />
          </View>
        ) : null}

        <Button title={t('share.shareImage')} onPress={share} loading={sharing} icon={<Share2 size={16} color="#fff" />} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 40, gap: SPACING.lg },
  card: { padding: 28, gap: 16, minHeight: 360, justifyContent: 'center' },
  ornament: { fontSize: 18, textAlign: 'center', letterSpacing: 6 },
  arabic: { textAlign: 'center', writingDirection: 'rtl' },
  text: { fontFamily: FONT.medium, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  source: { fontSize: 12, fontFamily: FONT.semibold, flex: 1 },
  brand: { fontSize: 12, fontFamily: FONT.bold },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, fontFamily: FONT.medium },
});

export default ShareCardScreen;
