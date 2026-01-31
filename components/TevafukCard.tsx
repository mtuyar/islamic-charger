import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { TevafukContent } from '../types';
import { Share2, RefreshCw, Quote } from 'lucide-react-native';

interface TevafukCardProps {
  content: TevafukContent | null;
  loading: boolean;
  onRefresh: () => void;
  darkMode?: boolean;
}

const TevafukCard: React.FC<TevafukCardProps> = ({ content, loading, onRefresh, darkMode = false }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const bgColor = darkMode ? '#1e293b' : '#ffffff';
  const borderColor = darkMode ? '#334155' : '#f5f5f4';
  const textPrimary = darkMode ? '#e2e8f0' : '#1c1917';
  const textSecondary = darkMode ? '#94a3b8' : '#57534e';
  const actionBg = darkMode ? '#0f172a' : '#fafaf9';

  useEffect(() => {
    if (loading) {
      Animated.timing(fadeAnim, { toValue: 0.6, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [loading]);

  const handleShare = async () => {
    if (!content) return;
    try {
      await Share.share({
        message: `"${content.content.turkish}"\n\n- ${content.content.source}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, borderColor, opacity: fadeAnim }]}>
      {/* Content Container */}
      <View style={styles.content}>
        <View style={[styles.quoteIcon, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
          <Quote size={20} color="#047857" />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={[styles.loadingText, { color: textSecondary }]}>Nasip Geliyor...</Text>
          </View>
        ) : content ? (
          <View style={styles.textContent}>
            {content.content.arabic && (
              <Text style={[styles.arabicText, { color: darkMode ? '#e2e8f0' : '#022c22' }]}>
                {content.content.arabic}
              </Text>
            )}

            <Text style={[styles.turkishText, { color: textSecondary }]}>
              "{content.content.turkish}"
            </Text>

            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <Text style={styles.sourceText}>{content.content.source}</Text>
          </View>
        ) : (
          <Text style={[styles.errorText, { color: textSecondary }]}>Bir hata oluştu.</Text>
        )}
      </View>

      {/* Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: actionBg, borderTopColor: borderColor }]}>
        <TouchableOpacity
          onPress={onRefresh}
          disabled={loading}
          style={[styles.actionButton, { backgroundColor: bgColor, borderColor }]}
          activeOpacity={0.8}
        >
          <RefreshCw size={14} color={textSecondary} />
          <Text style={[styles.actionButtonText, { color: textSecondary }]}>Nasibi Değiştir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareButton}
          activeOpacity={0.8}
        >
          <Share2 size={14} color="#ffffff" />
          <Text style={styles.shareButtonText}>Paylaş</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  content: {
    padding: 32,
    alignItems: 'center',
  },
  quoteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingLine: {
    height: 16,
    borderRadius: 8,
  },
  loadingFull: {
    width: '100%',
  },
  loading80: {
    width: '80%',
  },
  loading60: {
    width: '60%',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  textContent: {
    width: '100%',
    alignItems: 'center',
  },
  arabicText: {
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 24,
    fontFamily: 'ScheherazadeNew_400Regular',
  },
  turkishText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
    marginBottom: 24,
  },
  divider: {
    width: '100%',
    height: 1,
    marginBottom: 16,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  errorText: {
    paddingVertical: 32,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#065f46',
  },
  shareButtonText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#ffffff',
  },
});

export default TevafukCard;