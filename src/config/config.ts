/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export interface Config {
  serverPort: number;

  web3Rpc: string;
  nodePrivateKey: string;
  sentryDSN: string | undefined;
  sentryIgnoreRegex: string | undefined;

  mongoHosts: string | undefined;
  mongoDBName: string | undefined;

  mongoReplicaSet: string | undefined;

  mongoUser: string | undefined;
  mongoPassword: string | undefined;

  lowFundsWarningAmount: string;

  headContractAddress: string | undefined;
  challengeResolutionStrategy: string;
  transferResolutionStrategy: string;
  uploadStrategy: string;

  maximumEntityTimestampOvertake: number;

  authorizationWithSecretKeyEnabled: boolean;

  defaultGasPrice: number;

  gitCommit: string | undefined;

  docsLink: string;

  requestSizeLimit: string;

  workerLogsTTLInSeconds: number;
  workerTasksTTLInSeconds: number;

  migrationSleepTimeInSeconds: number;

  supportDeprecatedBundleVersions: boolean;

  requiredFreeDiskSpace: number;

  atlasProcessActiveResolviesByOne: boolean;

  atlasWorkerInterval: number;
  cleanupWorkerInterval: number;
}

const config: Readonly<Config> = Object.freeze({
  serverPort: Number(process.env.SERVER_PORT) || 9876,

  web3Rpc: process.env.WEB3_RPC || '',
  nodePrivateKey: process.env.WEB3_NODEPRIVATEKEY || '',
  sentryDSN: process.env.SENTRY_DSN,
  sentryIgnoreRegex: process.env.SENTRY_IGNORE_ERRORS_REGEX,
  // Required, one or more hosts delimited with comma, e.g
  // 'mongo1:27107,mongo2:27017'
  mongoHosts: process.env.MONGO_HOSTS,
  mongoDBName: process.env.MONGO_DB_NAME,

  // Optionally connect to a replica set
  mongoReplicaSet: process.env.MONGO_REPLICA_SET,

  // Optionally enable authentication
  mongoUser: process.env.MONGO_USER,
  mongoPassword: process.env.MONGO_PASSWORD,

  lowFundsWarningAmount: process.env.LOW_FUNDS_WARNING || '1000',

  headContractAddress: process.env.HEAD_CONTRACT_ADDRESS,
  challengeResolutionStrategy: process.env.CHALLENGE_RESOLUTION_STRATEGY || 'resolve_all_strategy',
  transferResolutionStrategy: process.env.TRANSFER_RESOLUTION_STRATEGY || 'resolve_all_strategy',
  uploadStrategy: process.env.UPLOAD_STRATEGY || 'regular_interval_upload_strategy',

  maximumEntityTimestampOvertake: Number(process.env.MAXIMUM_ENTITY_TIMESTAMP_OVERTAKE) || 86400,

  authorizationWithSecretKeyEnabled:
    process.env.AUTHORIZATION_WITH_SECRET_KEY_ENABLED === 'true' || false,

  defaultGasPrice: Number(process.env.DEFAULT_GAS_PRICE) || 5, // in ambits

  gitCommit: process.env.GIT_COMMIT,

  docsLink: process.env.DOCS_LINK || 'https://dev.ambrosus.com/',

  requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '1mb',

  workerLogsTTLInSeconds: Number(process.env.WORKER_LOGS_TTL) || 172800, // 2 days
  workerTasksTTLInSeconds: Number(process.env.WORKER_TASKS_TTL) || 600, // 10 minutes

  migrationSleepTimeInSeconds: Number(process.env.MIGRATION_SLEEP_TIME) || 10,

  supportDeprecatedBundleVersions: process.env.SUPPORT_DEPRECATED_BUDLE_VERSIONS === 'true',

  requiredFreeDiskSpace: Number(process.env.REQUIRED_FREE_DISK_SPACE) || 200000000, // 200 MB

  atlasProcessActiveResolviesByOne: process.env.ATLAS_RESOLVIES_BY_ONE === 'true' || false,

  atlasWorkerInterval: Number(process.env.ATLAS_WORKER_INTERVAL) || 5, // 5 sec
  cleanupWorkerInterval: Number(process.env.CLEANUP_WORKER_INTERVAL) || 86400, // 1 day

  storePath: process.env.STORE_PATH || '/opt/hermes/state.json'
});

export default config;
