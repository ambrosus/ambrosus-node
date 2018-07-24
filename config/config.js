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

  // Required, one or more hosts delimited with comma, e.g
  // 'mongo1:27107,mongo2:27017'
  mongoHosts: process.env.MONGO_HOSTS,
  mongoDbName: process.env.MONGO_DB_NAME,

  // Optionally connect to a replica set
  mongoReplicaSet: process.env.MONGO_REPLICA_SET,

  // Optionally enable x509 authentication
  mongoX509User: process.env.MONGO_X509_USER,
  mongoX509SslCaPath: process.env.MONGO_X509_SSL_CA_PATH,
  mongox509SslCertPath: process.env.MONGO_x509_SSL_CERT_PATH,
  mongox509SslKeyPath: process.env.MONGO_X509_SSL_KEY_PATH,

  headContractAddress: process.env.HEAD_CONTRACT_ADDRESS,
  bundleSizeLimit: parseInt(process.env.BUNDLE_SIZE_LIMIT, 10) || 10000,
  storagePeriods: parseInt(process.env.STORAGE_PERIODS, 10) || 1,

  maximumEntityTimestampOvertake:
    parseInt(process.env.MAXIMUM_ENTITY_TIMESTAMP_OVERTAKE, 10) || 86400,

  authorizationWithSecretKeyEnabled:
    process.env.AUTHORIZATION_WITH_SECRET_KEY_ENABLED === 'true' || false,

  defaultGasPrice: parseInt(process.env.DEFAULT_GAS_PRICE, 10) || 5, // in ambits

  gitCommit: process.env.GIT_COMMIT
});
