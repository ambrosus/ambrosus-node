/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from '../utils/loggers';
import {createWeb3} from '../../src/utils/web3_tools';
import config from '../../config/config';
import deployAll from '../utils/deployment';

const logger = new WinstonConsoleLogger();

createWeb3(config)
  .then(async (web3) => {
    await deployAll(web3, logger);
  })
  .catch((exception) => {
    logger.error(exception);
    process.exit(1);
  });
