/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from './utils/loggers';
import config from '../config/config';
import Builder from './builder';
import ServerWorker from './workers/server_worker';

async function start(logger) {
  const builder = new Builder(logger);
  await builder.build(config);
  await builder.ensureAdminAccountExist();
  const worker = new ServerWorker(
    builder.dataModelEngine,
    config,
    logger
  );
  await worker.start();
}

const logger = new WinstonConsoleLogger();

start(logger)
  .catch((err) => {
    logger.error(`${err}`);
    process.exit(1);
  });
