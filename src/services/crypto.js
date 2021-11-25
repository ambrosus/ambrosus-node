/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/**
 *
 */
export default class Crypto {
  /**
   * @param {Web3} web3 - the common blockchain library
   */
  constructor(web3) {
    this.web3 = web3;
  }

  /**
   * Generates private key using underlying ethereum client
   * @returns {Promise<string>}
   */
  async generatePrivateKey() {
    const account = this.web3.eth.accounts.create();
    return account.privateKey;
  }

  /**
   * Get account from underlying ethereum client
   * @param {string} privateKey
   * @returns {Promise<string>}
   */
  async addressForPrivateKey(privateKey) {
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    return account.address;
  }

  /**
   * Gets account balance from underlying ethereum client
   * @param {string} address
   * @returns {Promise<BN>}
   */
  async getBalance(address) {
    return this.web3.utils.toBN(await this.web3.eth.getBalance(address));
  }

  /**
   * Get encrypted keystore from underlying ethereum client
   * @param {string} privateKey
   * @param {string} password
   * @returns {EncryptedKeystoreV3Json}
   */
  getEncryptedWallet(privateKey, password) {
    return this.web3.eth.accounts.encrypt(privateKey, password);
  }

  /**
   * Generates random hexadecimal 32 bit long password
   * @returns {string}
   */
  getRandomPassword() {
    return this.web3.utils.randomHex(32);
  }

  /**
   * Sign data with private key using underlying ethereum client
   * @param {string} data
   * @param {string} privateKey
   * @returns {Sign}
   */
  sign(data, privateKey) {
    return this.web3.eth.accounts.sign(data, privateKey);
  }

  /**
   * Generates hash from data
   * @param data
   * @returns {string}
   */
  hashData(data) {
    return this.web3.utils.sha3(data);
  }
}
