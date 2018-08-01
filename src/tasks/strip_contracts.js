/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import fs from 'fs';
import path from 'path';
import {WinstonConsoleLogger} from '../utils/loggers';

const stripContracts = (contractsDirectory, logger) => {
  if (!contractsDirectory) {
    throw new Error('Contracts directory not specified');
  }

  fs.readdir(contractsDirectory, (err, contracts) => {
    if (err) {
      throw err;
    }
    logger.info(`Stripping contracts in ${contractsDirectory}`);
    contracts.forEach((file) => {
      if (path.extname(file) === '.json') {
        const filePath = path.join(contractsDirectory, file);
        try {
          const {abi, bytecode, contractName, updatedAt} = JSON.parse(fs.readFileSync(filePath).toString());
          fs.writeFileSync(filePath, JSON.stringify({abi, bytecode, contractName, updatedAt}, null, 2));
          logger.info(`✅ ${file}`);
        } catch (err) {
          logger.error({message: `❌ ${file}`, error: err});
        }
      }
    });
  });
};

const logger = new WinstonConsoleLogger();
const [, , contractsDirectory] = process.argv;
try {
  stripContracts(contractsDirectory, logger);
} catch (err) {
  logger.error(err);
  process.exit(1);
}
