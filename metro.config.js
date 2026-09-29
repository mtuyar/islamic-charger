const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Offline Quran/hadith content (assets/content/**). Shipped as raw asset files and
// read at runtime instead of being inlined into the JS bundle.
config.resolver.assetExts.push('jsondata');

module.exports = withNativeWind(config, { input: './global.css' });
