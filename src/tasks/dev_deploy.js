/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {WinstonConsoleLogger} from '../utils/loggers';
import {createWeb3, deployContract} from '../../src/utils/web3_tools';
import config from '../../config/config';
import BundleRegistry from '../../contracts/BundleRegistry.json';

async function deployRegistryContract(web3, logger) {
  logger.info('Deploying bundle registry contract...');
  const bundleRegistryContract = await deployContract(
    web3,
    BundleRegistry.abi,
    BundleRegistry.bytecode);
  const contractAddress = bundleRegistryContract.options.address;
  logger.info(`Contract deployed at ${contractAddress}`);
}

const logger = new WinstonConsoleLogger();

createWeb3(config)
  .then(async (web3) => {
    await deployRegistryContract(web3, logger);
  })
  .catch((exception) => {
    logger.error(exception);
    process.exit(1);
  });
