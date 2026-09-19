import { createAudioPlayer, preload, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { AudioEngine, type KeyCategory, type KeySettings } from "./engine";
import { soundPacks } from "./packs";

export type { KeyCategory, KeySettings } from "./engine";
const engine = new AudioEngine({
  prepareSource: (source) => preload(source),
  createPlayer: (source) =>
    createAudioPlayer(source, { keepAudioSessionActive: true }),
  haptic: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
});
let activeTheme = "";
let preloadRequest = 0;
export async function preloadTheme(themeId: string): Promise<void> {
  const resolved = soundPacks[themeId] ? themeId : "starter";
  if (activeTheme === resolved) return;
  activeTheme = "";
  const request = ++preloadRequest;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch {
    /* Browser/native support varies. */
  }
  if (request !== preloadRequest) return;
  await engine.preload(soundPacks[resolved]);
  if (request === preloadRequest) activeTheme = resolved;
}
export function playKey(category: KeyCategory, settings: KeySettings): void {
  engine.play(category, settings);
}
export function unloadAudio(): void {
  preloadRequest++;
  activeTheme = "";
  engine.unload();
}
