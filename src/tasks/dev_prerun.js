/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from '../utils/loggers';
import config from '../../config/config';
import Builder from '../builder';

async function registerAdminAccount(dataModelEngine, logger) {
  try {
    logger.info('Registering admin account');
    const account = await dataModelEngine.addAdminAccount();
    logger.info(`Address: ${account.address}`);
    if (account.secret) {
      logger.info(`Secret:  ${account.secret}`);
    }
  } catch (exception) {
    logger.error(exception.message);
  }
}

async function configureRegistryContract(dataModelEngine, logger) {
  logger.info(`Whitelist node address with registry`);
  const address = dataModelEngine.identityManager.nodeAddress();
  const {registryContract} = dataModelEngine.proofRepository;
  await registryContract
    .methods
    .addToWhitelist(address, 'whatever')
    .send({
      from: address,
      gas: 2000000
    });
}

async function setupDevelopment(dataModelEngine, logger) {
  await registerAdminAccount(dataModelEngine, logger);
  await configureRegistryContract(dataModelEngine, logger);
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
