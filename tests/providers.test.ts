import { AudioEngine, type AudioPlayer } from "../src/audio/engine";
import {
  createProviders,
  MockPurchaseProvider,
  MockRewardedAdProvider,
  RevenueCatPurchaseProvider,
} from "../src/services/providers";
import { createTracker } from "../src/analytics/tracker";

const pack = {
  press: {
    normal: [1, 2, 3, 4],
    space: [5, 6],
    enter: [7],
    backspace: [8],
  },
  release: {
    normal: [11, 12],
    space: [15],
    enter: [17],
    backspace: [18],
  },
};
const settings = { soundEnabled: true, volume: 0.6, hapticsEnabled: true };

describe("preloaded keyboard audio", () => {
  test("awaits sample preparation before creating playback voices", async () => {
    const prepared: number[] = [];
    const played: number[] = [];
    const engine = new AudioEngine(
      {
        async prepareSource(source) {
          await Promise.resolve();
          prepared.push(source);
        },
        createPlayer(source) {
          expect(prepared).toContain(source);
          return {
            volume: 1,
            seekTo: async () => {},
            play: () => {
              played.push(source);
            },
            remove() {},
          };
        },
        haptic() {},
      },
      () => 0,
    );
    await engine.preload(pack);
    engine.trigger("press", "normal", settings);
    expect(prepared).toHaveLength(13);
    expect([1, 2, 3, 4]).toContain(played[0]);
  });
  function setup(random = () => 0) {
    const plays: { source: number; player: number; volume: number }[] = [];
    const removed: number[] = [];
    let created = 0;
    let haptics = 0;
    const engine = new AudioEngine(
      {
        createPlayer(source): AudioPlayer {
          const id = ++created;
          return {
            volume: 1,
            seekTo: async () => {},
            play() {
              plays.push({ source, player: id, volume: this.volume });
            },
            remove() {
              removed.push(id);
            },
          };
        },
        haptic: () => {
          haptics++;
        },
      },
      random,
    );
    return {
      engine,
      plays,
      removed,
      get created() {
        return created;
      },
      get haptics() {
        return haptics;
      },
    };
  }

  test("preloads without autoplay, routes categories and overlaps repeated rapid keys", async () => {
    const s = setup();
    await s.engine.preload({
      press: { normal: [1], space: [5], backspace: [8] },
      release: {},
    });
    expect(s.plays).toHaveLength(0);
    const preloadedCount = s.created;
    s.engine.trigger("press", "normal", settings);
    s.engine.trigger("press", "normal", settings);
    s.engine.trigger("press", "space", settings);
    s.engine.trigger("press", "backspace", settings);
    await Promise.resolve();
    expect(s.plays.map((p) => p.source)).toEqual([1, 1, 5, 8]);
    expect(s.plays[0].player).not.toBe(s.plays[1].player);
    expect(s.created).toBe(preloadedCount);
    expect(s.plays.every((p) => p.volume === 0.6)).toBe(true);
    expect(s.haptics).toBe(4);
  });

  test("shuffle bag uses every variant before repeating", async () => {
    const s = setup(() => 0.99);
    await s.engine.preload(pack);
    for (let index = 0; index < 4; index++) {
      s.engine.trigger("press", "normal", settings);
    }
    await Promise.resolve();
    expect(new Set(s.plays.map((play) => play.source))).toEqual(
      new Set([1, 2, 3, 4]),
    );
  });

  test("routes press and release independently and only haptics on press", async () => {
    const s = setup();
    await s.engine.preload({
      press: { normal: [1] },
      release: { normal: [11] },
    });
    s.engine.trigger("press", "normal", settings);
    s.engine.trigger("release", "normal", settings);
    expect(s.plays.map((play) => play.source)).toEqual([1, 11]);
    expect(s.haptics).toBe(1);
  });

  test("release without a matching sample is silent and non-fatal", async () => {
    const s = setup();
    await s.engine.preload({ press: { normal: [1] }, release: {} });
    expect(() =>
      s.engine.trigger("release", "normal", settings),
    ).not.toThrow();
    expect(s.plays).toEqual([]);
    expect(s.haptics).toBe(0);
  });

  test("mute, invalid volume and haptic controls fail safely", async () => {
    const s = setup();
    await s.engine.preload(pack);
    s.engine.trigger("press", "normal", {
      ...settings,
      soundEnabled: false,
      hapticsEnabled: false,
    });
    s.engine.trigger("press", "normal", {
      ...settings,
      volume: Number.NaN,
    });
    expect(s.plays).toHaveLength(0);
    expect(s.haptics).toBe(1);
    s.engine.trigger("press", "enter", { ...settings, volume: 7 });
    await Promise.resolve();
    expect(s.plays[0].volume).toBe(1);
  });

  test("switching themes releases old players and broken hardware does not throw", async () => {
    const s = setup();
    await s.engine.preload(pack);
    const count = s.created;
    await s.engine.preload(pack);
    expect(s.removed).toHaveLength(count);
    const broken = new AudioEngine({
      createPlayer() {
        throw new Error("unsupported");
      },
      haptic() {
        throw new Error("unsupported");
      },
    });
    await expect(broken.preload(pack)).resolves.toBeUndefined();
    expect(() => broken.trigger("press", "normal", settings)).not.toThrow();
  });

  test("an older asynchronous preload cannot replace a newer pack", async () => {
    let releaseOld: (() => void) | undefined;
    const oldPrepared = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });
    const played: number[] = [];
    const engine = new AudioEngine(
      {
        prepareSource: (source) =>
          source === 1 ? oldPrepared : Promise.resolve(),
        createPlayer: (source) => ({
          volume: 1,
          seekTo: async () => {},
          play: () => played.push(source),
          remove: () => {},
        }),
        haptic: () => {},
      },
      () => 0,
    );
    const oldLoad = engine.preload({ press: { normal: [1] }, release: {} });
    await engine.preload({ press: { normal: [2] }, release: {} });
    releaseOld?.();
    await oldLoad;
    engine.trigger("press", "normal", settings);
    expect(played).toEqual([2]);
  });

  test("player, seek, removal, and haptic failures stay non-fatal", async () => {
    const engine = new AudioEngine({
      createPlayer: () => ({
        volume: 1,
        seekTo: async () => {
          throw new Error("seek");
        },
        play: () => {
          throw new Error("play");
        },
        remove: () => {
          throw new Error("remove");
        },
      }),
      haptic: () => {
        throw new Error("haptic");
      },
    });
    await engine.preload({ press: { normal: [1] }, release: {} });
    expect(() => engine.trigger("press", "normal", settings)).not.toThrow();
    expect(() => engine.trigger("press", "normal", settings)).not.toThrow();
    expect(() => engine.unload()).not.toThrow();
  });
});

describe("monetization boundary", () => {
  test("production without native adapters never silently grants mock rewards", async () => {
    const providers = createProviders({
      development: false,
      enableMocks: true,
    });
    expect(providers.ads.mode).toBe("unavailable");
    expect(await providers.ads.showRewardedAd()).toBe("failed");
    expect((await providers.purchases.purchase("starter_pack")).status).toBe(
      "failed",
    );
    expect(await providers.purchases.loadOfferings()).toEqual([]);
  });

  test("development purchase is visibly simulated and has stable restore identity", async () => {
    const provider = new MockPurchaseProvider();
    expect((await provider.loadOfferings())[0].priceString).toContain("DEV");
    const purchase = await provider.purchase("starter_pack");
    const again = await provider.purchase("starter_pack");
    expect(purchase.status).toBe("purchased");
    expect(purchase.transactionId).toBeTruthy();
    expect(again.transactionId).toBe(purchase.transactionId);
    expect((await provider.restore()).entitlements).toEqual([
      { productId: "starter_pack", transactionId: purchase.transactionId },
    ]);
    expect((await provider.purchase("unknown")).status).toBe("failed");
  });

  test("cancelled and failed dev ads never report a reward", async () => {
    expect(await new MockRewardedAdProvider("closed").showRewardedAd()).toBe(
      "closed",
    );
    expect(await new MockRewardedAdProvider("failed").showRewardedAd()).toBe(
      "failed",
    );
    expect(await new MockRewardedAdProvider().showRewardedAd()).toBe(
      "rewarded",
    );
  });

  test("production store cancellation fails soft and duplicate receipt identity is preserved", async () => {
    const provider = new RevenueCatPurchaseProvider({
      loadOfferings: async () => [
        { id: "starter_pack", title: "Starter", priceString: "₩4,400" },
      ],
      purchase: async () => {
        throw { userCancelled: true };
      },
      restore: async () => [
        { productId: "starter_pack", transactionId: "store-123" },
      ],
    });
    expect((await provider.loadOfferings())[0].priceString).toBe("₩4,400");
    expect((await provider.purchase("starter_pack")).status).toBe("cancelled");
    expect((await provider.restore()).entitlements[0].transactionId).toBe(
      "store-123",
    );
  });
});

describe("privacy-safe analytics", () => {
  test("only allows known events and safe properties; raw answers never leave the device", () => {
    const captured: unknown[] = [];
    const track = createTracker({
      capture: (event, props) => {
        captured.push({ event, props });
      },
    });
    track("answer_completed", {
      contentId: "en-apple",
      mode: "recall",
      correct: true,
      answer: "sensitive text",
      rawAnswer: "more text",
      email: "person@example.com",
    });
    track("unknown_event", { contentId: "en-apple" });
    expect(captured).toEqual([
      {
        event: "answer_completed",
        props: { contentId: "en-apple", mode: "recall", correct: true },
      },
    ]);
  });

  test("telemetry exceptions never break gameplay", () => {
    const track = createTracker({
      capture() {
        throw new Error("network");
      },
    });
    expect(() => track("first_key_pressed")).not.toThrow();
  });
});
