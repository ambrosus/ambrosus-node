/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class StateModel {
  constructor(store, crypto) {
    this.store = store;
    this.crypto = crypto;
  }

  async generateAndStoreNewPrivateKey() {
    const privateKey = await this.crypto.generatePrivateKey();
    await this.storePrivateKey(privateKey);
    return privateKey;
  }

  async getPrivateKey() {
    return this.store.safeRead('privateKey');
  }

  async storePrivateKey(privateKey) {
    await this.store.write('privateKey', privateKey);
  }

  async getAddress() {
    const privateKey = await this.getPrivateKey();
    if (privateKey) {
      return this.crypto.addressForPrivateKey(privateKey);
    }
    return null;
  }

  async storeAddress(address) {
    await this.store.write('address', address);
  }
}
