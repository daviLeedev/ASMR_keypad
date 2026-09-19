import {
  createTracker,
  type AnalyticsAdapter,
  type AnalyticsProperties,
} from "./tracker";
export { createTracker } from "./tracker";
export type { AnalyticsAdapter, AnalyticsProperties } from "./tracker";

let tracker = createTracker();
/** Install a consented adapter at bootstrap; default is no network collection. */
export function configureAnalytics(adapter?: AnalyticsAdapter): void {
  tracker = createTracker(adapter);
}
export function track(event: string, props?: AnalyticsProperties): void {
  tracker(event, props);
}

/** PostHog client must have session replay and automatic input capture disabled. */
export function postHogAdapter(client: {
  capture(event: string, props: AnalyticsProperties): unknown;
}): AnalyticsAdapter {
  return {
    capture(event, props) {
      client.capture(event, props);
    },
  };
}
/** Only sanitized breadcrumbs; never forward user answers, arbitrary errors, or UI text. */
export function sentryAdapter(client: {
  addBreadcrumb(crumb: {
    category: string;
    message: string;
    data: AnalyticsProperties;
  }): unknown;
}): AnalyticsAdapter {
  return {
    capture(event, props) {
      client.addBreadcrumb({
        category: "keylingo",
        message: event,
        data: props,
      });
    },
  };
}
