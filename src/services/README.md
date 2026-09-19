# Device and external services

`getAdProvider()` and `getPurchaseProvider()` expose a visible `mode`. Development and explicit `EXPO_PUBLIC_PROVIDER_MODE=mock` builds use labeled simulations. The mock price is `DEV · FREE TEST`; it is never a store price. Production does not fall back to mocks. Native bridges are selected automatically from platform-specific environment configuration; missing configuration returns unavailable providers. Web bundles exclude the native SDKs through `nativeBridges.web.ts`.

The provider layer never changes balances. The central persistent economy ledger owns currency, daily limits, and duplicate-grant protection. Mock purchases use stable `dev:<productId>:v1` IDs; mock restore returns the purchased entitlement during that process. Real purchases and restores use the original available store transaction, with configured active entitlement plus original purchase date as the fallback identity. The economy's single Starter Pack entitlement guard remains authoritative even if the store representation changes on restore.

## Native SDK setup

The repository integrates `react-native-google-mobile-ads` 17.0.0 and `react-native-purchases` 10.10.0. Registry peer requirements permit the project's React Native version; a real native build and sandbox device test are still required to establish full platform compatibility. These SDKs require a custom native build, not Expo Go.

Configure a non-consumable Starter Pack product in App Store Connect and Google Play. Associate it with the configured RevenueCat entitlement and make it available in the current offering. The app has no login; do not configure the Starter Pack as a consumable and assume it will restore across reinstalls. RevenueCat documents the anonymous one-time consumable restore limitation with Billing Client 8+ in [Restoring Purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases).

Set the public client configuration in `.env` or the EAS environment:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_PROVIDER_MODE` | `production` to use native adapters; `mock` for an explicit simulation |
| `EXPO_PUBLIC_STARTER_PACK_PRODUCT_ID` | Store product ID; defaults to `starter_pack` |
| `EXPO_PUBLIC_STARTER_PACK_ENTITLEMENT_ID` | RevenueCat entitlement ID; defaults to `starter_pack` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | RevenueCat Android public mobile SDK key |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat iOS public mobile SDK key |
| `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` | Android AdMob application ID with `~` separator, also used by the Expo plugin |
| `EXPO_PUBLIC_ADMOB_IOS_APP_ID` | iOS AdMob application ID with `~` separator, also used by the Expo plugin |
| `EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID` | Android rewarded ad unit ID with `/` separator |
| `EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID` | iOS rewarded ad unit ID with `/` separator |

Never put secret RevenueCat REST keys, service-role keys, or signing credentials in `EXPO_PUBLIC_*`. Native build configuration must include AdMob application IDs when the SDK is linked: a JavaScript guard cannot prevent Android's native SDK startup checks. Credential-free native previews should use the official test app configuration or exclude the SDK at native build time. Rebuild after changing the AdMob Expo config plugin; see [SDK installation](https://docs.page/invertase/react-native-google-mobile-ads).

## Actual native behavior

`nativeBridges.ts` lazily imports SDKs, so simply creating providers does not initialize either SDK. A production ad availability/show request gathers UMP consent before initialization and asks for non-personalized ads. Configure the applicable consent messages in AdMob. A blocked/failed consent flow produces no ad. Loading never shows the ad; only `showRewardedAd()` calls the SDK's `show()`.

The ad bridge subscribes to loaded, earned-reward, closed, and error events. Closing without an earned event returns `closed`. Only an earned event can produce `rewarded`. It releases listeners on completion, rejects concurrent shows, reloads expired cached ads, times out failed loading, and releases a stalled presentation. Rewards still pass through the economy's daily cap and grant ledger. See the SDK's [rewarded-ad event documentation](https://docs.page/invertase/react-native-google-mobile-ads/displaying-ads).

The purchase bridge initializes RevenueCat only when loading offerings, purchasing, or restoring. It uses `getOfferings().current.availablePackages`, the SDK's localized `priceString`, and the configured product allowlist. Only the explicit purchase method invokes `purchasePackage`; only explicit restore invokes `restorePurchases`. User cancellation is preserved. Missing or revoked configured entitlements grant nothing. See RevenueCat's [purchase flow](https://www.revenuecat.com/docs/getting-started/making-purchases).

`configureServiceBridges()` remains available for deliberate adapter injection. Normal production startup needs no custom bridge implementation. Current native SDK code is unit-tested at the external boundary, but real AdMob delivery, UMP configuration, store products, RevenueCat entitlement setup, device sandbox purchases/restores, signing, and native builds remain external release validation gates. Do not equate SDK integration code with a successful payment or ad-delivery test.

## Reminders and telemetry

`scheduleReminder(hour, minute)` is the only notification permission entry point. It accepts local 24-hour time and returns false for invalid values, denial, or unsupported devices. A stable notification identifier replaces the existing reminder. `cancelReminder()` removes only the KeyLingo daily reminder. `subscribeReminderOpen()` handles warm and cold notification opens and invokes the app callback for today's practice.

Telemetry has no network adapter by default. `configureAnalytics(postHogAdapter(client))` or `configureAnalytics(sentryAdapter(client))` accepts an initialized, consented client. Disable session replay/autocapture and automatic text/PII capture in that client's configuration. Events/properties are filtered by allowlists; raw answers and arbitrary free text are discarded. SDK/network errors do not interrupt gameplay. Actual remote crash capture requires an initialized Sentry SDK; breadcrumbs alone do not establish crash reporting.
