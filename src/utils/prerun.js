/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import config from '../config/config';

export async function onboardAsAtlas(dataModelEngine, rolesRepository, logger) {
  logger.info(`Onboarding node as ATLAS with stake of 10000 AMB`);
  const address = dataModelEngine.identityManager.nodeAddress();
  const url = `localhost:${config.serverPort}`;
  await rolesRepository.onboardAsAtlas(address, url);
}

export async function onboardAsHermes(dataModelEngine, rolesRepository, logger) {
  logger.info(`Onboarding node as HERMES`);
  const address = dataModelEngine.identityManager.nodeAddress();
  const url = `localhost:${config.serverPort}`;
  await rolesRepository.onboardAsHermes(address, url);
}

export async function registerAdminAccount(dataModelEngine, logger) {
  try {
    logger.info('Registering admin account');
    const account = await dataModelEngine.addAdminAccount();
    logger.info(`Address: ${account.address}`);
  } catch (exception) {
    logger.error(exception.message);
  }
}

export async function addToKycWhitelist(role, deposit, dataModelEngine, kycWhitelistWrapper, logger) {
  logger.info(`Whitelist node address with registry`);
  const address = dataModelEngine.identityManager.nodeAddress();
  await kycWhitelistWrapper.add(address, role.roleIndex, deposit);
}
