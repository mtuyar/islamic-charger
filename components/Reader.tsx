import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { DualSurahResponse } from '../types';
import { ArrowLeft, Settings2, X, Copy } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

interface ReaderProps {
   data: DualSurahResponse;
   onBack: () => void;
   darkMode?: boolean;
}

const Reader: React.FC<ReaderProps> = ({ data, onBack, darkMode = false }) => {
   const [mode, setMode] = useState<'meal' | 'mushaf'>('meal');
   const [fontSize, setFontSize] = useState(1);
   const [showSettings, setShowSettings] = useState(false);
   const [showToast, setShowToast] = useState(false);
   const [fontFamily, setFontFamily] = useState<'ScheherazadeNew_400Regular' | 'NotoNaskhArabic_400Regular' | 'Amiri_400Regular'>('ScheherazadeNew_400Regular');
   const scrollRef = useRef<ScrollView>(null);

   const bgColor = darkMode ? '#020617' : '#fcfbf9';
   const cardBg = darkMode ? '#1e293b' : '#ffffff';
   const borderColor = darkMode ? '#334155' : '#f5f5f4';
   const textPrimary = darkMode ? '#ffffff' : '#1c1917';
   const textSecondary = darkMode ? '#94a3b8' : '#57534e';
   const headerBg = darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)';

   useEffect(() => {
      if (scrollRef.current) {
         scrollRef.current.scrollTo({ y: 0, animated: false });
      }
   }, [data]);

   const getAyahText = (text: string, numberInSurah: number, surahNumber: number) => {
      if (numberInSurah === 1 && surahNumber !== 1 && surahNumber !== 9) {
         return text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ', '');
      }
      return text;
   };

   const handleCopy = async (arabic: string, turkish: string, surahName: string, ayahNumber: number) => {
      const textToCopy = `${arabic}\n\n${turkish}\n\n${surahName} Suresi, ${ayahNumber}. Ayet`;
      await Clipboard.setStringAsync(textToCopy);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
   };

   return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
         {/* Settings Modal */}
         <Modal
            animationType="slide"
            transparent={true}
            visible={showSettings}
            onRequestClose={() => setShowSettings(false)}
         >
            <View style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setShowSettings(false)}
               />
               <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                  <View style={styles.modalHeader}>
                     <Text style={[styles.modalTitle, { color: textPrimary }]}>Okuma Ayarları</Text>
                     <TouchableOpacity onPress={() => setShowSettings(false)}>
                        <X size={24} color={textSecondary} />
                     </TouchableOpacity>
                  </View>

                  <View style={styles.settingsSection}>
                     <Text style={[styles.settingsLabel, { color: textSecondary }]}>Görünüm Modu</Text>
                     <View style={[styles.modeToggle, { backgroundColor: darkMode ? '#0f172a' : '#f5f5f4' }]}>
                        <TouchableOpacity
                           onPress={() => setMode('meal')}
                           style={[
                              styles.modeButton,
                              mode === 'meal' && [styles.modeButtonActive, { backgroundColor: cardBg }]
                           ]}
                        >
                           <Text style={[
                              styles.modeButtonText,
                              { color: mode === 'meal' ? '#047857' : textSecondary }
                           ]}>Meal & Arapça</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                           onPress={() => setMode('mushaf')}
                           style={[
                              styles.modeButton,
                              mode === 'mushaf' && [styles.modeButtonActive, { backgroundColor: cardBg }]
                           ]}
                        >
                           <Text style={[
                              styles.modeButtonText,
                              { color: mode === 'mushaf' ? '#047857' : textSecondary }
                           ]}>Hafız Modu</Text>
                        </TouchableOpacity>
                     </View>
                  </View>

                  <View style={styles.settingsSection}>
                     <Text style={[styles.settingsLabel, { color: textSecondary }]}>Yazı Tipi</Text>
                     <View style={styles.fontOptions}>
                        <TouchableOpacity
                           onPress={() => setFontFamily('ScheherazadeNew_400Regular')}
                           style={[
                              styles.fontButton,
                              fontFamily === 'ScheherazadeNew_400Regular' && [styles.fontButtonActive, { backgroundColor: darkMode ? '#0f172a' : '#f5f5f4' }]
                           ]}
                        >
                           <Text style={[styles.fontPreview, { fontFamily: 'ScheherazadeNew_400Regular', color: textPrimary }]}>بسم الله</Text>
                           <Text style={[styles.fontName, { color: textSecondary }]}>Klasik</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                           onPress={() => setFontFamily('NotoNaskhArabic_400Regular')}
                           style={[
                              styles.fontButton,
                              fontFamily === 'NotoNaskhArabic_400Regular' && [styles.fontButtonActive, { backgroundColor: darkMode ? '#0f172a' : '#f5f5f4' }]
                           ]}
                        >
                           <Text style={[styles.fontPreview, { fontFamily: 'NotoNaskhArabic_400Regular', color: textPrimary }]}>بسم الله</Text>
                           <Text style={[styles.fontName, { color: textSecondary }]}>Modern</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                           onPress={() => setFontFamily('Amiri_400Regular')}
                           style={[
                              styles.fontButton,
                              fontFamily === 'Amiri_400Regular' && [styles.fontButtonActive, { backgroundColor: darkMode ? '#0f172a' : '#f5f5f4' }]
                           ]}
                        >
                           <Text style={[styles.fontPreview, { fontFamily: 'Amiri_400Regular', color: textPrimary }]}>بسم الله</Text>
                           <Text style={[styles.fontName, { color: textSecondary }]}>Hat</Text>
                        </TouchableOpacity>
                     </View>
                  </View>

                  <View style={styles.settingsSection}>
                     <Text style={[styles.settingsLabel, { color: textSecondary }]}>Yazı Boyutu</Text>
                     <Slider
                        style={styles.slider}
                        minimumValue={0.8}
                        maximumValue={1.5}
                        step={0.1}
                        value={fontSize}
                        onValueChange={setFontSize}
                        minimumTrackTintColor="#059669"
                        maximumTrackTintColor={darkMode ? '#334155' : '#d6d3d1'}
                        thumbTintColor="#059669"
                     />
                  </View>
               </View>
            </View>
         </Modal>

         {/* Header */}
         <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
            <TouchableOpacity
               onPress={onBack}
               style={[styles.headerButton, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]}
            >
               <ArrowLeft size={24} color={textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
               <Text style={[styles.headerTitle, { color: darkMode ? '#34d399' : '#065f46' }]}>
                  {data.arabic.englishName}
               </Text>
               <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
                  {data.arabic.revelationType === 'Meccan' ? 'MEKKE' : 'MEDİNE'} • {data.arabic.numberOfAyahs} AYET
               </Text>
            </View>
            <TouchableOpacity
               onPress={() => setShowSettings(true)}
               style={[styles.headerButton, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]}
            >
               <Settings2 size={24} color={textSecondary} />
            </TouchableOpacity>
         </View>

         {/* Content */}
         <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
         >
            {/* Basmalah Header */}
            <View style={styles.basmalahContainer}>
               <View style={[styles.basmalahLine, { backgroundColor: darkMode ? '#065f46' : '#a7f3d0' }]} />
               <View style={[styles.basmalahTextContainer, { backgroundColor: bgColor }]}>
                  <Text style={[styles.basmalahText, { color: darkMode ? '#34d399' : '#065f46' }]}>
                     بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </Text>
               </View>
            </View>

            {mode === 'mushaf' ? (
               /* MUSHAF (HAFIZ) MODE */
               <View style={[styles.mushafContainer, { backgroundColor: darkMode ? '#0f172a' : '#faf7f2', borderColor }]}>
                  <Text
                     style={[
                        styles.mushafText,
                        {
                           fontFamily: fontFamily,
                           fontSize: 26 * fontSize,
                           lineHeight: 48 * fontSize,
                           color: darkMode ? '#e2e8f0' : '#022c22'
                        }
                     ]}
                  >
                     {data.arabic.ayahs.map((ayah) => (
                        <Text key={ayah.number}>
                           {getAyahText(ayah.text, ayah.numberInSurah, data.arabic.number)}
                           <Text style={[styles.ayahMarker, { color: darkMode ? '#34d399' : '#059669' }]}>
                              {' ۝'}{ayah.numberInSurah.toLocaleString('ar-EG')}{' '}
                           </Text>
                        </Text>
                     ))}
                  </Text>
               </View>
            ) : (
               /* LIST (MEAL) MODE */
               <View style={styles.mealContainer}>
                  {data.arabic.ayahs.map((ayah, index) => {
                     const turkishAyah = data.turkish.ayahs[index];
                     return (
                        <View
                           key={ayah.number}
                           style={[styles.ayahCard, { backgroundColor: cardBg, borderColor }]}
                        >
                           {/* Ayah Number & Actions */}
                           <View style={[styles.ayahHeader, { borderBottomColor: borderColor }]}>
                              <View style={[styles.ayahNumberBadge, { backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#ecfdf5' }]}>
                                 <Text style={styles.ayahNumberText}>{ayah.numberInSurah}</Text>
                              </View>
                              <TouchableOpacity
                                 onPress={() => handleCopy(ayah.text, turkishAyah.text, data.arabic.englishName, ayah.numberInSurah)}
                                 style={styles.actionButton}
                              >
                                 <Copy size={18} color={textSecondary} />
                              </TouchableOpacity>
                           </View>

                           {/* Arabic */}
                           <Text
                              style={[
                                 styles.arabicText,
                                 {
                                    fontFamily: fontFamily,
                                    fontSize: 24 * fontSize,
                                    lineHeight: 44 * fontSize,
                                    color: darkMode ? '#e2e8f0' : '#022c22'
                                 }
                              ]}
                           >
                              {getAyahText(ayah.text, ayah.numberInSurah, data.arabic.number)}
                           </Text>

                           {/* Turkish */}
                           <View style={[styles.turkishContainer, { borderTopColor: borderColor }]}>
                              <Text
                                 style={[
                                    styles.turkishText,
                                    {
                                       fontSize: 16 * fontSize,
                                       lineHeight: 26 * fontSize,
                                       color: textSecondary
                                    }
                                 ]}
                              >
                                 {turkishAyah.text}
                              </Text>
                           </View>
                        </View>
                     );
                  })}
               </View>
            )}
         </ScrollView>

         {/* Toast Notification */}
         {showToast && (
            <View style={[styles.toast, { backgroundColor: darkMode ? '#334155' : '#1c1917' }]}>
               <Text style={styles.toastText}>Ayet kopyalandı</Text>
            </View>
         )}
      </SafeAreaView>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
   },
   header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
   },
   headerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
   },
   headerCenter: {
      alignItems: 'center',
   },
   headerTitle: {
      fontSize: 18,
      fontWeight: '700',
   },
   headerSubtitle: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2,
      marginTop: 4,
   },
   scrollView: {
      flex: 1,
   },
   scrollContent: {
      padding: 16,
      paddingBottom: 40,
   },
   basmalahContainer: {
      alignItems: 'center',
      marginBottom: 32,
      position: 'relative',
   },
   basmalahLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
   },
   basmalahTextContainer: {
      paddingHorizontal: 16,
   },
   basmalahText: {
      fontSize: 24,
      fontFamily: 'NotoNaskhArabic_400Regular',
      textAlign: 'center',
   },
   mushafContainer: {
      borderRadius: 16,
      padding: 24,
      borderWidth: 2,
   },
   mushafText: {
      textAlign: 'justify',
      writingDirection: 'rtl',
   },
   // ...
   arabicText: {
      textAlign: 'right',
      padding: 20,
      writingDirection: 'rtl',
   },
   turkishContainer: {
      padding: 20,
      borderTopWidth: 1,
   },
   turkishText: {
      fontWeight: '500',
   },
   modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
   },
   modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
   },
   modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
   },
   modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
   },
   modalTitle: {
      fontSize: 18,
      fontWeight: '700',
   },
   settingsSection: {
      marginBottom: 24,
   },
   settingsLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 12,
   },
   modeToggle: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 12,
   },
   modeButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
   },
   modeButtonActive: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
   },
   modeButtonText: {
      fontSize: 14,
      fontWeight: '500',
   },
   slider: {
      width: '100%',
      height: 40,
   },
   toast: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
   },
   toastText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
   },
   fontOptions: {
      flexDirection: 'row',
      gap: 12,
   },
   fontButton: {
      flex: 1,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
   },
   fontButtonActive: {
      borderColor: '#059669',
   },
   fontPreview: {
      fontSize: 20,
      marginBottom: 4,
   },
   fontName: {
      fontSize: 12,
      fontWeight: '500',
   },
});

export default Reader;