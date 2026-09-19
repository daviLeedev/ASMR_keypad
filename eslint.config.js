const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "package/**",
      "android/**",
      "ios/**",
      "artifacts/**",
    ],
  },
  { rules: { "import/namespace": "off" } },
]);
