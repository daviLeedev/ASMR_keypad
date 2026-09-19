import type { AdMobBridge, RevenueCatBridge } from "./providers";
import type { NativeConfig } from "./nativeBridges";

/** Native stores and mobile ad SDKs are deliberately excluded from the web bundle. */
export function createNativeBridges(_config: NativeConfig): {
  ads?: AdMobBridge;
  purchases?: RevenueCatBridge;
} {
  return {};
}
