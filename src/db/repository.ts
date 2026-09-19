import { seedItems } from "../content";
import {
  buildPack,
  validatePack,
  normalizeAnswer,
  type ContentPack,
} from "../content/pipeline";
import { migrations } from "./migrations";
import { projectState } from "./stateProjection";
export type SqlValue = string | number | null;
export interface DatabaseDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
}
const queues = new WeakMap<DatabaseDriver, Promise<unknown>>();
export function createRepository(db: DatabaseDriver) {
  let initialized: Promise<void> | undefined;
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const pending = (queues.get(db) ?? Promise.resolve()).then(operation);
    queues.set(
      db,
      pending.catch(() => undefined),
    );
    return pending;
  }
  async function transaction(operation: () => Promise<void>): Promise<void> {
    await db.execAsync("BEGIN IMMEDIATE");
    try {
      await operation();
      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  }
  async function install(pack: ContentPack): Promise<void> {
    const manifest = pack.manifest;
    const installed = await db.getFirstAsync<{
      version: number;
      checksum: string;
      source_language: string;
      target_language: string;
    }>(
      "SELECT version,checksum,source_language,target_language FROM content_pack WHERE id=?",
      manifest.id,
    );
    if (
      installed &&
      (installed.source_language !== manifest.sourceLanguage ||
        installed.target_language !== manifest.targetLanguage)
    )
      throw new Error("A content pack cannot change learning direction");
    if (installed && installed.version > manifest.version)
      throw new Error("Content pack downgrade rejected");
    if (installed?.version === manifest.version) {
      if (installed.checksum !== manifest.checksum)
        throw new Error("A changed pack requires a new version");
      return;
    }
    await db.runAsync(
      "INSERT INTO content_pack VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,schema_version=excluded.schema_version,checksum=excluded.checksum,item_count=excluded.item_count,installed_at=excluded.installed_at",
      manifest.id,
      manifest.version,
      manifest.schemaVersion,
      manifest.checksum,
      manifest.sourceLanguage,
      manifest.targetLanguage,
      manifest.itemCount,
      new Date().toISOString(),
    );
    await db.runAsync(
      "UPDATE content_item SET active=0 WHERE content_pack_id=?",
      manifest.id,
    );
    for (const item of pack.items) {
      const owner = await db.getFirstAsync<{ content_pack_id: string }>(
        "SELECT content_pack_id FROM content_item WHERE id=?",
        item.id,
      );
      if (owner && owner.content_pack_id !== manifest.id)
        throw new Error("Content item ID belongs to a different pack");
      await db.runAsync(
        "INSERT INTO content_item VALUES (?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,prompt=excluded.prompt,canonical_answer=excluded.canonical_answer,difficulty=excluded.difficulty,category=excluded.category,active=1",
        item.id,
        item.kind,
        item.sourceLanguage,
        item.targetLanguage,
        item.prompt,
        item.canonicalAnswer,
        item.difficulty,
        item.category,
        item.contentPackId,
      );
      await db.runAsync(
        "DELETE FROM accepted_answer WHERE content_item_id=?",
        item.id,
      );
      for (const [index, answer] of item.acceptedAnswers.entries())
        await db.runAsync(
          "INSERT INTO accepted_answer VALUES (?,?,?,?,?)",
          `${item.id}:${index}`,
          item.id,
          answer,
          normalizeAnswer(answer, item.targetLanguage),
          index,
        );
    }
  }
  function initialize(): Promise<void> {
    if (!initialized)
      initialized = enqueue(async () => {
        await db.execAsync("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
        const row = await db.getFirstAsync<{ user_version: number }>(
          "PRAGMA user_version",
        );
        if (
          (row?.user_version ?? 0) > migrations[migrations.length - 1].version
        )
          throw new Error("Database is from a newer app version");
        for (const migration of migrations)
          if ((row?.user_version ?? 0) < migration.version)
            await transaction(async () => {
              await db.execAsync(migration.sql);
              await db.execAsync(`PRAGMA user_version=${migration.version}`);
            });
        for (const targetLanguage of ["en", "ko"] as const) {
          const sourceLanguage = targetLanguage === "en" ? "ko" : "en";
          const pack = buildPack(
            {
              id: `${sourceLanguage}-${targetLanguage}-core`,
              version: 1,
              sourceLanguage,
              targetLanguage,
            },
            seedItems.filter((item) => item.targetLanguage === targetLanguage),
          );
          const installed = await db.getFirstAsync<{ version: number }>(
            "SELECT version FROM content_pack WHERE id=?",
            pack.manifest.id,
          );
          if (!installed || installed.version <= pack.manifest.version)
            await transaction(() => install(pack));
        }
      }).catch((error) => {
        initialized = undefined;
        throw error;
      });
    return initialized;
  }
  return {
    initialize,
    async importPack(input: unknown) {
      const pack = validatePack(input);
      await initialize();
      await enqueue(() => transaction(() => install(pack)));
    },
    async loadState<T>(): Promise<T | null> {
      await initialize();
      return enqueue(async () => {
        const row = await db.getFirstAsync<{ payload: string }>(
          "SELECT payload FROM app_state WHERE id=1",
        );
        return row ? (JSON.parse(row.payload) as T) : null;
      });
    },
    async saveState<T>(state: T): Promise<void> {
      const payload = JSON.stringify(state);
      if (payload === undefined)
        throw new Error("App state must be JSON serializable");
      await initialize();
      await enqueue(() =>
        transaction(async () => {
          const prior = await db.getFirstAsync<{ payload: string }>(
            "SELECT payload FROM app_state WHERE id=1",
          );
          await projectState(
            db,
            JSON.parse(payload),
            prior ? JSON.parse(prior.payload) : undefined,
          );
          await db.runAsync(
            "INSERT INTO app_state VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
            payload,
            new Date().toISOString(),
          );
        }),
      );
    },
    async dueItems(
      targetLanguage: "ko" | "en",
      now = new Date().toISOString(),
      limit = 20,
    ) {
      await initialize();
      return enqueue(() =>
        db.getAllAsync<{ id: string; stage: string; mastery_score: number }>(
          "SELECT c.id,m.stage,m.mastery_score FROM content_item c JOIN mastery m ON m.content_item_id=c.id WHERE c.active=1 AND c.target_language=? AND m.stage IN ('RECALL','SPEED','MASTERED') AND (m.next_review_at IS NULL OR m.next_review_at<=?) ORDER BY m.mastery_score ASC,m.next_review_at ASC LIMIT ?",
          targetLanguage,
          now,
          limit,
        ),
      );
    },
  };
}
