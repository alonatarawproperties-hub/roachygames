const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  return {
    ...baseConfig.expo,
    android: {
      ...baseConfig.expo.android,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_API_KEY || '',
        },
      },
    },
  };
};
