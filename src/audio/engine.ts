export type KeyCategory = "normal" | "space" | "enter" | "backspace";
export type KeyPhase = "press" | "release";
export type PhaseSamples = Partial<Record<KeyCategory, readonly number[]>>;
export type SoundPack = Record<KeyPhase, PhaseSamples>;

export interface KeySettings {
  soundEnabled: boolean;
  volume: number;
  hapticsEnabled: boolean;
  reducedMotion?: boolean;
}

export interface AudioPlayer {
  volume: number;
  play(): void;
  seekTo(seconds: number): Promise<void>;
  remove(): void;
}

export interface AudioDriver {
  prepareSource?(source: number): Promise<void>;
  createPlayer(source: number): AudioPlayer;
  haptic(): void | Promise<void>;
}

type VoicePool = {
  players: AudioPlayer[];
  cursor: number;
  used: Set<AudioPlayer>;
};
type CategoryPool = {
  variants: VoicePool[];
  bag: number[];
  cursor: number;
  lastVariant: number | null;
};
type PhasePools = Partial<Record<KeyCategory, CategoryPool>>;

const phases: readonly KeyPhase[] = ["press", "release"];

/** Preloaded player voices keep input synchronous and let short transients overlap. */
export class AudioEngine {
  private pools: Partial<Record<KeyPhase, PhasePools>> = {};
  private generation = 0;

  constructor(
    private readonly driver: AudioDriver,
    private readonly random = Math.random,
  ) {}

  async preload(pack: SoundPack): Promise<void> {
    this.unload();
    const generation = this.generation;
    const sources = phases.flatMap((phase) =>
      Object.values(pack[phase]).flatMap((category) => category ?? []),
    );

    await Promise.all(
      sources.map(async (source) => {
        try {
          await this.driver.prepareSource?.(source);
        } catch {
          /* A local source may still be playable without explicit preparation. */
        }
      }),
    );
    if (generation !== this.generation) return;

    const nextPools: Partial<Record<KeyPhase, PhasePools>> = {};
    for (const phase of phases) {
      const phasePools: PhasePools = {};
      for (const category of Object.keys(pack[phase]) as KeyCategory[]) {
        const categorySources = pack[phase][category] ?? [];
        const voicesPerVariant = phase === "press" ? 4 : 2;
        const variants = categorySources.map((source) => {
          const players: AudioPlayer[] = [];
          for (let voice = 0; voice < voicesPerVariant; voice++) {
            try {
              players.push(this.driver.createPlayer(source));
            } catch {
              /* Audio support is optional and must not break input. */
            }
          }
          return { players, cursor: 0, used: new Set<AudioPlayer>() };
        });
        if (variants.length) {
          phasePools[category] = {
            variants,
            bag: this.shuffle(variants.length),
            cursor: 0,
            lastVariant: null,
          };
        }
      }
      nextPools[phase] = phasePools;
    }
    this.pools = nextPools;
  }

  trigger(
    phase: KeyPhase,
    category: KeyCategory,
    settings: KeySettings,
  ): void {
    if (phase === "press" && settings.hapticsEnabled) {
      try {
        void Promise.resolve(this.driver.haptic()).catch(() => {});
      } catch {
        /* Hardware may be absent. */
      }
    }

    const volume = Number.isFinite(settings.volume)
      ? Math.max(0, Math.min(1, settings.volume))
      : 0;
    if (!settings.soundEnabled || volume === 0) return;

    const categoryPool = this.pools[phase]?.[category];
    if (!categoryPool?.variants.length) return;
    if (categoryPool.cursor >= categoryPool.bag.length) {
      categoryPool.bag = this.shuffle(categoryPool.variants.length);
      categoryPool.cursor = 0;
      if (
        categoryPool.bag.length > 1 &&
        categoryPool.bag[0] === categoryPool.lastVariant
      ) {
        [categoryPool.bag[0], categoryPool.bag[1]] = [
          categoryPool.bag[1],
          categoryPool.bag[0],
        ];
      }
    }

    const variantIndex = categoryPool.bag[categoryPool.cursor++];
    categoryPool.lastVariant = variantIndex;
    const pool = categoryPool.variants[variantIndex];
    if (!pool?.players.length) return;
    const player = pool.players[pool.cursor++ % pool.players.length];

    try {
      player.volume = volume;
      if (pool.used.has(player)) {
        void player
          .seekTo(0)
          .then(() => player.play())
          .catch(() => {});
      } else {
        pool.used.add(player);
        player.play();
      }
    } catch {
      /* Audio must never prevent the keystroke. */
    }
  }

  unload(): void {
    this.generation++;
    for (const phasePools of Object.values(this.pools)) {
      for (const categoryPool of Object.values(phasePools ?? {})) {
        for (const pool of categoryPool?.variants ?? []) {
          for (const player of pool.players) {
            try {
              player.remove();
            } catch {
              /* The platform may already have released this voice. */
            }
          }
        }
      }
    }
    this.pools = {};
  }

  private shuffle(length: number): number[] {
    const bag = Array.from({ length }, (_, index) => index);
    for (let index = bag.length - 1; index > 0; index--) {
      const candidate = Math.floor(this.random() * (index + 1));
      const swapIndex = Math.max(0, Math.min(index, candidate));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    return bag;
  }
}
