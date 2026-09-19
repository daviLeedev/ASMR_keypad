// Web preview persistence. Native builds use Expo SQLite via index.ts.
const STORAGE_KEY = "keylingo.state.v1";
export async function initializeDatabase(): Promise<void> {
  /* localStorage opens lazily */
}
export async function loadState<T>(): Promise<T | null> {
  if (typeof localStorage === "undefined") return null;
  const payload = localStorage.getItem(STORAGE_KEY);
  if (!payload) return null;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error("Saved progress could not be read.");
  }
}
export async function saveState<T>(state: T): Promise<void> {
  if (typeof localStorage === "undefined")
    throw new Error("Browser storage is unavailable");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
