/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ValidationError, AuthenticationError} from '../errors/errors';
import matchHexOfLength from '../utils/regex';
import {getDefaultPrivateKey, getDefaultAddress} from '../utils/web3_tools';

/**
 * Utility to handle ethereum account related operations
 */
export default class IdentityManager {
  /**
   * @param {Web3} web3 - the common blockchain library
   * @param {StateModel} stateModel - the utility to store account related data
   */
  constructor(web3, stateModel) {
    this.web3 = web3;
    this.stateModel = stateModel;
  }

  /**
   * Gets default private key of underlying ethereum client
   * @returns {Promise<*>}
   */
  async nodePrivateKey() {
    return await getDefaultPrivateKey(this.web3);
  }

  /**
   * Get address of default account from underlying ethereum client
   * @returns {string}
   */
  nodeAddress() {
    return getDefaultAddress(this.web3);
  }

  /**
   * Generates new admins private key and admins address
   * New attempts overrides previously generated values
   * @returns {Promise<string|null>}
   */
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

  /**
   * Signs data with private key
   * @param {string} privateKey - the private key
   * @param {string} data - the data
   * @returns {string}
   */
  sign(privateKey, data) {
    if (!matchHexOfLength(privateKey, 64)) {
      throw new ValidationError(`Invalid private key format`);
    }
    const {signature} = this.web3.eth.accounts.sign(this.serializeForHashing(data), privateKey);
    return signature;
  }

  /**
   * Validates signature. Throws error if signature invalid
   * @param {string} address - the users address
   * @param {string} signature - the signature
   * @param {string} data - the data
   */
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

  /**
   * Serializes input and creates hash
   * @param {Object} data
   * @returns {string}
   */
  calculateHash(data) {
    const serialized = this.serializeForHashing(data);
    return this.web3.eth.accounts.hashMessage(serialized);
  }

  /**
   * Checks if hash is valid
   * @param {string} hash - the hash to check
   * @param {string} data - the hashed data
   * @returns {boolean}
   */
  checkHashMatches(hash, data) {
    return hash === this.calculateHash(data);
  }

  /**
   * Serializes Object to string
   * @param {String} object - the object to serialize
   * @returns {string}
   */
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

  /**
   * Creates key pair from current users address and private key
   * @returns {{address: string, secret: string}}
   */
  createKeyPair() {
    const account = this.web3.eth.accounts.create();
    return {address: account.address, secret: account.privateKey};
  }

  /**
   * Gets account from secret
   * @param {string} secret
   * @returns {string}
   */
  addressFromSecret(secret) {
    try {
      return this.web3.eth.accounts.privateKeyToAccount(secret).address;
    } catch (_e) {
      throw new AuthenticationError('Invalid secret.');
    }
  }
}
