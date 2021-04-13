/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ValidationError} from '../errors/errors';
import fs from 'fs';
import path from 'path';

export default class PrivateKey {
  constructor(storeFilePath, web3) {
    this.storeFilePath = storeFilePath;
    this.web3 = web3;
  }

  getAddress() {
    const privateKey = this.getOrCreatePk();
    return this.addressForPrivateKey(privateKey);
  }

  getOrCreatePk() {
    let privateKey = this.readPk();
    if (privateKey !== null) {
      return privateKey;
    }

    console.log('adminAddress: generating new private key');
    privateKey = this.generatePrivateKey();
    if (privateKey === null) {
      throw new ValidationError(`adminAddress: generation failed.`);
    }
    this.writePk(privateKey);
    return privateKey;
  }


  generatePrivateKey() {
    return this.web3.eth.accounts.create().privateKey;
  }

  addressForPrivateKey(privateKey) {
    return this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
  }


  readPk() {
    try {
      return fs.readFileSync(this.storeFilePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  writePk(data) {
    fs.mkdirSync(path.dirname(this.storeFilePath), {recursive: true});
    fs.writeFileSync(this.storeFilePath, data, {mode: 0o660});
  }
}
