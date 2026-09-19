const INITIALS = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const MEDIALS = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const FINALS = [
  "",
  ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ",
];
const VOWELS: Record<string, string> = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
};
const CODAS: Record<string, string> = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
};
const SPLIT: Record<string, string[]> = Object.fromEntries(
  Object.entries({ ...VOWELS, ...CODAS }).map(([keys, result]) => [
    result,
    [...keys],
  ]),
);
const KEYBOARD: Record<string, string> = Object.fromEntries(
  [..."rRseEfaqQtTdwWczxvgkoiOjpuPhynbml"].map((key, i) => [
    key,
    [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ"][
      i
    ],
  ]),
);

export function dubeolsikKey(key: string): string {
  return KEYBOARD[key] ?? KEYBOARD[key.toLowerCase()] ?? key;
}

function syllable(initial: string, medial: string, final = ""): string {
  return String.fromCharCode(
    0xac00 +
      (INITIALS.indexOf(initial) * 21 + MEDIALS.indexOf(medial)) * 28 +
      FINALS.indexOf(final),
  );
}

function parts(char: string): [string, string, string] | undefined {
  const offset = char.charCodeAt(0) - 0xac00;
  if (offset < 0 || offset >= 11172) return undefined;
  return [
    INITIALS[Math.floor(offset / 588)],
    MEDIALS[Math.floor(offset / 28) % 21],
    FINALS[offset % 28],
  ];
}

/** Physical Jamo strokes, retaining shift-consonants as one keystroke. */
export function decomposeKeystrokes(text: string): string[] {
  const result: string[] = [];
  for (const char of text.normalize("NFC")) {
    const parsed = parts(char);
    if (parsed) {
      result.push(parsed[0], ...(SPLIT[parsed[1]] ?? [parsed[1]]));
      if (parsed[2]) result.push(...(SPLIT[parsed[2]] ?? [parsed[2]]));
    } else {
      const code = char.charCodeAt(0);
      const compatibility =
        code >= 0x1100 && code <= 0x1112
          ? INITIALS[code - 0x1100]
          : code >= 0x1161 && code <= 0x1175
            ? MEDIALS[code - 0x1161]
            : code >= 0x11a8 && code <= 0x11c2
              ? FINALS[code - 0x11a7]
              : char;
      result.push(...(SPLIT[compatibility] ?? [compatibility]));
    }
  }
  return result;
}

/** Replaying the raw stroke history also makes Backspace exact and deterministic. */
export function compose(keys: readonly string[]): string {
  const strokes: string[] = [];
  for (const key of keys) {
    if (key === "Backspace" || key === "⌫") strokes.pop();
    else strokes.push(...decomposeKeystrokes(key));
  }
  const output: string[] = [];
  for (const key of strokes) {
    const previous = output[output.length - 1];
    if (!previous) {
      output.push(key);
      continue;
    }
    const parsed = parts(previous);
    if (MEDIALS.includes(key)) {
      if (parsed) {
        const [initial, medial, final] = parsed;
        if (final) {
          const split = SPLIT[final] ?? ["", final];
          output[output.length - 1] = syllable(initial, medial, split[0]);
          output.push(syllable(split[1], key));
        } else if (VOWELS[medial + key])
          output[output.length - 1] = syllable(initial, VOWELS[medial + key]);
        else output.push(key);
      } else if (INITIALS.includes(previous))
        output[output.length - 1] = syllable(previous, key);
      else if (VOWELS[previous + key])
        output[output.length - 1] = VOWELS[previous + key];
      else output.push(key);
    } else if (parsed && FINALS.includes(key) && key !== "") {
      const [initial, medial, final] = parsed;
      if (!final) output[output.length - 1] = syllable(initial, medial, key);
      else if (CODAS[final + key])
        output[output.length - 1] = syllable(
          initial,
          medial,
          CODAS[final + key],
        );
      else output.push(key);
    } else output.push(key);
  }
  return output.join("").normalize("NFC");
}
