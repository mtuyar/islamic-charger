// Expo CLI loads .env automatically; no dotenv import needed.

const APP_NAME = 'Ruhnevâz';
const BUNDLE_ID = 'com.mtuyarr.ruhnevaz';
const APP_GROUP = 'group.com.mtuyarr.ruhnevaz';
// Must describe every use (App Review 5.1.1): prayer times + qibla.
// English version lives in locales/en.json.
const LOCATION_PERMISSION =
  'Konumunuz, bulunduğunuz yere göre namaz vakitlerini ve kıble yönünü hesaplamak için kullanılır. Konum saklanmaz; dilerseniz şehrinizi elle de seçebilirsiniz.';

export default {
  expo: {
    name: APP_NAME,
    slug: 'ruhnevaz',
    owner: 'mtuyarr',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'ruhnevaz',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      // iPhone-only for 1.0: runs on iPad in compatibility mode, no iPad review/screenshots.
      supportsTablet: false,
      bundleIdentifier: BUNDLE_ID,
      buildNumber: '1',
      appleTeamId: '669M7S46LW',
      entitlements: {
        'com.apple.security.application-groups': [APP_GROUP],
      },
      infoPlist: {
        UIBackgroundModes: ['audio'],
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: LOCATION_PERMISSION,
      },
      // Required-reason APIs used by React Native, AsyncStorage and Expo modules.
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [],
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
          },
        ],
      },
    },
    // Localised Info.plist strings (permission prompts in TR / EN).
    locales: {
      tr: './locales/tr.json',
      en: './locales/en.json',
    },
    android: {
      package: BUNDLE_ID,
      versionCode: 1,
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0f8a5f',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 180,
          resizeMode: 'contain',
          backgroundColor: '#0f8a5f',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: LOCATION_PERMISSION,
          // Only "When In Use" is requested — keep the generic Always strings out.
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#0f8a5f',
          sounds: ['./assets/sounds/chime.wav'],
        },
      ],
      'expo-localization',
      // expo-sensors isn't used (qibla uses expo-location heading); drop its motion string.
      ['expo-sensors', { motionPermission: false }],
      [
        'expo-audio',
        {
          microphonePermission: false,
        },
      ],
      '@bacons/apple-targets',
      [
        'react-native-android-widget',
        {
          widgets: [
            {
              name: 'RuhnevazDaily',
              label: 'Ruhnevâz · Günün Nasibi',
              description: 'Her gün bir ayet, hadis veya hikmet.',
              minWidth: '180dp',
              minHeight: '110dp',
              targetCellWidth: 3,
              targetCellHeight: 2,
              resizeMode: 'horizontal|vertical',
              updatePeriodMillis: 1800000,
              previewImage: './assets/widget-preview-daily.png',
            },
            {
              name: 'RuhnevazPrayer',
              label: 'Ruhnevâz · Namaz Vakti',
              description: 'Sıradaki vakit ve bugünün vakitleri.',
              minWidth: '180dp',
              minHeight: '110dp',
              targetCellWidth: 3,
              targetCellHeight: 2,
              resizeMode: 'horizontal|vertical',
              updatePeriodMillis: 1800000,
              previewImage: './assets/widget-preview-prayer.png',
            },
          ],
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '9f0ec50f-8c81-4604-9ad7-e9288770d2aa',
      },
      // Optional: URL of the AI proxy (see proxy/README.md). When empty the AI
      // word-depth feature is hidden. Never put a raw Anthropic key here — it
      // would ship inside the app bundle.
      aiProxyUrl: process.env.AI_PROXY_URL ?? '',
    },
  },
};
