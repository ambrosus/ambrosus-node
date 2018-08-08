/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from './utils/loggers';
import config from '../config/config';
import Builder from './builder';
import HermesWorker from './workers/hermes_worker';
import {Role} from './services/roles_repository';

async function start(logger) {
  const builder = new Builder();
  await builder.build(config);
  await builder.ensureAccountIsOnboarded([Role.HERMES]);
  const worker = new HermesWorker(builder.dataModelEngine, config, logger);
  await worker.start();
}

const logger = new WinstonConsoleLogger();

start(logger)
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
