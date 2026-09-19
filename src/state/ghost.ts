import { compose, decomposeKeystrokes } from "../domain";

export interface GhostSegments {
  committed: string;
  composing: string;
  ghost: string;
}

/** Keep the target's unfinished syllable in ghost layout; overlay composing on its first character. */
export function ghostSegments(
  keys: readonly string[],
  target: string,
): GhostSegments {
  const strokes: string[] = [];
  for (const key of keys) {
    if (key === "BACKSPACE" || key === "Backspace" || key === "⌫")
      strokes.pop();
    else strokes.push(...decomposeKeystrokes(key));
  }
  const characters = [...target.normalize("NFC")];
  let committedCharacters = 0;
  let consumedStrokes = 0;
  for (const character of characters) {
    const expected = decomposeKeystrokes(character);
    if (
      !expected.every(
        (stroke, index) =>
          stroke.toLowerCase() ===
          strokes[consumedStrokes + index]?.toLowerCase(),
      )
    )
      break;
    consumedStrokes += expected.length;
    committedCharacters++;
  }
  return {
    committed: characters.slice(0, committedCharacters).join(""),
    composing: compose(strokes.slice(consumedStrokes)),
    ghost: characters.slice(committedCharacters).join(""),
  };
}
