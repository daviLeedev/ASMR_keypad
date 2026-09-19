# Optional observability

`src/analytics/bootstrap.ts` exposes `initializeObservability()` and `captureAppError(error)`. Call initialization once at the application entry point and the error function from a React error boundary. The initializer is idempotent and isolates provider failures from app startup. `@sentry/react-native` supports Expo native and web, so a separate web bootstrap is unnecessary.

## Configuration

Leave these unset for offline/default builds. No telemetry SDK initializes and no event requests are made without the explicit enabled flag and the corresponding provider credential.

```dotenv
EXPO_PUBLIC_OBSERVABILITY_ENABLED=false
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_SENTRY_DSN=
```

Use the PostHog **public project token**, never its personal/secret API key. Select the correct ingestion region (`us.i.posthog.com` or `eu.i.posthog.com`) or an HTTPS self-hosted endpoint. Sentry DSNs are client configuration; upload/auth tokens must remain build-server secrets. Public environment configuration is included in client bundles. Enable collection only for a deployment whose telemetry disclosure/consent requirements have been handled.

Expo SDK 57 lists `@sentry/react-native ~7.11.0` in its bundled module compatibility data. Install through `npx expo install @sentry/react-native`; this bootstrap does not require the PostHog SDK.

## Data boundary

- PostHog uses the documented `/i/v0/e/` capture endpoint. Each process generates an ephemeral random identifier. There is no account identifier, cross-launch identifier, device identifier, cookie identity, or person-profile creation.
- The existing tracker allowlists event names and scalar properties, rejects free text and non-finite numbers, and discards unknown fields. The transport repeats this filtering even if its adapter is called directly. Raw answers, key values, names, email addresses, and arbitrary error messages are not forwarded.
- PostHog receives `$process_person_profile: false`, `$geoip_disable: true`, and `$ip: null`. HTTP infrastructure still receives the connection's network metadata; project/server retention settings must also be configured appropriately.
- Requests omit browser credentials, time out after five seconds, and permit at most four in flight. Errors are swallowed, with no retries or persistent offline queue.
- Sentry receives the fixed message `KeyLingo application error`. The input exception is never inspected or forwarded. `beforeSend` reconstructs an event containing only that message, fixed severity/platform, a validated event ID, a numeric timestamp, and at most twenty filtered KeyLingo breadcrumbs.
- User data, request context, arbitrary extras/tags, exception values/stacks, device context, console breadcrumbs, screenshots, view hierarchy, tracing, replay, automatic sessions, and default integrations are excluded.

`enableNative: false` is deliberate: native-side crash attachments and native events cannot be fully sanitized by a JavaScript `beforeSend` hook. This version reports explicitly captured JavaScript errors only. It provides error counts and safe workflow breadcrumbs rather than stack-level diagnostics. Native crash collection or detailed stack traces require a separate reviewed sanitization policy before being enabled.

## Verification and release checks

`tests/analytics-bootstrap.test.ts` injects fake network/SDK drivers and verifies disabled defaults, exact sanitized PostHog payloads, Sentry options and final event scrubbing, invalid endpoint handling, and provider failure isolation. It makes no external requests and does not import a native runtime.

Remote validation has **not** been performed without project credentials. For a configured release candidate, verify a deliberate synthetic event and error in the correct PostHog/Sentry project, inspect the resulting payload for prohibited fields, test the offline path, and confirm default builds create no telemetry requests. Source-map uploads are not configured; this conservative reporting mode strips exception stacks.

## Primary references

- [PostHog capture API and anonymous events](https://posthog.com/docs/api/capture)
- [Sentry Expo native/web support](https://sentry.io/changelog/react-native-sdk-with-built-in-support-for-expo/)
- [Sentry React Native 7.11 option definitions](https://github.com/getsentry/sentry-react-native/blob/7.11.0/packages/core/src/js/options.ts)
