/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AtlasWorker from './workers/atlas_worker';
import AtlasChallengeResolver from './workers/atlas_resolvers/atlas_challenge_resolver';
import AtlasTransferResolver from './workers/atlas_resolvers/atlas_transfer_resolver';
import config from './config/config';
import Builder from './builder';
import {Role} from './services/roles_repository';
import WorkerLogger from './services/worker_logger';
import {waitForChainSync} from './utils/web3_tools';
import {setup} from './utils/instrument_process';
import CleanupWorker from './workers/cleanup_worker';
import ReleaseBundlesService from './services/release_bundles_service';
import BundlesRestorer from './services/bundles_restorer';

async function start(logger) {
  const builder = new Builder();
  await builder.build(config);
  await builder.migrator.ensureMigrationIsComplete(logger);
  await waitForChainSync(builder.web3, 5, () => logger.info('Ethereum client is not in sync. Retrying in 5 seconds'));
  await builder.ensureAccountIsOnboarded([Role.ATLAS]);
  const challengeStrategy = loadStrategy(config.challengeResolutionStrategy);
  const transferStrategy = loadStrategy(config.transferResolutionStrategy);
  const workerLogger = new WorkerLogger(logger, builder.workerLogRepository);
  const bundlesRestorer = new BundlesRestorer(
    builder.bundleStoreWrapper,
    builder.shelteringWrapper,
    builder.dataModelEngine,
    builder.bundleRepository,
    builder.shelteredBundlesRepository,
    workerLogger
  );
  const resolvers = [
    new AtlasChallengeResolver(
      builder.web3,
      builder.dataModelEngine,
      builder.challengesRepository,
      builder.failedChallengesCache,
      challengeStrategy,
      workerLogger,
      builder.bundleStoreWrapper
    ),
    new AtlasTransferResolver(
      builder.web3,
      builder.dataModelEngine,
      builder.transfersRepository,
      builder.failedTransfersCache,
      transferStrategy,
      workerLogger,
      builder.bundleStoreWrapper
    )
  ];
  const releaseBundlesService = new ReleaseBundlesService(
    builder.bundleRepository,
    builder.shelteringWrapper,
    builder.shelteringTransfersWrapper,
    builder.retireTransfersRepository,
    workerLogger,
    builder.operationalMode
  );
  const atlasWorker = new AtlasWorker(
    builder.web3,
    builder.dataModelEngine,
    workerLogger,
    builder.workerTaskTrackingRepository,
    builder.client,
    resolvers,
    builder.operationalMode,
    config,
    releaseBundlesService
  );
  const cleanupWorker = new CleanupWorker(
    builder.dataModelEngine,
    builder.workerTaskTrackingRepository,
    logger,
    config.cleanupWorkerInterval
  );
  await atlasWorker.start();
  await cleanupWorker.start();
  setTimeout(() => bundlesRestorer.restore(), 500);
}

function loadStrategy(strategyName) {
  const ResolutionStrategy = require(`./workers/atlas_strategies/${strategyName}`).default;
  return new ResolutionStrategy();
}

setup(start);
