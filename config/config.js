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

  headContractAddress: process.env.HEAD_CONTRACT_ADDRESS,
  challengeResolutionStrategy: process.env.CHALLENGE_RESOLUTION_STRATEGY || 'resolve_all_strategy',
  uploadStrategy: process.env.UPLOAD_STRATEGY || 'regular_interval_upload_strategy',

  maximumEntityTimestampOvertake:
    parseInt(process.env.MAXIMUM_ENTITY_TIMESTAMP_OVERTAKE, 10) || 86400,

  authorizationWithSecretKeyEnabled:
    process.env.AUTHORIZATION_WITH_SECRET_KEY_ENABLED === 'true' || false,

  defaultGasPrice: parseInt(process.env.DEFAULT_GAS_PRICE, 10) || 5, // in ambits

  gitCommit: process.env.GIT_COMMIT,

  docsLink: process.env.DOCS_LINK || 'https://dev.ambrosus.com/',

  requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '5mb'
});
