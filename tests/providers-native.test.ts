import {
  createNativeBridges,
  type NativeConfig,
  type PurchaseSDK,
  type AdsSDK,
} from "../src/services/nativeBridges";
import { RevenueCatPurchaseProvider } from "../src/services/providers";

const config: NativeConfig = {
  platform: "android",
  adAppId: "ca-app-pub-123~456",
  rewardedUnitId: "ca-app-pub-123/789",
  purchasesApiKey: "goog_public-key",
  productId: "starter_pack",
  entitlementId: "starter_pack",
};
const customer = {
  nonSubscriptionTransactions: [
    {
      productIdentifier: "starter_pack",
      transactionIdentifier: "original-123",
      purchaseDate: "2026-09-19T01:00:00Z",
    },
  ],
  entitlements: {
    active: {
      starter_pack: {
        productIdentifier: "starter_pack",
        originalPurchaseDate: "2026-09-19T01:00:00Z",
      },
    },
  },
};

test("missing configuration never loads native SDKs or exposes a provider", () => {
  const load = () => {
    throw new Error("native module should stay unloaded");
  };
  expect(
    createNativeBridges(
      { ...config, adAppId: "", purchasesApiKey: "" },
      { ads: load, purchases: load },
    ),
  ).toEqual({});
});

test("RevenueCat maps localized prices and stable restored store identity without automatic purchasing", async () => {
  let configured = 0,
    purchases = 0,
    restores = 0;
  const sdk: PurchaseSDK = {
    configure: () => {
      configured++;
    },
    getOfferings: async () => ({
      current: {
        availablePackages: [
          {
            identifier: "$rc_lifetime",
            product: {
              identifier: "starter_pack",
              title: "Starter Pack",
              priceString: "₩4,400",
            },
          },
          {
            identifier: "other",
            product: { identifier: "other", title: "Other", priceString: "$1" },
          },
        ],
      },
    }),
    purchasePackage: async () => {
      purchases++;
      return {
        productIdentifier: "starter_pack",
        transaction: customer.nonSubscriptionTransactions[0],
        customerInfo: customer,
      };
    },
    restorePurchases: async () => {
      restores++;
      return customer;
    },
  };
  const bridge = createNativeBridges(config, {
    purchases: () => sdk,
  }).purchases!;
  expect(configured).toBe(0);
  expect(await bridge.loadOfferings()).toEqual([
    { id: "starter_pack", title: "Starter Pack", priceString: "₩4,400" },
  ]);
  expect(purchases).toBe(0);
  expect(restores).toBe(0);
  expect(await bridge.purchase("starter_pack")).toEqual({
    productId: "starter_pack",
    transactionId: "store:original-123",
  });
  expect(await bridge.restore()).toEqual([
    { productId: "starter_pack", transactionId: "store:original-123" },
  ]);
  expect(configured).toBe(1);
  expect(purchases).toBe(1);
});

test("RevenueCat cancellation propagates and absent ownership never synthesizes grants", async () => {
  const sdk: PurchaseSDK = {
    configure() {},
    getOfferings: async () => ({
      current: {
        availablePackages: [
          {
            identifier: "starter",
            product: {
              identifier: "starter_pack",
              title: "Starter",
              priceString: "$2",
            },
          },
        ],
      },
    }),
    purchasePackage: async () => {
      throw { userCancelled: true };
    },
    restorePurchases: async () => ({
      nonSubscriptionTransactions: [],
      entitlements: { active: {} },
    }),
  };
  const bridge = createNativeBridges(config, {
    purchases: () => sdk,
  }).purchases!;
  const provider = new RevenueCatPurchaseProvider(bridge);
  expect((await provider.purchase("starter_pack")).status).toBe("cancelled");
  expect(await bridge.restore()).toEqual([]);
  await expect(bridge.purchase("unconfigured-product")).rejects.toThrow();
});

test("RevenueCat uses stable entitlement original purchase identity when store transaction is unavailable", async () => {
  const info = { ...customer, nonSubscriptionTransactions: [] };
  const sdk: PurchaseSDK = {
    configure() {},
    getOfferings: async () => ({ current: null }),
    purchasePackage: async () => {
      throw new Error();
    },
    restorePurchases: async () => info,
  };
  const bridge = createNativeBridges(config, {
    purchases: () => sdk,
  }).purchases!;
  expect(await bridge.restore()).toEqual([
    {
      productId: "starter_pack",
      transactionId:
        "entitlement:starter_pack:starter_pack:2026-09-19T01:00:00Z",
    },
  ]);
});

test("historical transactions with a revoked entitlement do not restore ownership", async () => {
  const sdk: PurchaseSDK = {
    configure() {},
    getOfferings: async () => ({ current: null }),
    purchasePackage: async () => {
      throw new Error();
    },
    restorePurchases: async () => ({
      ...customer,
      entitlements: { active: {} },
    }),
  };
  const bridge = createNativeBridges(config, {
    purchases: () => sdk,
  }).purchases!;
  expect(await bridge.restore()).toEqual([]);
});

function adFixture() {
  const listeners = new Map<string, () => void>();
  let shows = 0,
    loads = 0,
    initialized = 0;
  const sdk: AdsSDK = {
    initialize: async () => {
      initialized++;
    },
    createRewarded: () => ({
      addAdEventListener(event, callback) {
        listeners.set(event, callback);
        return () => {
          listeners.delete(event);
        };
      },
      load() {
        loads++;
        listeners.get("loaded")?.();
      },
      async show() {
        shows++;
      },
    }),
    events: {
      loaded: "loaded",
      earned: "earned",
      closed: "closed",
      error: "error",
    },
  };
  return {
    sdk,
    listeners,
    get shows() {
      return shows;
    },
    get loads() {
      return loads;
    },
    get initialized() {
      return initialized;
    },
  };
}

test("rewarded SDK loads without showing, and dismissal alone never grants", async () => {
  const f = adFixture();
  const bridge = createNativeBridges(config, { ads: () => f.sdk }).ads!;
  expect(f.initialized).toBe(0);
  expect(await bridge.isAvailable()).toBe(true);
  expect(f.shows).toBe(0);
  const showing = bridge.showRewardedAd();
  await Promise.resolve();
  await Promise.resolve();
  f.listeners.get("closed")?.();
  expect(await showing).toBe("closed");
  expect(f.listeners.size).toBe(0);
});

test("rewarded SDK grants once only after earned event and detaches completion listeners", async () => {
  const f = adFixture();
  const bridge = createNativeBridges(config, { ads: () => f.sdk }).ads!;
  await bridge.isAvailable();
  const showing = bridge.showRewardedAd();
  await Promise.resolve();
  await Promise.resolve();
  expect(f.shows).toBe(1);
  f.listeners.get("earned")?.();
  f.listeners.get("closed")?.();
  expect(await showing).toBe("rewarded");
  expect(f.listeners.size).toBe(0);
});

test("expired cached ads reload before showing and still honor the earned event", async () => {
  jest.useFakeTimers();
  try {
    const f = adFixture();
    const bridge = createNativeBridges(config, { ads: () => f.sdk }).ads!;
    await bridge.isAvailable();
    jest.setSystemTime(Date.now() + 46 * 60 * 1000);
    expect(await bridge.isAvailable()).toBe(true);
    expect(f.loads).toBe(2);
    const showing = bridge.showRewardedAd();
    await Promise.resolve();
    await Promise.resolve();
    f.listeners.get("earned")?.();
    f.listeners.get("closed")?.();
    expect(await showing).toBe("rewarded");
  } finally {
    jest.useRealTimers();
  }
});
