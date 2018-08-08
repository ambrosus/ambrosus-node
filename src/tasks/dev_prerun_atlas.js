/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from '../utils/loggers';
import Builder from '../builder';
import config from '../../config/config';
import {addToKycWhitelist, onboardAsAtlas, registerAdminAccount} from '../utils/prerun';
import {Role} from '../services/roles_repository';

async function setupDevelopment(dataModelEngine, logger) {
  await registerAdminAccount(dataModelEngine, logger);
  await addToKycWhitelist(Role.ATLAS, dataModelEngine, logger);
  await onboardAsAtlas(dataModelEngine.contractManager.web3, dataModelEngine.rolesRepository, logger);
}

const builder = new Builder();
const logger = new WinstonConsoleLogger();

builder.build(config)
  .then(async ({client, dataModelEngine}) => {
    await setupDevelopment(dataModelEngine, logger);
    await client.close();
  })
  .catch((exception) => {
    logger.error(exception);
    process.exit(1);
  });
