/* eslint-disable @typescript-eslint/no-require-imports */
import type {
  AdMobBridge,
  AdResult,
  Entitlement,
  RevenueCatBridge,
} from "./providers";

export interface NativeConfig {
  platform: string;
  adAppId?: string;
  rewardedUnitId?: string;
  purchasesApiKey?: string;
  productId: string;
  entitlementId: string;
}
interface StoreProduct {
  identifier: string;
  title: string;
  priceString: string;
}
interface StorePackage {
  identifier: string;
  product: StoreProduct;
}
interface StoreTransaction {
  productIdentifier: string;
  transactionIdentifier: string;
  purchaseDate: string;
}
interface CustomerInfo {
  nonSubscriptionTransactions: StoreTransaction[];
  entitlements: {
    active: Record<
      string,
      { productIdentifier: string; originalPurchaseDate: string }
    >;
  };
}
/** Narrow ports retain original SDK package objects when forwarding purchasePackage. */
export interface PurchaseSDK {
  configure(config: { apiKey: string }): void;
  getOfferings(): Promise<{
    current: { availablePackages: StorePackage[] } | null;
  }>;
  purchasePackage(storePackage: StorePackage): Promise<{
    productIdentifier: string;
    transaction?: StoreTransaction;
    customerInfo: CustomerInfo;
  }>;
  restorePurchases(): Promise<CustomerInfo>;
}
interface RewardedInstance {
  addAdEventListener(event: string, callback: () => void): () => void;
  load(): void;
  show(): Promise<unknown>;
}
export interface AdsSDK {
  initialize(): Promise<unknown>;
  createRewarded(unitId: string): RewardedInstance;
  events: { loaded: string; earned: string; closed: string; error: string };
}
interface NativeLoaders {
  ads?: () => AdsSDK;
  purchases?: () => PurchaseSDK;
}

function loadAdsSDK(): AdsSDK {
  // Lazy requires let an unconfigured app/Expo Go retain its offline core.
  const sdk =
    require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
  return {
    initialize: async () => {
      // UMP consent completes before any SDK ad request. This runs on explicit ad access.
      const consent = await sdk.AdsConsent.gatherConsent();
      if (!consent.canRequestAds) throw new Error("ad_consent_unavailable");
      return sdk.default().initialize();
    },
    createRewarded: (unitId) =>
      sdk.RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      }) as unknown as RewardedInstance,
    events: {
      loaded: sdk.RewardedAdEventType.LOADED,
      earned: sdk.RewardedAdEventType.EARNED_REWARD,
      closed: sdk.AdEventType.CLOSED,
      error: sdk.AdEventType.ERROR,
    },
  };
}
function loadPurchasesSDK(): PurchaseSDK {
  return (require("react-native-purchases") as { default: PurchaseSDK })
    .default;
}

function purchaseBridge(
  config: NativeConfig,
  load: () => PurchaseSDK,
): RevenueCatBridge {
  let sdk: PurchaseSDK | undefined;
  function client() {
    if (!sdk) {
      const candidate = load();
      candidate.configure({ apiKey: config.purchasesApiKey! });
      sdk = candidate;
    }
    return sdk;
  }
  function ownership(
    info: CustomerInfo,
    transaction?: StoreTransaction,
  ): Entitlement | undefined {
    const entitlement = info.entitlements.active[config.entitlementId];
    if (entitlement?.productIdentifier !== config.productId) return undefined;
    const transactions = [
      ...info.nonSubscriptionTransactions,
      ...(transaction ? [transaction] : []),
    ]
      .filter(
        (t) =>
          t.productIdentifier === config.productId && t.transactionIdentifier,
      )
      .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
    if (transactions[0])
      return {
        productId: config.productId,
        transactionId: `store:${transactions[0].transactionIdentifier}`,
      };
    if (entitlement.originalPurchaseDate) {
      return {
        productId: config.productId,
        transactionId: `entitlement:${config.entitlementId}:${config.productId}:${entitlement.originalPurchaseDate}`,
      };
    }
    return undefined;
  }
  async function packages() {
    return (
      (await client().getOfferings()).current?.availablePackages.filter(
        (p) => p.product.identifier === config.productId,
      ) ?? []
    );
  }
  return {
    async loadOfferings() {
      return (await packages()).map((p) => ({
        id: p.product.identifier,
        title: p.product.title,
        priceString: p.product.priceString,
      }));
    },
    async purchase(productId) {
      if (productId !== config.productId) throw new Error("unknown_product");
      const selected = (await packages()).find(
        (p) => p.product.identifier === productId,
      );
      if (!selected) throw new Error("product_not_offered");
      // Only this explicit method invokes the store purchase sheet. User cancellation propagates.
      const result = await client().purchasePackage(selected);
      if (result.productIdentifier !== productId)
        throw new Error("unexpected_product");
      const owned = ownership(result.customerInfo, result.transaction);
      if (!owned) throw new Error("purchase_not_verified");
      return owned;
    },
    async restore() {
      // Only this explicit method invokes store restore (which may show a sign-in sheet).
      const owned = ownership(await client().restorePurchases());
      return owned ? [owned] : [];
    },
  };
}

function adsBridge(config: NativeConfig, load: () => AdsSDK): AdMobBridge {
  let sdk: AdsSDK | undefined;
  let initializing: Promise<unknown> | undefined;
  let ad: RewardedInstance | undefined;
  let loading: Promise<boolean> | undefined;
  let loaded = false;
  let showing = false;
  let earned = false;
  let loadedAt = 0;
  let unsubscribers: (() => void)[] = [];
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveLoad: ((ready: boolean) => void) | undefined;
  let resolveShow: ((result: AdResult) => void) | undefined;

  function cleanup(result: AdResult) {
    if (loadTimer) clearTimeout(loadTimer);
    if (showTimer) clearTimeout(showTimer);
    for (const unsubscribe of unsubscribers) {
      try {
        unsubscribe();
      } catch {
        /* Already detached. */
      }
    }
    unsubscribers = [];
    resolveLoad?.(false);
    resolveLoad = undefined;
    resolveShow?.(result);
    resolveShow = undefined;
    ad = undefined;
    loaded = false;
    loading = undefined;
    showing = false;
    earned = false;
  }
  async function ready(): Promise<boolean> {
    if (loaded && Date.now() - loadedAt < 45 * 60 * 1000) return true;
    if (loaded) cleanup("failed");
    if (loading) return loading;
    if (ad) cleanup("failed");
    loading = (async () => {
      try {
        sdk ??= load();
        initializing ??= sdk.initialize();
        await initializing;
        const current = sdk.createRewarded(config.rewardedUnitId!);
        ad = current;
        return await new Promise<boolean>((resolve) => {
          resolveLoad = resolve;
          unsubscribers = [
            current.addAdEventListener(sdk!.events.loaded, () => {
              loaded = true;
              loadedAt = Date.now();
              if (loadTimer) clearTimeout(loadTimer);
              resolveLoad?.(true);
              resolveLoad = undefined;
            }),
            current.addAdEventListener(sdk!.events.earned, () => {
              if (showing) earned = true;
            }),
            current.addAdEventListener(sdk!.events.closed, () =>
              cleanup(earned ? "rewarded" : "closed"),
            ),
            current.addAdEventListener(sdk!.events.error, () =>
              cleanup("failed"),
            ),
          ];
          loadTimer = setTimeout(() => cleanup("failed"), 30000);
          try {
            current.load();
          } catch {
            cleanup("failed");
          }
        });
      } catch {
        initializing = undefined;
        cleanup("failed");
        return false;
      }
    })();
    return loading;
  }
  return {
    isAvailable: ready,
    async showRewardedAd() {
      if (showing) return "failed";
      showing = true;
      if (!(await ready()) || !ad) {
        showing = false;
        return "failed";
      }
      showing = true;
      return new Promise<AdResult>((resolve) => {
        resolveShow = resolve;
        // Prevent an SDK that never dispatches closure from blocking the UI forever.
        showTimer = setTimeout(
          () => cleanup(earned ? "rewarded" : "failed"),
          180000,
        );
        try {
          void ad!.show().catch(() => cleanup("failed"));
        } catch {
          cleanup("failed");
        }
      });
    },
  };
}

export function createNativeBridges(
  config: NativeConfig,
  loaders: NativeLoaders = {},
): { ads?: AdMobBridge; purchases?: RevenueCatBridge } {
  if (config.platform !== "android" && config.platform !== "ios") return {};
  return {
    ...(config.adAppId && config.rewardedUnitId
      ? { ads: adsBridge(config, loaders.ads ?? loadAdsSDK) }
      : {}),
    ...(config.purchasesApiKey
      ? {
          purchases: purchaseBridge(
            config,
            loaders.purchases ?? loadPurchasesSDK,
          ),
        }
      : {}),
  };
}
