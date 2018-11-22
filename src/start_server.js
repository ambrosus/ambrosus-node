/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonExpressLogger} from './utils/loggers';
import config from '../config/config';
import Builder from './builder';
import ServerWorker from './workers/server_worker';
import {Role} from './services/roles_repository';
import {waitForChainSync} from './utils/web3_tools';

async function start(logger) {
  const builder = new Builder();
  await builder.build(config);
  if (await builder.migrator.isMigrationNeccesary()) {
    throw new Error('Migration needs to be done');
  }
  await builder.ensureAdminAccountExist();
  await waitForChainSync(builder.web3, 5, () => logger.info('Ethereum client is not in sync. Retrying in 5 seconds'));
  const role = await builder.ensureAccountIsOnboarded([Role.ATLAS, Role.HERMES]);
  const worker = new ServerWorker(
    builder.dataModelEngine,
    builder.web3,
    role,
    config,
    logger
  );
  await worker.start();
}

const logger = new WinstonExpressLogger();

start(logger)
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
