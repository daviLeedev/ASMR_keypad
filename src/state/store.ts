import { create } from "zustand";
import { getLocales } from "expo-localization";
import { initializeDatabase, loadState, saveState } from "../db";
import i18n from "../localization";
import { track } from "../analytics";
import {
  createProfile,
  type Profile,
  type Settings,
  type SessionSummary,
} from "./model";
import { parseProfile } from "./validation";
interface AppStore {
  profile: Profile;
  ready: boolean;
  loadError: boolean;
  saveError: boolean;
  lastResult: SessionSummary | null;
  hydrate: () => Promise<void>;
  update: (fn: (p: Profile) => Profile) => void;
  setSettings: (s: Partial<Settings>) => void;
  persist: () => Promise<void>;
}
let saveTail: Promise<void> = Promise.resolve();
function persistSnapshot(profile: Profile): Promise<void> {
  saveTail = saveTail.catch(() => {}).then(() => saveState(profile));
  return saveTail;
}
export const useApp = create<AppStore>((set, get) => ({
  profile: createProfile("en"),
  ready: false,
  loadError: false,
  saveError: false,
  lastResult: null,
  hydrate: async () => {
    try {
      await initializeDatabase();
      const saved = await loadState<Profile>();
      const profile = saved
        ? parseProfile(saved)
        : createProfile(getLocales()[0]?.languageCode === "ko" ? "ko" : "en");
      await i18n.changeLanguage(profile.settings.uiLanguage);
      set({ profile, ready: true, loadError: false });
      track("app_open");
    } catch {
      set({ loadError: true });
    }
  },
  update: (fn) => {
    const before = get().profile,
      p = fn(before);
    set({ profile: p });
    for (const entry of p.economy.ledger.slice(before.economy.ledger.length)) {
      if (entry.reason === "daily_goal")
        track("daily_goal_completed", {
          goalMinutes: p.settings.dailyGoalMinutes,
          tokens: entry.amount,
        });
      if (entry.reason === "streak_milestone")
        track("streak_milestone", {
          streak: p.habit.streak.currentStreak,
          tokens: entry.amount,
        });
    }
    void persistSnapshot(p)
      .then(() => set({ saveError: false }))
      .catch(() => set({ saveError: true }));
  },
  setSettings: (settings) => {
    get().update((p) => ({ ...p, settings: { ...p.settings, ...settings } }));
    if (settings.uiLanguage) void i18n.changeLanguage(settings.uiLanguage);
  },
  persist: async () => {
    try {
      await persistSnapshot(get().profile);
      set({ saveError: false });
    } catch {
      set({ saveError: true });
    }
  },
}));
