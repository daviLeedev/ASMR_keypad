import {
  createProviders,
  type AdMobBridge,
  type RevenueCatBridge,
} from "./providers";
import { Platform } from "react-native";
import { createNativeBridges } from "./nativeBridges";
export * from "./providers";
export {
  scheduleReminder,
  cancelReminder,
  subscribeReminderOpen,
} from "./reminders";

let providers: ReturnType<typeof createProviders> | undefined;
let bridges: { ads?: AdMobBridge; purchases?: RevenueCatBridge } | undefined;

/** Install native SDK adapters before first use. No SDK or missing config => unavailable. */
export function configureServiceBridges(value: typeof bridges): void {
  bridges = value;
  providers = undefined;
}
function getProviders() {
  if (providers) return providers;
  const development = typeof __DEV__ !== "undefined" && __DEV__;
  const mode = process.env.EXPO_PUBLIC_PROVIDER_MODE;
  const mock = mode === "mock" || (mode !== "production" && development);
  const configured =
    bridges ??
    (mock
      ? {}
      : createNativeBridges({
          platform: Platform.OS,
          adAppId:
            Platform.OS === "ios"
              ? process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID
              : process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
          rewardedUnitId:
            Platform.OS === "ios"
              ? process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID
              : process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID,
          purchasesApiKey:
            Platform.OS === "ios"
              ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
              : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
          productId:
            process.env.EXPO_PUBLIC_STARTER_PACK_PRODUCT_ID || "starter_pack",
          entitlementId:
            process.env.EXPO_PUBLIC_STARTER_PACK_ENTITLEMENT_ID ||
            "starter_pack",
        }));
  providers ??= createProviders({
    development,
    mode,
    productId:
      process.env.EXPO_PUBLIC_STARTER_PACK_PRODUCT_ID || "starter_pack",
    ...configured,
  });
  return providers;
}
export function getAdProvider() {
  return getProviders().ads;
}
export function getPurchaseProvider() {
  return getProviders().purchases;
}
