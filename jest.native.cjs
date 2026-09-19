module.exports = {
  preset: "jest-expo",
  testMatch: ["**/tests/**/*.native.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo/.*|@react-navigation/.*|react-native-.*)/)",
  ],
};
