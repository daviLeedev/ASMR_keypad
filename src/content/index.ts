import { words, sentences, type SeedPair } from "../../content/seed";
export interface ContentItem {
  id: string;
  kind: "WORD" | "SENTENCE";
  sourceLanguage: "ko" | "en";
  targetLanguage: "ko" | "en";
  prompt: string;
  canonicalAnswer: string;
  acceptedAnswers: string[];
  difficulty: string;
  category: string;
  contentPackId: string;
}
function expand(pairs: SeedPair[], kind: ContentItem["kind"]): ContentItem[] {
  return pairs.flatMap(
    ([ko, en, category, enAliases = [], koAliases = []], index) =>
      (["en", "ko"] as const).map((targetLanguage) => {
        const sourceLanguage = targetLanguage === "en" ? "ko" : "en";
        const canonicalAnswer = targetLanguage === "en" ? en : ko;
        const koreanPrompts: Record<string, string> = {
          tea: "차 (음료)",
          horse: "말 (동물)",
          snow: "눈 (날씨)",
          boat: "배 (탈것)",
          night: "밤 (시간)",
          rice: "밥 (익힌 쌀)",
        };
        const englishPrompts: Record<string, string> = {
          rice: "cooked rice",
          fish: "fish (food)",
          chicken: "chicken (bird)",
          goodbye: "goodbye (to someone leaving)",
        };
        return {
          id: `${sourceLanguage}-${targetLanguage}-${kind.toLowerCase()}-${String(index + 1).padStart(3, "0")}`,
          kind,
          sourceLanguage,
          targetLanguage,
          prompt:
            targetLanguage === "en"
              ? (koreanPrompts[en] ?? ko)
              : (englishPrompts[en] ?? en),
          canonicalAnswer,
          acceptedAnswers: [
            ...new Set([
              canonicalAnswer,
              ...(targetLanguage === "en" ? enAliases : koAliases),
            ]),
          ],
          difficulty: "A1",
          category,
          contentPackId: `${sourceLanguage}-${targetLanguage}-core`,
        };
      }),
  );
}
export const seedItems: ContentItem[] = [
  ...expand(words, "WORD"),
  ...expand(sentences, "SENTENCE"),
];
