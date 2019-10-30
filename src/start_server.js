/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import config from './config/config';
import Builder from './builder';
import ServerWorker from './workers/server_worker';
import {Role} from './services/roles_repository';
import {waitForChainSync} from './utils/web3_tools';
import {setup} from './utils/instrument_process';

async function start(logger) {
  const builder = new Builder();
  await builder.build(config);
  await builder.migrator.ensureMigrationIsComplete(logger);
  await builder.ensureAdminAccountExist();
  await waitForChainSync(builder.web3, 5, () => logger.info({
    message: 'Ethereum client is not in sync. Retrying in 5 seconds'
  }));
  const role = await builder.ensureAccountIsOnboarded([Role.ATLAS, Role.HERMES]);
  const worker = new ServerWorker(
    builder.dataModelEngine,
    builder.web3,
    role,
    config,
    logger,
    builder.operationalMode
  );
  await worker.start();
}

setup(start);
