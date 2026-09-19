import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { createRepository } from "./repository";
import * as schema from "./schema";

let repositoryPromise: Promise<ReturnType<typeof createRepository>> | undefined;
function repository() {
  if (!repositoryPromise)
    repositoryPromise = SQLite.openDatabaseAsync("keylingo.db")
      .then((database) => {
        // Expose a typed ORM over the same primary native database connection.
        orm = drizzle(database, { schema });
        return createRepository(database);
      })
      .catch((error) => {
        repositoryPromise = undefined;
        throw error;
      });
  return repositoryPromise;
}
export let orm: ReturnType<typeof drizzle<typeof schema>> | undefined;
export async function initializeDatabase(): Promise<void> {
  await (await repository()).initialize();
}
export async function loadState<T>(): Promise<T | null> {
  return (await repository()).loadState<T>();
}
export async function saveState<T>(state: T): Promise<void> {
  return (await repository()).saveState(state);
}
export async function importContentPack(pack: unknown): Promise<void> {
  return (await repository()).importPack(pack);
}
