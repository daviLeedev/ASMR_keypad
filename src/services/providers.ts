export type ProviderMode = "development" | "production" | "unavailable";
export type AdResult = "rewarded" | "closed" | "failed";
export interface RewardedAdProvider {
  readonly mode: ProviderMode;
  isAvailable(): Promise<boolean>;
  showRewardedAd(): Promise<AdResult>;
}
export interface Offering {
  id: string;
  title: string;
  priceString: string;
}
export interface Entitlement {
  productId: string;
  transactionId: string;
}
export interface PurchaseResult {
  status: "purchased" | "cancelled" | "failed";
  productId?: string;
  transactionId?: string;
  error?: string;
}
export interface RestoreResult {
  status: "restored" | "failed";
  entitlements: Entitlement[];
}
export interface PurchaseProvider {
  readonly mode: ProviderMode;
  loadOfferings(): Promise<Offering[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<RestoreResult>;
}

/** Explicitly simulated; currency mutations belong exclusively to the economy ledger. */
export class MockRewardedAdProvider implements RewardedAdProvider {
  readonly mode = "development" as const;
  constructor(private readonly result: AdResult = "rewarded") {}
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async showRewardedAd(): Promise<AdResult> {
    return this.result;
  }
}

export class MockPurchaseProvider implements PurchaseProvider {
  readonly mode = "development" as const;
  private purchased = false;
  constructor(private readonly productId = "starter_pack") {}
  async loadOfferings(): Promise<Offering[]> {
    return [
      {
        id: this.productId,
        title: "Starter Pack · development simulation",
        priceString: "DEV · FREE TEST",
      },
    ];
  }
  async purchase(productId: string): Promise<PurchaseResult> {
    if (productId !== this.productId)
      return { status: "failed", error: "unknown_product" };
    this.purchased = true;
    return {
      status: "purchased",
      productId,
      transactionId: `dev:${productId}:v1`,
    };
  }
  async restore(): Promise<RestoreResult> {
    // Stable identity permits the central ledger to deduplicate restore/repeated purchase.
    return {
      status: "restored",
      entitlements: this.purchased
        ? [
            {
              productId: this.productId,
              transactionId: `dev:${this.productId}:v1`,
            },
          ]
        : [],
    };
  }
}

/** Native AdMob bridge must resolve rewarded only from EARNED_REWARD, never CLOSED. */
export interface AdMobBridge {
  isAvailable(): Promise<boolean>;
  showRewardedAd(): Promise<AdResult>;
}
export class AdMobRewardedAdProvider implements RewardedAdProvider {
  readonly mode: ProviderMode;
  private showing = false;
  constructor(private readonly bridge?: AdMobBridge) {
    this.mode = bridge ? "production" : "unavailable";
  }
  async isAvailable(): Promise<boolean> {
    try {
      return this.bridge ? await this.bridge.isAvailable() : false;
    } catch {
      return false;
    }
  }
  async showRewardedAd(): Promise<AdResult> {
    if (!this.bridge || this.showing) return "failed";
    this.showing = true;
    try {
      const result = await this.bridge.showRewardedAd();
      return result === "rewarded" || result === "closed" ? result : "failed";
    } catch {
      return "failed";
    } finally {
      this.showing = false;
    }
  }
}

/** SDK bridge returns localized store prices and original store transaction IDs. */
export interface RevenueCatBridge {
  loadOfferings(): Promise<Offering[]>;
  purchase(productId: string): Promise<Entitlement>;
  restore(): Promise<Entitlement[]>;
}
export class RevenueCatPurchaseProvider implements PurchaseProvider {
  readonly mode: ProviderMode;
  private purchasing = false;
  constructor(private readonly bridge?: RevenueCatBridge) {
    this.mode = bridge ? "production" : "unavailable";
  }
  async loadOfferings(): Promise<Offering[]> {
    try {
      return this.bridge ? await this.bridge.loadOfferings() : [];
    } catch {
      return [];
    }
  }
  async purchase(productId: string): Promise<PurchaseResult> {
    if (!this.bridge)
      return { status: "failed", error: "store_not_configured" };
    if (this.purchasing)
      return { status: "failed", error: "purchase_in_progress" };
    this.purchasing = true;
    try {
      const receipt = await this.bridge.purchase(productId);
      if (!receipt.transactionId || receipt.productId !== productId)
        return { status: "failed", error: "invalid_receipt" };
      return { status: "purchased", ...receipt };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "userCancelled" in error &&
        error.userCancelled === true
      )
        return { status: "cancelled" };
      return { status: "failed", error: "store_unavailable" };
    } finally {
      this.purchasing = false;
    }
  }
  async restore(): Promise<RestoreResult> {
    if (!this.bridge) return { status: "failed", entitlements: [] };
    try {
      const entitlements = (await this.bridge.restore()).filter((e) =>
        Boolean(e.productId && e.transactionId),
      );
      return { status: "restored", entitlements };
    } catch {
      return { status: "failed", entitlements: [] };
    }
  }
}

export interface ProviderOptions {
  development: boolean;
  enableMocks?: boolean;
  mode?: string;
  productId?: string;
  ads?: AdMobBridge;
  purchases?: RevenueCatBridge;
}
export function createProviders(options: ProviderOptions): {
  ads: RewardedAdProvider;
  purchases: PurchaseProvider;
} {
  const mock =
    options.mode === "mock" ||
    (options.mode !== "production" &&
      options.development &&
      options.enableMocks !== false);
  return mock
    ? {
        ads: new MockRewardedAdProvider(),
        purchases: new MockPurchaseProvider(options.productId),
      }
    : {
        ads: new AdMobRewardedAdProvider(options.ads),
        purchases: new RevenueCatPurchaseProvider(options.purchases),
      };
}
