import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRepository,
  DatabaseDriver,
  SqlValue,
} from "../src/db/repository";
import { buildPack } from "../src/content/pipeline";
import { createMastery } from "../src/domain/mastery";

// Native SQLite SQL executes in Node's real SQLite engine. No SQL calls are mocked.
let sqlite: typeof import("node:sqlite") | undefined;
try {
  sqlite = createRequire(__filename)("node:sqlite");
} catch {
  /* tested by a flagged child below */
}
const realSqliteTest = sqlite ? test : test.skip;
function openDriver(filename = ":memory:"): {
  db: DatabaseDriver;
  close: () => void;
} {
  const connection = new sqlite!.DatabaseSync(filename);
  return {
    db: {
      execAsync: async (sql) => {
        connection.exec(sql);
      },
      runAsync: async (sql, ...params) =>
        connection.prepare(sql).run(...params),
      getFirstAsync: async <T>(sql: string, ...params: SqlValue[]) =>
        (connection.prepare(sql).get(...params) as T) ?? null,
      getAllAsync: async <T>(sql: string, ...params: SqlValue[]) =>
        connection.prepare(sql).all(...params) as T[],
    },
    close: () => connection.close(),
  };
}
describe("SQLite repository", () => {
  test("runs native SQLite integration in a compatible child when the Jest runtime lacks SQLite", () => {
    if (!sqlite)
      expect(() =>
        execFileSync(
          process.execPath,
          [
            "--experimental-sqlite",
            "node_modules/jest/bin/jest.js",
            "--runInBand",
            "tests/db.test.ts",
          ],
          { cwd: process.cwd(), stdio: "pipe" },
        ),
      ).not.toThrow();
  });
  realSqliteTest(
    "migrates, installs content once, and atomically survives reopen-style reads",
    async () => {
      const { db, close } = openDriver();
      try {
        const repo = createRepository(db);
        await repo.initialize();
        await repo.initialize();
        expect(
          (await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) AS count FROM content_item",
          ))!.count,
        ).toBeGreaterThan(150);
        await Promise.all([
          repo.saveState({ count: 1 }),
          repo.saveState({ count: 2 }),
        ]);
        expect(await repo.loadState()).toEqual({ count: 2 });
        const other = createRepository(db);
        expect(await other.loadState()).toEqual({ count: 2 });
      } finally {
        close();
      }
    },
  );
  realSqliteTest(
    "rejects pack downgrades and preserves content on invalid imports",
    async () => {
      const { db, close } = openDriver();
      try {
        const repo = createRepository(db);
        await repo.initialize();
        const items = [
          {
            id: "import-one",
            kind: "WORD",
            sourceLanguage: "ko",
            targetLanguage: "en",
            prompt: "물",
            canonicalAnswer: "water",
            acceptedAnswers: ["water"],
            difficulty: "A1",
            category: "food",
            contentPackId: "import",
          },
        ];
        const pack = buildPack(
          {
            id: "import",
            version: 2,
            sourceLanguage: "ko",
            targetLanguage: "en",
          },
          items,
        );
        await repo.importPack(pack);
        await expect(
          repo.importPack(buildPack({ ...pack.manifest, version: 1 }, items)),
        ).rejects.toThrow(/downgrade/i);
        await expect(repo.importPack({ ...pack, items: [] })).rejects.toThrow();
        expect(
          await db.getFirstAsync(
            "SELECT canonical_answer FROM content_item WHERE id = ?",
            "import-one",
          ),
        ).toEqual({ canonical_answer: "water" });
      } finally {
        close();
      }
    },
  );
  realSqliteTest(
    "retains local progress after closing and reopening a file database",
    async () => {
      const directory = mkdtempSync(join(tmpdir(), "keylingo-db-"));
      let connection = openDriver(join(directory, "progress.db"));
      try {
        await createRepository(connection.db).saveState({
          settings: { uiLanguage: "ko", tutorialCompleted: true },
          best: { speed: 71 },
        });
        connection.close();
        connection = openDriver(join(directory, "progress.db"));
        expect(await createRepository(connection.db).loadState()).toEqual({
          settings: { uiLanguage: "ko", tutorialCompleted: true },
          best: { speed: 71 },
        });
        expect(
          await connection.db.getFirstAsync("PRAGMA user_version"),
        ).toEqual({ user_version: 1 });
      } finally {
        connection.close();
        for (const file of readdirSync(directory))
          unlinkSync(join(directory, file));
        rmdirSync(directory);
      }
    },
  );
  realSqliteTest(
    "projects progress and ledger once, and rolls back a failed save without poisoning the queue",
    async () => {
      const { db, close } = openDriver();
      try {
        const repo = createRepository(db);
        const state = {
          xp: 50,
          selectedThemeId: "starter",
          economy: {
            balance: 10,
            ledger: [
              {
                id: "grant-1",
                reason: "session",
                amount: 10,
                balanceAfter: 10,
                referenceId: "session-1",
                createdAt: "2026-09-19T00:00:00Z",
              },
            ],
            unlockedThemeIds: ["starter"],
            rewardedAdsByDate: {},
          },
          mastery: {
            "ko-en-word-001": {
              ...createMastery("ko-en-word-001"),
              stage: "RECALL",
              masteryScore: 20,
              nextReviewAt: "2026-09-18T00:00:00Z",
            },
            "ko-en-word-002": {
              ...createMastery("ko-en-word-002"),
              stage: "GUIDED",
            },
          },
          settings: { uiLanguage: "ko", reminderEnabled: false },
          habit: {
            daily: {
              "2026-09-19": {
                date: "2026-09-19",
                activeStudySeconds: 300,
                goalSeconds: 300,
                goalCompleted: true,
              },
            },
            streak: {
              currentStreak: 1,
              longestStreak: 1,
              lastCompletedDate: "2026-09-19",
              streakFreezeCount: 0,
            },
          },
        };
        await repo.saveState(state);
        await repo.saveState(state);
        expect(
          await db.getFirstAsync(
            "SELECT COUNT(*) AS count FROM economy_ledger",
          ),
        ).toEqual({ count: 1 });
        expect(
          await db.getFirstAsync("SELECT token_balance FROM user_profile"),
        ).toEqual({ token_balance: 10 });
        expect(await repo.dueItems("en", "2026-09-19T00:00:00Z")).toEqual([
          { id: "ko-en-word-001", stage: "RECALL", mastery_score: 20 },
        ]);
        await expect(
          repo.saveState({
            ...state,
            economy: { ...state.economy, balance: -1 },
          }),
        ).rejects.toThrow();
        expect(await repo.loadState()).toEqual(state);
        await repo.saveState({ ...state, xp: 100 });
        expect(await db.getFirstAsync("SELECT xp FROM user_profile")).toEqual({
          xp: 100,
        });
      } finally {
        close();
      }
    },
  );
  realSqliteTest(
    "rejects a pack update that silently changes learning direction",
    async () => {
      const { db, close } = openDriver();
      try {
        const repo = createRepository(db);
        await repo.initialize();
        const item = {
          id: "direction-one",
          kind: "WORD",
          sourceLanguage: "ko",
          targetLanguage: "en",
          prompt: "물",
          canonicalAnswer: "water",
          acceptedAnswers: ["water"],
          difficulty: "A1",
          category: "food",
          contentPackId: "direction",
        };
        await repo.importPack(
          buildPack(
            {
              id: "direction",
              version: 1,
              sourceLanguage: "ko",
              targetLanguage: "en",
            },
            [item],
          ),
        );
        const update = buildPack(
          {
            id: "direction",
            version: 2,
            sourceLanguage: "en",
            targetLanguage: "ko",
          },
          [
            {
              ...item,
              sourceLanguage: "en",
              targetLanguage: "ko",
              prompt: "water",
              canonicalAnswer: "물",
              acceptedAnswers: ["물"],
            },
          ],
        );
        await expect(repo.importPack(update)).rejects.toThrow(/direction/i);
      } finally {
        close();
      }
    },
  );
  realSqliteTest(
    "avoids rewriting unchanged history on each active-time heartbeat",
    async () => {
      const { db, close } = openDriver();
      let writes = 0;
      const driver = {
        ...db,
        runAsync: async (sql: string, ...params: SqlValue[]) => {
          writes++;
          return db.runAsync(sql, ...params);
        },
      };
      try {
        const repo = createRepository(driver);
        const state = {
          xp: 0,
          economy: {
            balance: 0,
            ledger: [],
            unlockedThemeIds: ["starter"],
            rewardedAdsByDate: {},
          },
          settings: { uiLanguage: "en" },
          mastery: {},
          habit: {
            daily: {
              "2026-09-19": {
                date: "2026-09-19",
                activeStudySeconds: 10,
                goalSeconds: 300,
                goalCompleted: false,
              },
            },
            streak: {
              currentStreak: 0,
              longestStreak: 0,
              streakFreezeCount: 0,
            },
          },
          sessions: [],
        };
        await repo.saveState(state);
        writes = 0;
        await repo.saveState({
          ...state,
          habit: {
            ...state.habit,
            daily: {
              "2026-09-19": {
                ...state.habit.daily["2026-09-19"],
                activeStudySeconds: 11,
              },
            },
          },
        });
        expect(writes).toBeLessThanOrEqual(3);
        expect(
          await db.getFirstAsync(
            "SELECT active_study_seconds FROM daily_progress",
          ),
        ).toEqual({ active_study_seconds: 11 });
      } finally {
        close();
      }
    },
  );
});
