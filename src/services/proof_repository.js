import {ensureTransactionSucceeded, getDefaultAddress} from '../utils/web3_tools';

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
    return ensureTransactionSucceeded(this.registryContract
      .methods
      .addToWhitelist(vendorAddress, url)
      .send({
        from: getDefaultAddress(this.web3),
        gas: this.defaultGas
      }));
  }

  async uploadProof(bundleId) {
    return ensureTransactionSucceeded(this.registryContract
      .methods
      .addBundle(bundleId, this.nodeAddress)
      .send({
        from: getDefaultAddress(this.web3),
        gas: this.defaultGas
      }));
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
