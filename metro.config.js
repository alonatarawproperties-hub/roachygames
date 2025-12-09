const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (
    moduleName.includes('@reown/appkit') || 
    moduleName === '@reown/appkit-react-native' ||
    moduleName === '@reown/appkit-solana-react-native'
  )) {
    return {
      type: 'empty',
    };
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
