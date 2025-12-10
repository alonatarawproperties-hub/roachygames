const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const nativeOnlyModules = [
  "react-native-maps",
  "@reown/appkit-react-native",
  "@reown/appkit-solana-react-native",
  "@walletconnect/react-native-compat",
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && nativeOnlyModules.some(mod => moduleName.startsWith(mod))) {
    return {
      type: "empty",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
