// Native tweaks needed to build Ruhnevâz with Xcode 27 / the iOS 27 SDK.
//
// 1. UIScene lifecycle. Apps linked against the iOS 27 SDK that still create their
//    window in application(_:didFinishLaunchingWithOptions:) assert on launch on
//    iOS / iPadOS 27 (App Review rejected 1.0.0 (3) for exactly this crash).
//    Expo SDK 54's AppDelegate template has no scene support, so we add a
//    SceneDelegate that creates the window and starts React Native, and forward
//    URLs + lifecycle events to the Expo AppDelegate.
// 2. Xcode 27 rejects pod deployment targets below iOS 15.1.
const { withAppDelegate, withInfoPlist, withPodfile } = require('expo/config-plugins');

const MARKER = '// [withIos27] UIScene lifecycle';

const SCENE_DELEGATE = `
${MARKER} — required for apps built with the iOS 27 SDK.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene, let appDelegate = appDelegate else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    _ = appDelegate?.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity) { _ in }
  }

  // With scenes UIKit no longer calls these on the app delegate; Expo modules listen there.
  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }
}
`;

const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif/;

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    if (cfg.modResults.language !== 'swift' || !WINDOW_BLOCK.test(src)) {
      throw new Error('[withIos27] AppDelegate.swift does not match the Expo SDK 54 template; update the plugin.');
    }
    src = src.replace(
      'var reactNativeFactory: RCTReactNativeFactory?',
      'var reactNativeFactory: RCTReactNativeFactory?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?',
    );
    src = src.replace(
      WINDOW_BLOCK,
      '    // The window is created by SceneDelegate (UIScene lifecycle).\n    self.launchOptions = launchOptions',
    );
    cfg.modResults.contents = src + SCENE_DELEGATE;
    return cfg;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

const POD_TARGET_FIX = `
    # [withIos27] Xcode 27 rejects pod deployment targets below 15.1.
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |bc|
        if bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end`;

function withPodDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('[withIos27]')) return cfg;
    const anchor = /(\n\s*react_native_post_install\([\s\S]*?\n\s*\))/;
    if (!anchor.test(src)) throw new Error('[withIos27] Podfile post_install anchor not found.');
    cfg.modResults.contents = src.replace(anchor, `$1${POD_TARGET_FIX}`);
    return cfg;
  });
}

module.exports = (config) => withPodDeploymentTarget(withSceneManifest(withSceneAppDelegate(config)));
