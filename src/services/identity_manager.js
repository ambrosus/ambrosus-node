/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ValidationError, AuthenticationError} from '../errors/errors';
import matchHexOfLength from '../utils/regex';
import {getDefaultPrivateKey, getDefaultAddress} from '../utils/web3_tools';

export default class IdentityManager {
  constructor(web3, stateModel) {
    this.web3 = web3;
    this.stateModel = stateModel;
  }

  async nodePrivateKey() {
    return await getDefaultPrivateKey(this.web3);
  }

  nodeAddress() {
    return getDefaultAddress(this.web3);
  }

  async adminAddress() {
    let privateKey = await this.stateModel.getPrivateKey();

    if (privateKey === null) {
      privateKey = await this.stateModel.generateAndStoreNewPrivateKey();

      if (privateKey === null) {
        throw new ValidationError(`adminAddress: generation failed.`);
      }
    }

    const address = await this.stateModel.getAddress();

    return address;
  }

  sign(privateKey, data) {
    if (!matchHexOfLength(privateKey, 64)) {
      throw new ValidationError(`Invalid private key format`);
    }
    const {signature} = this.web3.eth.accounts.sign(this.serializeForHashing(data), privateKey);
    return signature;
  }

  validateSignature(address, signature, data) {
    if (!matchHexOfLength(address, 40)) {
      throw new ValidationError(`Invalid address format`);
    }
    if (!matchHexOfLength(signature, 130)) {
      throw new ValidationError(`Invalid signature format`);
    }
    const signer = this.web3.eth.accounts.recover(this.serializeForHashing(data), signature);
    if (address.toLowerCase() !== signer.toLowerCase()) {
      throw new AuthenticationError(`Signature doesn't match`);
    }
  }

  calculateHash(data) {
    const serialized = this.serializeForHashing(data);
    return this.web3.eth.accounts.hashMessage(serialized);
  }

  checkHashMatches(hash, data) {
    return hash === this.calculateHash(data);
  }

  serializeForHashing(object) {
    const isDict = (subject) => typeof subject === 'object' && !Array.isArray(subject);
    const isString = (subject) => typeof subject === 'string';
    const isArray = (subject) => Array.isArray(subject);

    if (isDict(object)) {
      const content = Object
        .keys(object)
        .sort()
        .map((key) => `"${key}":${this.serializeForHashing(object[key])}`)
        .join(',');
      return `{${content}}`;
    } else if (isArray(object)) {
      const content = object.map((item) => this.serializeForHashing(item)).join(',');
      return `[${content}]`;
    } else if (isString(object)) {
      return `"${object}"`;
    }
    return object.toString();
  }

  createKeyPair() {
    const account = this.web3.eth.accounts.create();
    return {address: account.address, secret: account.privateKey};
  }

  addressFromSecret(secret) {
    try {
      return this.web3.eth.accounts.privateKeyToAccount(secret).address;
    } catch (_e) {
      throw new AuthenticationError('Invalid secret.');
    }
  }
}
