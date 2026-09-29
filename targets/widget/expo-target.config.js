/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'RuhnevazWidget',
  displayName: 'Ruhnevâz',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $widgetBackground: { light: '#fcfbf9', dark: '#0b1220' },
    $accent: '#0f8a5f',
    brandGreen: { light: '#0f8a5f', dark: '#0f8a5f' },
    brandGreenDeep: { light: '#065f46', dark: '#064e3b' },
    ink: { light: '#1c1917', dark: '#f8fafc' },
    inkSoft: { light: '#78716c', dark: '#94a3b8' },
    cream: { light: '#fcfbf9', dark: '#fcfbf9' },
    mint: { light: '#34d399', dark: '#34d399' },
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? ['group.com.mtuyarr.ruhnevaz'],
  },
});
