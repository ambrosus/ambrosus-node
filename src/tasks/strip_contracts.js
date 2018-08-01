/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {readFile, writeFile, listDirectory} from '../utils/file';
import path from 'path';
import {WinstonConsoleLogger} from '../utils/loggers';


const stripContracts = async (contractsDir, logger) => {
  if (!contractsDirectory) {
    throw new Error('Contracts directory not specified');
  }
  logger.info(`Stripping contracts in '${contractsDirectory}'`);
  const contractFiles = await listDirectory(contractsDir);

  for (const contractFile of contractFiles) {
    try {
      const filePath = path.join(contractsDir, contractFile);
      if (path.extname(filePath) !== '.json') {
        continue;
      }
      const contract = JSON.parse(await readFile(filePath));
      const stripedContract = {
        contractName : contract.contractName,
        updatedAt: contract.updatedAt,
        abi : contract.abi,
        bytecode : contract.bytecode
      };
      await writeFile(filePath, JSON.stringify(stripedContract, null, 2));
      logger.info(`✅ ${contractFile}`);
    } catch (err) {
      logger.error({message: `❌ ${contractFile}`, error: err});
    }
  }
};

const logger = new WinstonConsoleLogger();
const [, , contractsDirectory] = process.argv;

stripContracts(contractsDirectory, logger)
  .catch((exception) => {
    logger.error(exception);
    process.exit(1);
  });
