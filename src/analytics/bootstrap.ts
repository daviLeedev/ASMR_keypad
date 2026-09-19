/* eslint-disable @typescript-eslint/no-require-imports */
import { configureAnalytics } from "./index";
import {
  createTracker,
  type AnalyticsAdapter,
  type AnalyticsProperties,
} from "./tracker";
export interface ObservabilityConfig {
  enabled?: boolean;
  postHogKey?: string;
  postHogHost?: string;
  sentryDsn?: string;
}
export interface SentryInitOptions {
  dsn: string;
  enabled: boolean;
  sendDefaultPii: boolean;
  enableAutoSessionTracking: boolean;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  tracesSampleRate: number;
  attachScreenshot: boolean;
  attachViewHierarchy: boolean;
  enableNative: boolean;
  defaultIntegrations: false;
  beforeSend(event: Record<string, unknown>): Record<string, unknown>;
}
export interface SentryDriver {
  init(options: SentryInitOptions): unknown;
  captureMessage(message: string, level: "error"): unknown;
  addBreadcrumb?(breadcrumb: {
    category: string;
    message: string;
    data: AnalyticsProperties;
  }): unknown;
}
export interface ObservabilityDrivers {
  fetch(
    url: string,
    options: {
      method: "POST";
      headers: Record<string, string>;
      body: string;
      credentials: "omit";
      signal?: AbortSignal;
    },
  ): Promise<unknown>;
  randomId(): string;
  loadSentry(): SentryDriver;
}
export interface Observability {
  adapter?: AnalyticsAdapter;
  captureAppError(error: unknown): void;
}
const ERROR_MESSAGE = "KeyLingo application error";
const NETWORK_TIMEOUT_MS = 5000;
const MAX_IN_FLIGHT = 4;
export interface SanitizedSentryEvent {
  message: string;
  level: "error";
  platform: "javascript";
  event_id?: string;
  timestamp?: number;
  breadcrumbs: {
    category: string;
    message: string;
    data: AnalyticsProperties;
  }[];
  [key: string]: unknown;
}

/** Construct a fresh event instead of trying to blacklist arbitrary SDK context fields. */
export function sanitizeSentryEvent(
  event: Record<string, unknown>,
): SanitizedSentryEvent {
  const safe: SanitizedSentryEvent = {
    message: ERROR_MESSAGE,
    level: "error",
    platform: "javascript",
    breadcrumbs: [],
  };
  if (
    typeof event.event_id === "string" &&
    /^[a-f0-9]{32}$/i.test(event.event_id)
  )
    safe.event_id = event.event_id;
  if (typeof event.timestamp === "number" && Number.isFinite(event.timestamp))
    safe.timestamp = event.timestamp;
  const breadcrumbs: {
    category: string;
    message: string;
    data: AnalyticsProperties;
  }[] = [];
  const filter = createTracker({
    capture(message, data) {
      breadcrumbs.push({ category: "keylingo", message, data });
    },
  });
  if (Array.isArray(event.breadcrumbs))
    for (const crumb of event.breadcrumbs.slice(-20)) {
      if (
        !crumb ||
        typeof crumb !== "object" ||
        crumb.category !== "keylingo" ||
        typeof crumb.message !== "string"
      )
        continue;
      const data =
        crumb.data &&
        typeof crumb.data === "object" &&
        !Array.isArray(crumb.data)
          ? (crumb.data as AnalyticsProperties)
          : {};
      filter(crumb.message, data);
    }
  safe.breadcrumbs = breadcrumbs;
  return safe;
}

function validHost(host: string): string | undefined {
  try {
    const url = new URL(host);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return undefined;
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function validDsn(dsn?: string): dsn is string {
  if (!dsn) return false;
  try {
    const url = new URL(dsn);
    return (
      url.protocol === "https:" &&
      !!url.username &&
      !url.password &&
      /^\/\d+$/.test(url.pathname) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

/** Dependency injection keeps all unit tests independent of native imports and the network. */
export function createObservability(
  config: ObservabilityConfig,
  drivers: ObservabilityDrivers,
): Observability {
  if (!config.enabled) return { captureAppError() {} };
  let sentry: SentryDriver | undefined;
  if (validDsn(config.sentryDsn)) {
    try {
      const loaded = drivers.loadSentry();
      loaded.init({
        dsn: config.sentryDsn,
        enabled: true,
        sendDefaultPii: false,
        enableAutoSessionTracking: false,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        tracesSampleRate: 0,
        attachScreenshot: false,
        attachViewHierarchy: false,
        enableNative: false,
        defaultIntegrations: false,
        beforeSend: sanitizeSentryEvent,
      });
      sentry = loaded;
    } catch {
      /* Optional native SDK/module failures never interrupt app startup. */
    }
  }
  const host = validHost(config.postHogHost ?? "https://us.i.posthog.com");
  const postHogEnabled = !!host && !!config.postHogKey;
  const distinctId = postHogEnabled ? drivers.randomId() : "";
  let inFlight = 0;
  const capture = createTracker({
    async capture(event, properties) {
      try {
        sentry?.addBreadcrumb?.({
          category: "keylingo",
          message: event,
          data: properties,
        });
      } catch {
        /* Optional. */
      }
      if (!postHogEnabled || inFlight >= MAX_IN_FLIGHT) return;
      inFlight++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
      try {
        await drivers.fetch(`${host}/i/v0/e/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          signal: controller.signal,
          body: JSON.stringify({
            api_key: config.postHogKey,
            event,
            distinct_id: distinctId,
            properties: {
              ...properties,
              $process_person_profile: false,
              $geoip_disable: true,
              $ip: null,
            },
          }),
        });
      } catch {
        /* No retries, persisted queue, or gameplay failure on telemetry errors. */
      } finally {
        clearTimeout(timeout);
        inFlight--;
      }
    },
  });
  return {
    adapter: postHogEnabled || sentry ? { capture } : undefined,
    // Deliberately do not inspect error.message, stack, cause, or any user-controlled payload.
    captureAppError(_error: unknown) {
      try {
        sentry?.captureMessage(ERROR_MESSAGE, "error");
      } catch {
        /* Optional. */
      }
    },
  };
}

let initialized = false;
let active: Observability = { captureAppError() {} };

/** No SDK loads or network requests when the explicit opt-in or credentials are absent. */
export function initializeObservability(): void {
  if (initialized) return;
  initialized = true;
  try {
    active = createObservability(
      {
        enabled: process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED === "true",
        postHogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
        postHogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
        sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      },
      {
        fetch: (url, options) => fetch(url, options),
        randomId: () =>
          globalThis.crypto?.randomUUID?.() ??
          `session-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
        loadSentry() {
          // Loaded only after explicit opt-in plus a valid DSN. The SDK supports Expo native and web.
          const sdk =
            require("@sentry/react-native") as typeof import("@sentry/react-native");
          return {
            init: (options) =>
              sdk.init({
                ...options,
                beforeSend: (event) => ({
                  ...sanitizeSentryEvent({ ...event }),
                  type: undefined,
                }),
              }),
            captureMessage: (message, level) =>
              sdk.captureMessage(message, level),
            addBreadcrumb: (crumb) => sdk.addBreadcrumb(crumb),
          };
        },
      },
    );
    configureAnalytics(active.adapter);
  } catch {
    configureAnalytics();
  }
}

export function captureAppError(error: unknown): void {
  active.captureAppError(error);
}
