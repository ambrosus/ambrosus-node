/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Migrator from '../migrations/Migrator';
import {connectToMongo} from '../utils/db_utils';
import config from '../config/config';
import {WinstonExpressLogger} from '../utils/loggers';

const init = async (logger) => {
  try {
    const {client, db} = await connectToMongo(config);
    await new Migrator(db, config).migrate(logger);
    await client.close();
  } catch (err) {
    logger.error(err);
  }
};

const logger = new WinstonExpressLogger();
init(logger);
