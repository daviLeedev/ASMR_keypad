# External services and native validation status

This document separates observed workstation limits, account status, and pending native validation. Native preparation and JavaScript exports ran; no successful installable Android/iOS build, Maestro device flow, real store purchase, or physical-device audio check is claimed.

## Workstation evidence — 2026-09-19, Windows

Read-only commands executed in the project PowerShell session produced these results:

| Check | Observed result |
| --- | --- |
| `node --version` | `v22.12.0` on the system PATH |
| `node_modules/node/bin/node.exe --version` | `v22.22.0` bundled by the project development dependency |
| `java -version` | Java `21.0.6`, 64-bit HotSpot; `C:\Program Files\Common Files\Oracle\Java\javapath\java.exe` |
| `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME` | All unset in this process environment |
| `Get-Command adb` | Not found on PATH |
| `Get-Command sdkmanager` | Not found on PATH |
| `Get-Command maestro` | Not found on PATH |
| `Get-Command eas` | Not found on PATH |
| `%LOCALAPPDATA%\Android\Sdk` | Does not exist (`C:\Users\PC\AppData\Local\Android\Sdk`) |
| `C:\Android\Sdk`, `C:\Android` | Do not exist |
| `C:\Program Files\Android\Android Studio` | Does not exist |

These checks show no usable Android SDK/ADB in the inspected environment. They do not prove that no SDK exists elsewhere on disk. No SDK installation or device enumeration was attempted. Java being present is insufficient for a local Android build. Use Node 22.22.0 for the documented CI/runtime toolchain; the older global Node should not be used for native/export validation.

## Native build and test blockers

- **Recorded preparation:** `expo prebuild --platform android --no-install` passed. This generated the Android project; it did not compile an APK.
- **Recorded bundle validation:** `expo export --platform android --platform ios` passed, producing Hermes JavaScript bundles. This is not a signed native binary, simulator installation, or native SDK runtime test.
- **Android local build/device tests:** `expo run:android --variant release --no-bundler` was attempted and failed because the default Android SDK path was missing and `adb` could not be spawned (`ENOENT`). Supply a compatible SDK, build tools, platform tools, configured environment, and an emulator or USB-debuggable device, then rerun the commands in [release checklist](RELEASE_CHECKLIST.md).
- **iOS local build:** this host is Windows. A macOS/Xcode environment is required for local iOS compilation and simulator runs. EAS cloud builds are an alternative once the Expo project and Apple signing are configured.
- **Maestro:** CLI and connected test device are unavailable in the inspected environment. The YAML flows are authored fixtures; they remain unexecuted until the prerequisites are supplied.
- **Expo/EAS accounts:** `npx eas-cli whoami` returned `Not logged in`. This host needs an authenticated Expo account before a cloud build. Project ownership/linking, quotas, and signing access still require verification after login.
- **Signing and distribution:** Apple team/profiles, Android keystore, App Store Connect, and Play Console access are unverified. Do not describe these as configured or build-ready credentials without an actual account/build check.
- **Physical-device audio/haptics and notifications:** browser export and unit tests cannot establish perceived latency, silent-switch behavior, real haptic feel, local notification delivery, or terminated-app notification navigation. Execute and record the manual checks on both target platforms.

## Monetization configuration and device validation

The repository now includes concrete native bridges using `react-native-google-mobile-ads` 17.0.0 and `react-native-purchases` 10.10.0. Production automatically selects them when the corresponding platform environment values exist; missing configuration returns unavailable results and never silently substitutes a mock. Web builds exclude these native SDKs.

AdMob event handling, UMP consent gating, timeouts/listener cleanup, store offering prices, purchase cancellation, active entitlement checks, and stable purchase/restore identities are implemented and covered by boundary tests. The Expo AdMob plugin uses configured application IDs and official test application IDs as the credential-free native-build fallback; real production ad requests still require configured real app and rewarded-unit IDs.

External setup and runtime validation remain. Follow [service integration instructions](../src/services/README.md) to:

1. Register app IDs and ad units, create the Starter Pack products/offerings, and obtain the correct public mobile SDK configuration.
2. Set the platform-specific public SDK environment values and rebuild a native development/preview binary; configure applicable UMP consent messages in AdMob.
3. Configure the Starter Pack as a non-consumable with its active RevenueCat entitlement and current offering. Confirm actual returned prices and receipt identities on devices.
4. Validate purchase, cancellation, restore, duplicate-grant protection, and reward caps using sandbox stores/test ad units on devices.

No real store price, receipt, ad-delivery result, purchase, or restore is asserted by the preview. The mock's free test price is deliberately marked `DEV`, and stable mock receipt IDs exist only to exercise the local economy ledger.

## Optional observability

The default analytics tracker makes no network calls. The app now initializes an opt-in PostHog HTTP transport and the Expo-compatible Sentry SDK when the corresponding public project configuration is supplied. Unit tests verify request filtering and failure isolation; no remote project credentials or delivery validation were available. Sentry explicitly reports sanitized JavaScript errors and safe breadcrumbs; native crash capture, replay, screenshots and arbitrary exception stacks remain disabled. See [observability configuration](OBSERVABILITY.md). Remote delivery must be verified against real projects before it is described as operational.

## Evidence to add when resolved

Attach native build IDs and artifacts, platform/toolchain versions, device OS/model, Maestro reports, screenshots, measured or observed audio latency, actual reminder delivery/tap results, and sandbox service traces without secrets or typed answers. Update this document when an observed blocker is resolved; do not convert an unexecuted checklist into a passed test result.
