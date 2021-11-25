/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/**
 * Keeps node owner's credentials stored on disk
 */
export default class StateModel {
  /**
   * @param {Store} store - the key-value store
   * @param {Crypto} crypto - the cryptographic utility
   */
  constructor(store, crypto) {
    this.store = store;
    this.crypto = crypto;
  }

  /**
   * Generates and store new private key
   * @returns {Promise<string>}
   */
  async generateAndStoreNewPrivateKey() {
    const privateKey = await this.crypto.generatePrivateKey();
    await this.storePrivateKey(privateKey);
    return privateKey;
  }

  /**
   * Returns private key from store. Can't throw error
   * @returns {Promise<*|null>}
   */
  async getPrivateKey() {
    return this.store.safeRead('privateKey');
  }

  /**
   * Saves private key to store.
   * @param privateKey
   * @returns {Promise<void>}
   */
  async storePrivateKey(privateKey) {
    await this.store.write('privateKey', privateKey);
  }

  /**
   * Gets user's address
   * @returns {Promise<string|null>}
   */
  async getAddress() {
    const privateKey = await this.getPrivateKey();
    if (privateKey) {
      return this.crypto.addressForPrivateKey(privateKey);
    }
    return null;
  }

  /**
   * Saves address to the store
   * @param {string} address
   * @returns {Promise<void>}
   */
  async storeAddress(address) {
    await this.store.write('address', address);
  }
}
