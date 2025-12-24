module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./client",
            "@shared": "./shared",
            "@assets": "./assets",
          },
          extensions: [".web.tsx", ".web.ts", ".native.tsx", ".native.ts", ".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
