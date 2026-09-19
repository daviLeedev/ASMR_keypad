export interface AudioCredit {
  themeId: string;
  identity: string;
  source: string;
  license: string;
  author: string;
}

export const audioCredits: readonly AudioCredit[] = [
  {
    themeId: "starter",
    identity: "Brown Tactile",
    source: "MechSim · MX Brown - Full Travel",
    license: "MIT",
    author: "Connor Langan and MechSim contributors",
  },
  {
    themeId: "clicky",
    identity: "Blue Click",
    source: "kbsim · Kailh Box Navy",
    license: "MIT",
    author: "Thomas Lai",
  },
  {
    themeId: "creamy",
    identity: "Cream Linear",
    source: "kbsim · NovelKeys Cream",
    license: "MIT",
    author: "Thomas Lai",
  },
  {
    themeId: "thock",
    identity: "Deep Thock",
    source: "kbsim · Holy Panda",
    license: "MIT",
    author: "Thomas Lai",
  },
  {
    themeId: "retro",
    identity: "Buckling Spring",
    source: "kbsim · IBM Buckling Spring",
    license: "MIT",
    author: "Thomas Lai",
  },
  {
    themeId: "sky",
    identity: "Airy Linear",
    source: "kbsim · Turquoise Tealios",
    license: "MIT",
    author: "Thomas Lai",
  },
  {
    themeId: "midnight",
    identity: "Heavy Linear",
    source: "kbsim · Gateron Ink Black",
    license: "MIT",
    author: "Thomas Lai",
  },
] as const;
