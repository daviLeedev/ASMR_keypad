export const colors = {
  background: "#F7FBFF",
  surface: "#FFFFFF",
  primary: "#61B9FF",
  primaryStrong: "#267FC4",
  navy: "#153975",
  secondary: "#6B7992",
  border: "#D5E5F5",
  success: "#208566",
  reward: "#FFC640",
  error: "#C54050",
  ghost: "#9BAFC5",
};
export interface KeyboardSurfaceTokens {
  deckTop: string;
  deckSide: string;
  keyTop: string;
  keySide: string;
  pressedTop: string;
  pressedSide: string;
  legend: string;
  glow: string;
}
export const keyboardLayout = {
  sideInset: 8,
  keyHeight: 42,
  minKeyHeight: 39,
  columnGap: 3,
  rowGap: 8,
  maxWidth: 560,
} as const;
export const motion = {
  keyTravel: 7,
  pressMs: 70,
  releaseMs: 105,
  feedbackMs: 520,
} as const;
export interface KeyboardTheme {
  id: string;
  name: string;
  descriptor: string;
  audioIdentity: string;
  audioTraits: readonly [string, string, string];
  base: string;
  key: string;
  ink: string;
  accent: string;
  surface: KeyboardSurfaceTokens;
  tokenCost: number;
  unlockLevel: number;
}
export const themes: KeyboardTheme[] = [
  {
    id: "starter",
    name: "Starter",
    descriptor: "Light · Balanced",
    audioIdentity: "Brown Tactile",
    audioTraits: ["Tactile", "Rounded", "Medium"],
    base: "#E0EDF8",
    key: "#FFFFFF",
    ink: "#153975",
    accent: "#A3D5FF",
    surface: {
      deckTop: "#E0EDF8",
      deckSide: "#A9C8E1",
      keyTop: "#FFFFFF",
      keySide: "#B4CEE3",
      pressedTop: "#A3D5FF",
      pressedSide: "#69A5D6",
      legend: "#153975",
      glow: "#61B9FF",
    },
    tokenCost: 0,
    unlockLevel: 1,
  },
  {
    id: "clicky",
    name: "Clicky Blue",
    descriptor: "Crisp · Bright",
    audioIdentity: "Blue Click",
    audioTraits: ["Clicky", "Bright", "Crisp"],
    base: "#D3E5F6",
    key: "#EAF6FF",
    ink: "#16497C",
    accent: "#61B9FF",
    surface: {
      deckTop: "#D3E5F6",
      deckSide: "#8DB5D7",
      keyTop: "#EAF6FF",
      keySide: "#A0C7E6",
      pressedTop: "#61B9FF",
      pressedSide: "#2F88CC",
      legend: "#16497C",
      glow: "#38A6FF",
    },
    tokenCost: 300,
    unlockLevel: 1,
  },
  {
    id: "creamy",
    name: "Creamy",
    descriptor: "Soft · Rounded",
    audioIdentity: "Cream Linear",
    audioTraits: ["Linear", "Rounded", "Smooth"],
    base: "#E9E0CF",
    key: "#FFFAED",
    ink: "#665138",
    accent: "#E5C492",
    surface: {
      deckTop: "#E9E0CF",
      deckSide: "#C9B99D",
      keyTop: "#FFFAED",
      keySide: "#D9C9A9",
      pressedTop: "#E5C492",
      pressedSide: "#B68B51",
      legend: "#665138",
      glow: "#F4C56F",
    },
    tokenCost: 400,
    unlockLevel: 2,
  },
  {
    id: "thock",
    name: "Deep Thock",
    descriptor: "Deep · Resonant",
    audioIdentity: "Deep Thock",
    audioTraits: ["Tactile", "Deep", "Resonant"],
    base: "#293A49",
    key: "#415A69",
    ink: "#F5F9F8",
    accent: "#78BAAE",
    surface: {
      deckTop: "#293A49",
      deckSide: "#17252E",
      keyTop: "#415A69",
      keySide: "#263D49",
      pressedTop: "#78BAAE",
      pressedSide: "#3F8177",
      legend: "#F5F9F8",
      glow: "#78E0CC",
    },
    tokenCost: 600,
    unlockLevel: 3,
  },
  {
    id: "retro",
    name: "Retro",
    descriptor: "Warm · Vintage",
    audioIdentity: "Buckling Spring",
    audioTraits: ["Spring", "Metallic", "Vintage"],
    base: "#DDDACE",
    key: "#F5F0E5",
    ink: "#495B54",
    accent: "#E8A385",
    surface: {
      deckTop: "#DDDACE",
      deckSide: "#AFA99A",
      keyTop: "#F5F0E5",
      keySide: "#C7BDAB",
      pressedTop: "#E8A385",
      pressedSide: "#B36E54",
      legend: "#495B54",
      glow: "#F6A479",
    },
    tokenCost: 700,
    unlockLevel: 3,
  },
  {
    id: "silent",
    name: "Silent",
    descriptor: "Quiet · Minimal",
    audioIdentity: "Quiet Cloud",
    audioTraits: ["Damped", "Soft", "Quiet"],
    base: "#E5E9EC",
    key: "#FAFAFA",
    ink: "#505C69",
    accent: "#BECBD5",
    surface: {
      deckTop: "#E5E9EC",
      deckSide: "#BBC4CB",
      keyTop: "#FAFAFA",
      keySide: "#CFD7DC",
      pressedTop: "#BECBD5",
      pressedSide: "#8FA0AD",
      legend: "#505C69",
      glow: "#B9D5E5",
    },
    tokenCost: 500,
    unlockLevel: 2,
  },
  {
    id: "sky",
    name: "Sky 65",
    descriptor: "Airy · Clear",
    audioIdentity: "Airy Linear",
    audioTraits: ["Linear", "Airy", "Clear"],
    base: "#C5DEF5",
    key: "#F2FAFF",
    ink: "#23528B",
    accent: "#94C6F5",
    surface: {
      deckTop: "#C5DEF5",
      deckSide: "#7FACE0",
      keyTop: "#F2FAFF",
      keySide: "#AACCEB",
      pressedTop: "#94C6F5",
      pressedSide: "#5A98CE",
      legend: "#23528B",
      glow: "#66B8FF",
    },
    tokenCost: 1000,
    unlockLevel: 5,
  },
  {
    id: "midnight",
    name: "Midnight",
    descriptor: "Low · Smooth",
    audioIdentity: "Heavy Linear",
    audioTraits: ["Linear", "Low", "Weighty"],
    base: "#202B44",
    key: "#354263",
    ink: "#EAF3FF",
    accent: "#9AACE5",
    surface: {
      deckTop: "#202B44",
      deckSide: "#111827",
      keyTop: "#354263",
      keySide: "#1F2A43",
      pressedTop: "#9AACE5",
      pressedSide: "#6778B8",
      legend: "#EAF3FF",
      glow: "#A6B8FF",
    },
    tokenCost: 1500,
    unlockLevel: 7,
  },
];
export const getTheme = (id: string) =>
  themes.find((t) => t.id === id) ?? themes[0];
