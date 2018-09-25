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
  sentryDSN: process.env.SENTRY_DSN,

  // Required, one or more hosts delimited with comma, e.g
  // 'mongo1:27107,mongo2:27017'
  mongoHosts: process.env.MONGO_HOSTS,
  mongoDBName: process.env.MONGO_DB_NAME,

  // Optionally connect to a replica set
  mongoReplicaSet: process.env.MONGO_REPLICA_SET,

  // Optionally enable authentication
  mongoUser: process.env.MONGO_USER,
  mongoPassword: process.env.MONGO_PASSWORD,

  headContractAddress: process.env.HEAD_CONTRACT_ADDRESS,
  challengeResolutionStrategy: process.env.CHALLENGE_RESOLUTION_STRATEGY || 'resolve_all_strategy',
  uploadStrategy: process.env.UPLOAD_STRATEGY || 'regular_interval_upload_strategy',
  uploadRetryPeriod: process.env.UPLOAD_RETRY_PERIOD || 10,

  maximumEntityTimestampOvertake:
    parseInt(process.env.MAXIMUM_ENTITY_TIMESTAMP_OVERTAKE, 10) || 86400,

  authorizationWithSecretKeyEnabled:
    process.env.AUTHORIZATION_WITH_SECRET_KEY_ENABLED === 'true' || false,

  defaultGasPrice: parseInt(process.env.DEFAULT_GAS_PRICE, 10) || 5, // in ambits

  gitCommit: process.env.GIT_COMMIT,

  docsLink: process.env.DOCS_LINK || 'https://dev.ambrosus.com/',

  requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '1mb'
});
