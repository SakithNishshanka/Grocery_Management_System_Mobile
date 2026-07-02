const appJson = require('./app.json');

// Expo loads EXPO_PUBLIC_* from .env before this file runs.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiUrl,
    },
  },
};
