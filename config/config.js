/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

module.exports = Object.freeze({
  serverPort: parseInt(process.env.SERVER_PORT, 10) || 9876,

  web3Rpc: process.env.WEB3_RPC,
  nodePrivateKey: process.env.WEB3_NODEPRIVATEKEY,

  mongoUri: process.env.MONGODB_URI,
  
  sentryDSN: process.env.SENTRY_DSN,

  bundleRegistryContractAddress: process.env.BUNDLE_REGISTRY_CONTRACT_ADDRESS,
  bundleFinalisationInterval: parseInt(process.env.BUNDLE_FINALISATION_INTERVAL, 10) || 15000,
  bundleDownloadInterval: parseInt(process.env.BUNDLE_DOWNLOAD_INTERVAL, 10) || 5000,
  bundleSizeLimit: parseInt(process.env.BUNDLE_SIZE_LIMIT, 10) || 10000,

  maximumEntityTimestampOvertake:
    parseInt(process.env.MAXIMUM_ENTITY_TIMESTAMP_OVERTAKE, 10) || 86400,

  authorizationWithSecretKeyEnabled:
    process.env.AUTHORIZATION_WITH_SECRET_KEY_ENABLED === 'true' || false,

  defaultGasPrice: parseInt(process.env.DEFAULT_GAS_PRICE, 10) || 5, // in ambits

  gitCommit: process.env.GIT_COMMIT
});
