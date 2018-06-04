/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Web3 from 'web3';
import {writeFile, checkFileExists} from '../utils/file';
import path from 'path';

async function execute() {
  const web3 = new Web3();

  const keyFilePath = path.join('config', 'nodePrivateKey.json');
  if (await checkFileExists(keyFilePath)) {
    console.log('A private key file already exists. Silently quitting');
    return;
  }

  const account = web3.eth.accounts.create();
  const {privateKey, address} = account;

  await writeFile(keyFilePath, JSON.stringify(privateKey));
  console.log(`Generated address/privateKey pair:\n\taddress: ${address}\n\tprivate key: ${privateKey}\n\nSaving under ${keyFilePath}`);
}

execute()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
