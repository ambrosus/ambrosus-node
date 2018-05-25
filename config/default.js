/* eslint-disable header/header */
module.exports = {
  server: {
    port: 9876
  },
  bundle: {
    finalisationInterval: 15000,
    downloadInterval: 5000,
    bundleSizeLimit: 10000,
    defaultGasPrice: 5 // in ambits
  },
  maximumEntityTimestampDelay: 86400, // in seconds
  authorizationWithSecretEnabled: false
};
