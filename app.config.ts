import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "KeyLingo",
  slug: "keylingo",
  version: "1.0.0",
  scheme: "keylingo",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: { supportsTablet: false, bundleIdentifier: "com.keylingo.app" },
  android: { package: "com.keylingo.app" },
  web: { bundler: "metro", output: "single", name: "KeyLingo" },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-localization",
    "expo-audio",
    "expo-notifications",
    "expo-asset",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
          "ca-app-pub-3940256099942544~3347511713",
        iosAppId:
          process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
          "ca-app-pub-3940256099942544~1458002511",
      },
    ],
  ],
  experiments: { typedRoutes: false },
};
export default config;
