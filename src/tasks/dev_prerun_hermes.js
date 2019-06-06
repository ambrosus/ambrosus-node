/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from '../utils/loggers';
import Builder from '../builder';
import config from '../config/config';
import {addToKycWhitelist, onboardAsHermes, registerAdminAccount} from '../utils/prerun';
import {Role} from '../services/roles_repository';

async function setupDevelopment(dataModelEngine, kycWhitelistWrapper, logger) {
  await registerAdminAccount(dataModelEngine, logger);
  await addToKycWhitelist(Role.HERMES, '0', dataModelEngine, kycWhitelistWrapper, logger);
  await onboardAsHermes(dataModelEngine, dataModelEngine.rolesRepository, logger);
}

const builder = new Builder();
const logger = new WinstonConsoleLogger();

builder.build(config)
  .then(async ({client, dataModelEngine, kycWhitelistWrapper}) => {
    await setupDevelopment(dataModelEngine, kycWhitelistWrapper, logger);
    await client.close();
  })
  .catch((exception) => {
    logger.error(exception);
    process.exit(1);
  });
