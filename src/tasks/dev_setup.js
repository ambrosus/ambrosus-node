/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {writeFile} from '../utils/file';
import path from 'path';
import Builder from '../builder';
import BundleRegistry from '../../contracts/BundleRegistry.json';
import {deployContract, getDefaultAddress} from '../../src/utils/web3_tools';
import {WinstonConsoleLogger} from '../utils/loggers';

async function createAdminAccount(dataModelEngine, logger) {
  try {
    logger.info('Creating admin account');
    const account = await dataModelEngine.addAdminAccount();
    logger.info(`Address: ${account.address}`);
    if (account.secret) {
      logger.info(`Secret:  ${account.secret}`);
    }
  } catch (exception) {
    logger.error(exception.message);
  }
}

async function whitelist(bundleRegistryContract, dataModelEngine) {
  const {web3} = dataModelEngine.proofRepository;
  const address = await getDefaultAddress(web3);
  await bundleRegistryContract
    .methods
    .addToWhitelist(address, 'whatever')
    .send({
      from: address,
      gas: 2000000
    });
}

async function deployRegistryContract(dataModelEngine, logger) {
  logger.info('\nDeploying bundle registry contract...');
  const bundleRegistryContract = await deployContract(
    dataModelEngine.proofRepository.web3,
    BundleRegistry.abi,
    BundleRegistry.bytecode);

  const contractAddress = bundleRegistryContract.options.address;
  const filePath = path.join('config', 'registryContractAddress.json');
  logger.info(`Contract deployed at ${contractAddress}`);
  await whitelist(bundleRegistryContract, dataModelEngine);
  await writeFile(filePath, JSON.stringify(contractAddress));
  logger.info(`Contract address stored in ${filePath}.`);
}

async function setupDevelopment(dataModelEngine, logger) {
  await createAdminAccount(dataModelEngine, logger);
  await deployRegistryContract(dataModelEngine, logger);
}

const builder = new Builder();
const logger = new WinstonConsoleLogger();

builder.build()
  .then(async ({client, dataModelEngine}) => {
    try {
      await setupDevelopment(dataModelEngine, logger);
    } catch (err) {
      logger.error(`Verify if config files have correctly set 'web3.rpc' and 'web3.nodePrivateKey'\n${err.message}`);
    }
    await client.close();
  })
  .catch((exception) => {
    logger.error(exception);
    process.exit(1);
  });
