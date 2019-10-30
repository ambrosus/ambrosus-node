/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

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
    strategy,
    builder.client,
    config.serverPort
  );

  await worker.start();
}

function loadStrategy(uploadStrategy) {
  const HermesUploadStrategy = require(`./workers/hermes_strategies/${uploadStrategy}`).default;
  return new HermesUploadStrategy();
}

setup(start);
