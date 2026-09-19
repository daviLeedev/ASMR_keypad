import { decomposeKeystrokes } from "./hangul";
import { AnswerOptions, TypingState } from "./types";

export function normalizeAnswer(
  text: string,
  options: AnswerOptions = {},
): string {
  let normalized = text.normalize("NFC").trim();
  if (!options.caseSensitive && options.language !== "ko")
    normalized = normalized.toLowerCase();
  if (options.punctuation === "ignore-terminal")
    normalized = normalized.replace(/[.!?。！？]+$/u, "").trimEnd();
  return normalized;
}

export function matchesAnswer(
  input: string,
  acceptedAnswers: readonly string[],
  options: AnswerOptions = {},
): boolean {
  const normalized = normalizeAnswer(input, options);
  return (
    normalized.length > 0 &&
    acceptedAnswers.some(
      (answer) => normalizeAnswer(answer, options) === normalized,
    )
  );
}

export function isValidPrefix(
  input: string,
  acceptedAnswers: readonly string[],
  options: AnswerOptions = {},
): boolean {
  const prefix = decomposeKeystrokes(normalizeAnswer(input, options)).join("");
  return acceptedAnswers.some((answer) =>
    decomposeKeystrokes(normalizeAnswer(answer, options))
      .join("")
      .startsWith(prefix),
  );
}

export function updateTyping(
  state: TypingState,
  input: string,
  acceptedAnswers: readonly string[],
  options: AnswerOptions = {},
): TypingState {
  const invalid = !isValidPrefix(input, acceptedAnswers, options);
  return {
    input,
    invalid,
    mistakes: state.mistakes + (invalid && !state.invalid ? 1 : 0),
  };
}
