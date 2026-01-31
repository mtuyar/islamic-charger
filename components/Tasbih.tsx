import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Vibration, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { RotateCcw, Check, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRESETS = [
    { id: 1, label: "Sübhanallah", target: 33 },
    { id: 2, label: "Elhamdülillah", target: 33 },
    { id: 3, label: "Allahuekber", target: 33 },
    { id: 4, label: "Lâ ilâhe illallah", target: 99 },
    { id: 5, label: "Salavat-ı Şerife", target: 100 },
    { id: 6, label: "Serbest Zikir", target: 9999 }
];

interface TasbihProps {
    darkMode?: boolean;
    onBack: () => void;
}

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width - 80, 320);

const Tasbih: React.FC<TasbihProps> = ({ darkMode = false, onBack }) => {
    const [count, setCount] = useState(0);
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
    const [showPresets, setShowPresets] = useState(false);

    const bgColor = darkMode ? '#020617' : '#fcfbf9';
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderColor = darkMode ? '#334155' : '#e7e5e4';
    const textPrimary = darkMode ? '#ffffff' : '#022c22';
    const textSecondary = darkMode ? '#94a3b8' : '#78716c';

    useEffect(() => {
        const loadCount = async () => {
            const saved = await AsyncStorage.getItem('tasbihCount');
            if (saved) setCount(parseInt(saved));
        };
        loadCount();
    }, []);

    useEffect(() => {
        AsyncStorage.setItem('tasbihCount', count.toString());
    }, [count]);

    const increment = () => {
        Vibration.vibrate(10);
        if (selectedPreset.id !== 6 && count + 1 === selectedPreset.target) {
            Vibration.vibrate([50, 50, 50]);
        }
        setCount(c => c + 1);
    };

    const reset = () => {
        setCount(0);
        Vibration.vibrate(50);
    };

    const changePreset = (preset: typeof PRESETS[0]) => {
        setSelectedPreset(preset);
        setCount(0);
        setShowPresets(false);
    };

    const progress = Math.min((count % selectedPreset.target) / selectedPreset.target * 100, 100);
    const isTargetReached = selectedPreset.id !== 6 && count >= selectedPreset.target;

    const radius = (CIRCLE_SIZE - 48) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Back Button Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={onBack}
                    style={[styles.backButton, { backgroundColor: cardBg, borderColor }]}
                >
                    <ChevronDown size={24} color={textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>Zikirmatik</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Preset Selector */}
            <View style={styles.presetContainer}>
                <TouchableOpacity
                    onPress={() => setShowPresets(!showPresets)}
                    style={[styles.presetButton, { backgroundColor: cardBg, borderColor }]}
                    activeOpacity={0.9}
                >
                    <View>
                        <Text style={[styles.presetLabel, { color: textSecondary }]}>SEÇİLİ ZİKİR</Text>
                        <Text style={[styles.presetValue, { color: textPrimary }]}>{selectedPreset.label}</Text>
                    </View>
                    <ChevronDown
                        size={20}
                        color={textSecondary}
                        style={{ transform: [{ rotate: showPresets ? '180deg' : '0deg' }] }}
                    />
                </TouchableOpacity>

                {showPresets && (
                    <View style={[styles.presetDropdown, { backgroundColor: cardBg, borderColor }]}>
                        <ScrollView nestedScrollEnabled style={styles.presetScroll}>
                            {PRESETS.map((p, index) => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => changePreset(p)}
                                    style={[
                                        styles.presetOption,
                                        { borderBottomColor: borderColor },
                                        index === PRESETS.length - 1 && styles.presetOptionLast
                                    ]}
                                >
                                    <Text style={[
                                        styles.presetOptionText,
                                        { color: selectedPreset.id === p.id ? '#059669' : textSecondary }
                                    ]}>
                                        {p.label}
                                    </Text>
                                    {selectedPreset.id === p.id && <Check size={16} color="#059669" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* Counter UI */}
            <View style={styles.counterContainer}>
                <View style={[styles.circleWrapper, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}>
                    {/* Background Glow */}
                    <View style={[
                        styles.glow,
                        {
                            width: CIRCLE_SIZE,
                            height: CIRCLE_SIZE,
                            backgroundColor: isTargetReached ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.05)',
                        }
                    ]} />

                    {/* Background Ring */}
                    <View style={[
                        styles.backgroundRing,
                        {
                            width: CIRCLE_SIZE,
                            height: CIRCLE_SIZE,
                            borderColor: darkMode ? '#1e293b' : '#f5f5f4'
                        }
                    ]} />

                    {/* Progress Ring */}
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.progressSvg}>
                        <Circle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={radius}
                            fill="none"
                            stroke={isTargetReached ? '#10b981' : 'rgba(16,185,129,0.8)'}
                            strokeWidth="24"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            rotation="-90"
                            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                        />
                    </Svg>

                    {/* Click Button */}
                    <TouchableOpacity
                        onPress={increment}
                        activeOpacity={0.9}
                        style={[styles.clickButton, { backgroundColor: cardBg, borderColor: darkMode ? '#334155' : '#fafaf9' }]}
                    >
                        <Text style={[styles.countText, { color: textPrimary }]}>{count}</Text>
                        <Text style={[styles.targetText, { color: textSecondary }]}>
                            HEDEF: {selectedPreset.target}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    onPress={reset}
                    style={[styles.resetButton, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4', borderColor }]}
                    activeOpacity={0.8}
                >
                    <RotateCcw size={20} color={textSecondary} />
                    <Text style={[styles.resetText, { color: textSecondary }]}>Sıfırla</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
    },
    presetContainer: {
        width: '100%',
        maxWidth: 320,
        paddingHorizontal: 24,
        marginBottom: 40,
        zIndex: 20,
    },
    presetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    presetLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    presetValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    presetDropdown: {
        position: 'absolute',
        top: '100%',
        left: 24,
        right: 24,
        marginTop: 8,
        borderRadius: 16,
        borderWidth: 1,
        maxHeight: 256,
        overflow: 'hidden',
        zIndex: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    presetScroll: {
        maxHeight: 256,
    },
    presetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    presetOptionLast: {
        borderBottomWidth: 0,
    },
    presetOptionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    counterContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        borderRadius: 1000,
    },
    backgroundRing: {
        position: 'absolute',
        borderRadius: 1000,
        borderWidth: 24,
    },
    progressSvg: {
        position: 'absolute',
    },
    clickButton: {
        width: 192,
        height: 192,
        borderRadius: 96,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
        elevation: 10,
    },
    countText: {
        fontSize: 64,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    targetText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        marginTop: 8,
    },
    controls: {
        paddingBottom: 48,
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    resetText: {
        fontSize: 14,
        fontWeight: '700',
    },
});

export default Tasbih;