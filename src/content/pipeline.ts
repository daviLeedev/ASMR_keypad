import { z } from "zod";
import type { ContentItem } from "./index";
import { sha256 } from "./sha256";
export { sha256 } from "./sha256";

const text = z
  .string()
  .transform((value) => value.trim().normalize("NFC"))
  .pipe(z.string().min(1).max(300));
const language = z
  .string()
  .transform((value) => value.toLowerCase().trim())
  .pipe(z.enum(["ko", "en"]));
export const contentItemSchema = z
  .object({
    id: text,
    kind: z.enum(["WORD", "SENTENCE"]),
    sourceLanguage: language,
    targetLanguage: language,
    prompt: text,
    canonicalAnswer: text,
    acceptedAnswers: z.array(text).min(1).max(30),
    difficulty: text,
    category: text,
    contentPackId: text,
  })
  .strict()
  .refine(
    (item) => item.sourceLanguage !== item.targetLanguage,
    "Languages must differ",
  );
export const manifestSchema = z
  .object({
    id: text,
    version: z.number().int().positive(),
    schemaVersion: z.literal(1),
    sourceLanguage: language,
    targetLanguage: language,
    itemCount: z.number().int().positive(),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .refine(
    (item) => item.sourceLanguage !== item.targetLanguage,
    "Languages must differ",
  );
export type PackManifest = z.infer<typeof manifestSchema>;
export interface ContentPack {
  manifest: PackManifest;
  items: ContentItem[];
}

export function normalizeAnswer(
  answer: string,
  targetLanguage: "en" | "ko",
): string {
  const normalized = answer.trim().normalize("NFC");
  return targetLanguage === "en" ? normalized.toLowerCase() : normalized;
}
function normalizeItems(payload: unknown): ContentItem[] {
  const parsed = z.array(contentItemSchema).min(1).max(10000).parse(payload);
  const byId = new Map<string, string>();
  const semantic = new Map<string, ContentItem>();
  for (const raw of parsed) {
    const unique = new Map(
      [raw.canonicalAnswer, ...raw.acceptedAnswers].map((answer) => [
        normalizeAnswer(answer, raw.targetLanguage),
        answer,
      ]),
    );
    const item: ContentItem = { ...raw, acceptedAnswers: [...unique.values()] };
    const previous = byId.get(item.id);
    if (previous) {
      if (previous !== JSON.stringify(item))
        throw new Error(`Conflicting duplicate ID: ${item.id}`);
      continue;
    }
    byId.set(item.id, JSON.stringify(item));
    const key = JSON.stringify([
      item.sourceLanguage,
      item.targetLanguage,
      item.kind,
      item.prompt,
      item.canonicalAnswer,
    ]);
    const duplicate = semantic.get(key);
    if (duplicate)
      duplicate.acceptedAnswers = [
        ...new Map(
          [...duplicate.acceptedAnswers, ...item.acceptedAnswers].map((a) => [
            normalizeAnswer(a, item.targetLanguage),
            a,
          ]),
        ).values(),
      ];
    else semantic.set(key, item);
  }
  return [...semantic.values()];
}
export function buildPack(metadata: unknown, payload: unknown): ContentPack {
  const base = z
    .object({
      id: text,
      version: z.number().int().positive(),
      sourceLanguage: language,
      targetLanguage: language,
    })
    .parse(metadata);
  const items = normalizeItems(payload);
  for (const item of items) {
    if (
      item.contentPackId !== base.id ||
      item.sourceLanguage !== base.sourceLanguage ||
      item.targetLanguage !== base.targetLanguage
    )
      throw new Error(`Pack direction or ID mismatch for ${item.id}`);
  }
  const manifest = manifestSchema.parse({
    ...base,
    schemaVersion: 1,
    itemCount: items.length,
    checksum: sha256(JSON.stringify(items)),
  });
  return { manifest, items };
}
export function validatePack(input: unknown): ContentPack {
  const raw = z
    .object({ manifest: manifestSchema, items: z.array(z.unknown()) })
    .strict()
    .parse(input);
  const rebuilt = buildPack(raw.manifest, raw.items);
  if (raw.manifest.itemCount !== rebuilt.items.length)
    throw new Error("Content pack item count mismatch");
  if (raw.manifest.checksum !== rebuilt.manifest.checksum)
    throw new Error("Content pack checksum mismatch");
  return rebuilt;
}
