/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from './utils/loggers';
import HermesWorker from './workers/hermes_worker';

async function start(logger) {
  const worker = new HermesWorker(logger);
  await worker.start();
}

const logger = new WinstonConsoleLogger();

start(logger)
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
