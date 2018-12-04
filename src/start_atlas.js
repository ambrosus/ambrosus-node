/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from './utils/loggers';
import AtlasWorker from './workers/atlas_worker';
import config from '../config/config';
import Builder from './builder';
import {Role} from './services/roles_repository';
import {waitForChainSync} from './utils/web3_tools';

async function start(logger) {
  const builder = new Builder();
  await builder.build(config);
  if (await builder.migrator.isMigrationNeccesary()) {
    throw new Error('Migration needs to be done');
  }
  await waitForChainSync(builder.web3, 5, () => logger.info('Ethereum client is not in sync. Retrying in 5 seconds'));
  await builder.ensureAccountIsOnboarded([Role.ATLAS]);
  const strategy = loadStrategy(config.challengeResolutionStrategy);
  const worker = new AtlasWorker(
    builder.web3,
    builder.dataModelEngine,
    builder.workerLogRepository,
    builder.challengesRepository,
    builder.failedChallengesCache,
    strategy,
    logger,
    builder.client,
    config.serverPort
  );
  await worker.start();
}

function loadStrategy(strategyName) {
  const ChallengeResolutionStrategy = require(`./workers/atlas_strategies/${strategyName}`).default;
  return new ChallengeResolutionStrategy();
}

const logger = new WinstonConsoleLogger();

start(logger)
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
