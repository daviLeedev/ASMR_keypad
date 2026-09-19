module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          ignoreDeprecations: "6.0",
          esModuleInterop: true,
          resolveJsonModule: true,
          target: "ES2022",
          types: ["jest", "node"],
          noImplicitAny: false,
        },
      },
    ],
  },
  collectCoverageFrom: ["src/domain/**/*.ts", "src/state/model.ts"],
};
