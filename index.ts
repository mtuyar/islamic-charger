import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Android home-screen widgets render through a headless task (react-native-android-widget).
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widgets/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Native module missing (Expo Go) — widgets simply stay inactive.
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
