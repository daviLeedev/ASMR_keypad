export type KeyCategory = "normal" | "space" | "enter" | "backspace";
export type SoundPack = Record<KeyCategory, readonly number[]>;
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
type Pool = { players: AudioPlayer[]; cursor: number; used: Set<AudioPlayer> };

/** Preloaded per-sample voices keep rapid key presses independent. No disk I/O on press. */
export class AudioEngine {
  private pools: Partial<Record<KeyCategory, Pool[]>> = {};
  private generation = 0;
  constructor(
    private readonly driver: AudioDriver,
    private readonly random = Math.random,
  ) {}

  async preload(pack: SoundPack): Promise<void> {
    this.unload();
    const generation = this.generation;
    await Promise.all(
      Object.values(pack)
        .flat()
        .map(async (source) => {
          try {
            await this.driver.prepareSource?.(source);
          } catch {
            /* Still try local playback. */
          }
        }),
    );
    if (generation !== this.generation) return;
    for (const category of Object.keys(pack) as KeyCategory[]) {
      this.pools[category] = pack[category].map((source) => {
        const players: AudioPlayer[] = [];
        for (let voice = 0; voice < 4; voice++) {
          try {
            players.push(this.driver.createPlayer(source));
          } catch {
            /* Unsupported audio is optional. */
          }
        }
        return { players, cursor: 0, used: new Set() };
      });
    }
  }

  play(category: KeyCategory, settings: KeySettings): void {
    if (settings.hapticsEnabled) {
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
    const variants = this.pools[category];
    if (!variants?.length) return;
    const variant = Math.min(
      variants.length - 1,
      Math.max(0, Math.floor(this.random() * variants.length)),
    );
    const pool = variants[variant];
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
    for (const variants of Object.values(this.pools)) {
      for (const pool of variants ?? []) {
        for (const player of pool.players) {
          try {
            player.remove();
          } catch {
            /* Already released by the platform. */
          }
        }
      }
    }
    this.pools = {};
  }
}
