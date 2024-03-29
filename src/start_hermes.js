/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import config from './config/config';
import Builder from './builder';
import HermesWorker from './workers/hermes_worker';
import {Role} from './services/roles_repository';
import WorkerLogger from './services/worker_logger';
import {waitForChainSync} from './utils/web3_tools';
import {setup} from './utils/instrument_process';
import BundlesRestorerHermes from './services/bundles_restorer_hermes';
import HermesBundlesValidatorWorker from './workers/validator_worker';
import HermesBackupWorker from './workers/hermes_backup_worker';
import HermesBackup from './services/hermes_backup';

async function start(logger) {
  const builder = new Builder();
  await builder.build(config);
  await builder.migrator.ensureMigrationIsComplete(logger);
  await waitForChainSync(builder.web3, 5, () => logger.info({
    message: 'Ethereum client is not in sync. Retrying in 5 seconds'
  }));
  await builder.ensureAccountIsOnboarded([Role.HERMES]);
  const strategy = loadStrategy(config.uploadStrategy);
  const worker = new HermesWorker(
    builder.dataModelEngine,
    new WorkerLogger(logger, builder.workerLogRepository),
    builder.workerTaskTrackingRepository,
    builder.workerIntervalsRepository,
    strategy,
    builder.client,
    config.serverPort
  );
  const workerLogger = new WorkerLogger(logger, builder.workerLogRepository);
  const bundlesRestorer = new BundlesRestorerHermes(
    builder.bundleStoreWrapper,
    builder.dataModelEngine,
    builder.bundleRepository,
    builder.assetRepository,
    builder.eventRepository,
    builder.hermesBundlesRepository,
    builder.shelteringWrapper,
    builder.shelteringTransfersWrapper,
    workerLogger
  );
  const validatorWorker = new HermesBundlesValidatorWorker(
    builder.dataModelEngine,
    builder.workerTaskTrackingRepository,
    builder.bundleRepository,
    builder.bundleStoreWrapper,
    builder.shelteringWrapper,
    logger,
    config.hermesBundlesValidatorWorkerInterval
  );
  const hermesBackup = new HermesBackup(
    builder.db,
    builder.store,
    builder.identityManager,
    builder.dataModelEngine,
    logger
  );
  const backupWorker = new HermesBackupWorker(
    hermesBackup,
    builder.workerTaskTrackingRepository,
    logger,
    config.hermesBackupWorkerInterval
  );

  setTimeout(async () => {
    // check & restore bundles
    await bundlesRestorer.restore();
    // then check & restore infrastructure (organizations/accounts & state.json)
    await hermesBackup.restore();
    //
    await backupWorker.start();
    //
    await validatorWorker.start();
  }, 500);

  await worker.start();
}

function loadStrategy(uploadStrategy) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const HermesUploadStrategy = require(`./workers/hermes_strategies/${uploadStrategy}`).default;
  return new HermesUploadStrategy();
}

setup(start);
