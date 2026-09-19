import { describe, expect, test } from "@jest/globals";
import {
  createObservability,
  sanitizeSentryEvent,
  type ObservabilityDrivers,
  type SentryInitOptions,
} from "../src/analytics/bootstrap";
import { createTracker } from "../src/analytics/tracker";

function harness() {
  const requests: { url: string; body: string }[] = [];
  const messages: string[] = [];
  const options: SentryInitOptions[] = [];
  let sentryLoads = 0;
  const drivers: ObservabilityDrivers = {
    randomId: () => "anonymous-session-1",
    fetch: async (url, init) => {
      requests.push({ url, body: init.body });
      return {};
    },
    loadSentry: () => {
      sentryLoads++;
      return {
        init: (config) => {
          options.push(config);
        },
        captureMessage: (message) => {
          messages.push(message);
        },
      };
    },
  };
  return {
    drivers,
    requests,
    messages,
    options,
    sentryLoads: () => sentryLoads,
  };
}

describe("optional observability bootstrap", () => {
  test("disabled and unconfigured installs make no requests or SDK initialization", async () => {
    const h = harness();
    for (const config of [
      {},
      { enabled: true },
      {
        enabled: false,
        postHogKey: "phc_test",
        sentryDsn: "https://public@o1.ingest.sentry.io/1",
      },
    ]) {
      const observer = createObservability(config, h.drivers);
      createTracker(observer.adapter)("app_open");
      observer.captureAppError(new Error("private typed data"));
    }
    await Promise.resolve();
    expect(h.requests).toEqual([]);
    expect(h.sentryLoads()).toBe(0);
    expect(h.messages).toEqual([]);
  });

  test("PostHog sends only allowlisted events/properties with ephemeral identity", async () => {
    const h = harness();
    const observer = createObservability(
      {
        enabled: true,
        postHogKey: "phc_test",
        postHogHost: "https://eu.i.posthog.com/",
      },
      h.drivers,
    );
    const track = createTracker(observer.adapter);
    track("answer_completed", {
      contentId: "en-ko-word-001",
      correct: true,
      score: 12,
      answer: "private typed input",
      email: "private@example.com",
      durationMs: Infinity,
    });
    track("raw_key_pressed", { answer: "private" });
    await Promise.resolve();
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].url).toBe("https://eu.i.posthog.com/i/v0/e/");
    expect(JSON.parse(h.requests[0].body)).toEqual({
      api_key: "phc_test",
      event: "answer_completed",
      distinct_id: "anonymous-session-1",
      properties: {
        contentId: "en-ko-word-001",
        correct: true,
        score: 12,
        $process_person_profile: false,
        $geoip_disable: true,
        $ip: null,
      },
    });
    expect(h.requests[0].body).not.toContain("private");
  });

  test("SDK options and final event scrubber suppress sensitive default context", () => {
    const h = harness();
    const observer = createObservability(
      { enabled: true, sentryDsn: "https://public@o1.ingest.sentry.io/1" },
      h.drivers,
    );
    observer.captureAppError(new Error("typed-secret@example.com"));
    expect(h.options).toHaveLength(1);
    expect(h.options[0]).toMatchObject({
      sendDefaultPii: false,
      enableAutoSessionTracking: false,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      tracesSampleRate: 0,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableNative: false,
      defaultIntegrations: false,
    });
    expect(h.messages).toEqual(["KeyLingo application error"]);
    const cleaned = h.options[0].beforeSend({
      message: "typed-secret",
      user: { email: "private@example.com" },
      extra: { input: "private" },
      exception: { values: [{ value: "secret" }] },
      request: { url: "https://private.example" },
      contexts: { device: { name: "personal name" } },
      breadcrumbs: [
        { category: "console", message: "typed-secret" },
        {
          category: "keylingo",
          message: "answer_completed",
          data: { contentId: "ko-en-word-001", answer: "private" },
        },
      ],
      event_id: "0123456789abcdef0123456789abcdef",
      timestamp: 1234,
    });
    expect(cleaned).toEqual({
      message: "KeyLingo application error",
      level: "error",
      platform: "javascript",
      event_id: "0123456789abcdef0123456789abcdef",
      timestamp: 1234,
      breadcrumbs: [
        {
          category: "keylingo",
          message: "answer_completed",
          data: { contentId: "ko-en-word-001" },
        },
      ],
    });
    expect(JSON.stringify(cleaned)).not.toContain("private");
    expect(JSON.stringify(cleaned)).not.toContain("secret");
  });

  test("SDK initialization, capture and network failures cannot escape to gameplay", async () => {
    const h = harness();
    const observer = createObservability(
      {
        enabled: true,
        postHogKey: "phc_test",
        sentryDsn: "https://public@o1.ingest.sentry.io/1",
      },
      {
        ...h.drivers,
        fetch: async () => {
          throw new Error("offline");
        },
        loadSentry: () => {
          throw new Error("native unavailable");
        },
      },
    );
    expect(() => createTracker(observer.adapter)("app_open")).not.toThrow();
    expect(() =>
      observer.captureAppError(new Error("sensitive")),
    ).not.toThrow();
    await Promise.resolve();
    const badCapture = createObservability(
      { enabled: true, sentryDsn: "https://public@o1.ingest.sentry.io/1" },
      {
        ...h.drivers,
        loadSentry: () => ({
          init: () => {},
          captureMessage: () => {
            throw new Error("unavailable");
          },
        }),
      },
    );
    expect(() => badCapture.captureAppError({ input: "secret" })).not.toThrow();
  });

  test("insecure or malformed endpoints stay disabled and scrubber rejects unknown breadcrumbs", () => {
    const h = harness();
    const observer = createObservability(
      {
        enabled: true,
        postHogKey: "phc_test",
        postHogHost: "http://untrusted.example",
        sentryDsn: "not-a-dsn",
      },
      h.drivers,
    );
    createTracker(observer.adapter)("app_open");
    observer.captureAppError("secret");
    expect(h.requests).toEqual([]);
    expect(h.sentryLoads()).toBe(0);
    expect(
      sanitizeSentryEvent({
        breadcrumbs: [
          {
            category: "keylingo",
            message: "private-text",
            data: { input: "secret" },
          },
        ],
      }).breadcrumbs,
    ).toEqual([]);
  });
});
