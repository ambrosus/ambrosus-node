/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getDefaultAddress} from '../utils/web3_tools';

export default class ProofRepository {
  constructor(web3, nodeAddress, registryContract, defaultGas = 2000000) {
    this.web3 = web3;
    this.nodeAddress = nodeAddress;
    this.registryContract = registryContract;
    this.defaultGas = defaultGas;
  }

  async getVendorUrl(vendorAddress) {
    const from = getDefaultAddress(this.web3);
    return this.registryContract
      .methods
      .getUrlForVendor(vendorAddress)
      .call({from});
  }

  async isWhitelisted(vendorAddress) {
    const from = getDefaultAddress(this.web3);
    return this.registryContract
      .methods
      .isWhitelisted(vendorAddress)
      .call({from});
  }

  async addVendor(vendorAddress, url) {
    return this.registryContract
      .methods
      .addToWhitelist(vendorAddress, url)
      .send({
        from: getDefaultAddress(this.web3),
        gas: this.defaultGas
      });
  }

  async uploadProof(bundleId) {
    return this.registryContract
      .methods
      .addBundle(bundleId, this.nodeAddress)
      .send({
        from: getDefaultAddress(this.web3),
        gas: this.defaultGas
      });
  }

  async getNodeForBundle(bundleId) {
    const from = getDefaultAddress(this.web3);
    return this.registryContract
      .methods
      .getVendorForBundle(bundleId)
      .call({from});
  }

  async getBundleByIndex(index) {
    const from = getDefaultAddress(this.web3);
    return this.registryContract
      .methods
      .bundleIds(index)
      .call({from});
  }

  async getBundleCount() {
    const from = getDefaultAddress(this.web3);
    return parseInt(await this.registryContract
      .methods
      .getBundleCount()
      .call({from}), 10);
  }

  async getVendorForBundle(bundleId) {
    const from = getDefaultAddress(this.web3);
    return this.registryContract
      .methods
      .getVendorForBundle(bundleId)
      .call({from});
  }
}
