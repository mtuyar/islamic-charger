import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Pressable,
  ViewStyle, TextStyle, StyleProp, Switch, Platform,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { ArrowLeft, WifiOff, AlertCircle, Inbox, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT, RADIUS, SPACING } from '../../theme';
import { useSettingsStore } from '../../store/useSettingsStore';
import { t } from '../../i18n';

// ---- Haptics ----

export const haptic = (kind: 'light' | 'medium' | 'heavy' | 'success' | 'selection' = 'light') => {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  try {
    if (kind === 'selection') Haptics.selectionAsync();
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(
      kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy
        : kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch { /* ignore */ }
};

// ---- Screen ----

interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

export const Screen: React.FC<ScreenProps> = ({ children, edges = ['top', 'left', 'right'], style }) => {
  const c = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: c.bg }, style]}>
      {children}
    </SafeAreaView>
  );
};

// ---- Header ----

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack, right, large }) => {
  const c = useTheme();
  return (
    <View style={[styles.header, large && { paddingBottom: SPACING.sm }]}>
      {onBack ? (
        <IconButton onPress={onBack} label={t('a11y.back')}>
          <ArrowLeft size={22} color={c.text} />
        </IconButton>
      ) : null}
      <View style={{ flex: 1, marginLeft: onBack ? SPACING.sm : 0 }}>
        {title ? (
          <Text style={[large ? styles.headerTitleLarge : styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? <Text style={[styles.headerSubtitle, { color: c.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
};

// ---- Buttons ----

interface IconButtonProps {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: number;
  filled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ onPress, label, children, style, size = 42, filled }) => {
  const c = useTheme();
  return (
    <TouchableOpacity
      onPress={() => { haptic('selection'); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      activeOpacity={0.7}
      style={[
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: filled ? c.cardAlt : 'transparent', borderColor: c.border },
        filled && { borderWidth: 1 },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
};

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  hapticKind?: 'light' | 'medium' | 'selection' | 'none';
}

/** Card-like pressable with a subtle scale-down animation. */
export const PressableScale: React.FC<PressableScaleProps> = ({
  onPress, onLongPress, children, style, disabled, accessibilityLabel, hapticKind = 'light',
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable
      onPress={() => { if (hapticKind !== 'none') haptic(hapticKind); onPress?.(); }}
      onLongPress={onLongPress}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', icon, style, disabled, loading, small }) => {
  const c = useTheme();
  const bg = variant === 'primary' ? c.accent : variant === 'danger' ? c.danger : variant === 'secondary' ? c.cardAlt : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#ffffff' : variant === 'secondary' ? c.text : c.accent;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={title}
      hapticKind="medium"
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1, borderColor: c.border },
        variant === 'ghost' && { borderWidth: 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
};

// ---- Layout pieces ----

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accent?: boolean;
  padded?: boolean;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, accent, padded = true, accessibilityLabel }) => {
  const c = useTheme();
  const base: ViewStyle = {
    backgroundColor: accent ? c.accentSoft : c.card,
    borderColor: accent ? 'transparent' : c.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: padded ? SPACING.lg : 0,
    overflow: 'hidden',
  };
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[base, style]} accessibilityLabel={accessibilityLabel}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[base, style]}>{children}</View>;
};

interface SectionTitleProps {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, action, onAction, style }) => {
  const c = useTheme();
  return (
    <View style={[styles.sectionTitle, style]}>
      <Text style={[styles.sectionTitleText, { color: c.textSecondary }]}>{title.toUpperCase()}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.sectionAction, { color: c.accent }]}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Chip: React.FC<ChipProps> = ({ label, active, onPress, icon, style }) => {
  const c = useTheme();
  return (
    <TouchableOpacity
      onPress={() => { haptic('selection'); onPress?.(); }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.chip,
        { backgroundColor: active ? c.accent : c.cardAlt, borderColor: active ? c.accent : c.border },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.chipText, { color: active ? '#fff' : c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
};

interface RowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  last?: boolean;
}

/** Settings-style row. */
export const Row: React.FC<RowProps> = ({ title, subtitle, icon, onPress, right, chevron, destructive, last }) => {
  const c = useTheme();
  const content = (
    <View style={[styles.row, { borderBottomColor: c.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      {icon ? <View style={[styles.rowIcon, { backgroundColor: c.cardAlt }]}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: destructive ? c.danger : c.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: c.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <ChevronRight size={18} color={c.textMuted} /> : null}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={() => { haptic('selection'); onPress(); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={title}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon?: React.ReactNode;
  last?: boolean;
}

export const SwitchRow: React.FC<SwitchRowProps> = ({ title, subtitle, value, onValueChange, icon, last }) => {
  const c = useTheme();
  return (
    <Row
      title={title}
      subtitle={subtitle}
      icon={icon}
      last={last}
      right={
        <Switch
          value={value}
          onValueChange={(v) => { haptic('selection'); onValueChange(v); }}
          trackColor={{ true: c.accent, false: c.borderStrong }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          accessibilityLabel={title}
        />
      }
    />
  );
};

// ---- State views ----

interface StateViewProps {
  kind: 'loading' | 'error' | 'empty' | 'offline';
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const StateView: React.FC<StateViewProps> = ({ kind, title, message, onRetry, compact }) => {
  const c = useTheme();
  const Icon = kind === 'offline' ? WifiOff : kind === 'error' ? AlertCircle : Inbox;
  const defaultTitle = kind === 'offline' ? t('common.offline') : kind === 'error' ? t('common.error') : t('common.nothingHere');
  return (
    <View style={[styles.state, compact && { paddingVertical: SPACING.lg }]}>
      {kind === 'loading' ? (
        <ActivityIndicator size="large" color={c.accent} />
      ) : (
        <>
          <View style={[styles.stateIcon, { backgroundColor: c.cardAlt }]}>
            <Icon size={26} color={c.textSecondary} />
          </View>
          <Text style={[styles.stateTitle, { color: c.text }]}>{title ?? defaultTitle}</Text>
          {message ? <Text style={[styles.stateMessage, { color: c.textSecondary }]}>{message}</Text> : null}
          {onRetry ? <Button title={t('common.retry')} onPress={onRetry} variant="secondary" small style={{ marginTop: SPACING.md }} /> : null}
        </>
      )}
    </View>
  );
};

/** Simple skeleton block. */
export const Skeleton: React.FC<{ width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({ width = '100%', height = 16, radius = 8, style }) => {
  const c = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  React.useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: c.cardAlt, opacity }, style]} />;
};

export const Divider: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const c = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />;
};

export const Label: React.FC<{ children: React.ReactNode; style?: StyleProp<TextStyle>; color?: string }> = ({ children, style, color }) => {
  const c = useTheme();
  return <Text style={[styles.label, { color: color ?? c.textSecondary }, style]}>{children}</Text>;
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  headerTitle: { fontSize: 17, fontFamily: FONT.bold },
  headerTitleLarge: { fontSize: 26, fontFamily: FONT.bold, letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 12, fontFamily: FONT.medium, marginTop: 2 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: RADIUS.sm },
  buttonText: { fontSize: 15, fontFamily: FONT.semibold },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  sectionTitleText: { fontSize: 11, fontFamily: FONT.semibold, letterSpacing: 1.4 },
  sectionAction: { fontSize: 13, fontFamily: FONT.semibold },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: FONT.semibold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontFamily: FONT.medium },
  rowSubtitle: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stateTitle: { fontSize: 16, fontFamily: FONT.semibold, textAlign: 'center' },
  stateMessage: { fontSize: 13, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 12, fontFamily: FONT.medium },
});
