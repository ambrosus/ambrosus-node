import {getDefaultAddress} from '../utils/web3_tools';

export default class ProofRepository {
  constructor(web3, contractManager, identityManager) {
    this.web3 = web3;
    this.contractManager = contractManager;
    this.identityManager = identityManager;
  }

  async uploadProof(bundleId) {
    const nodeAddress = this.identityManager.nodeAddress();
    const registryContract = this.contractManager.bundleProofRegistryContract();
    return await registryContract
      .methods
      .addBundle(bundleId, nodeAddress)
      .send({
        from: getDefaultAddress(this.web3),
        gas: 200000
      });
  }

  async getVendorUrl(vendorId) {
    const registryContract = this.contractManager.bundleProofRegistryContract();
    return await registryContract
      .methods
      .getUrlForVendor(vendorId)
      .call({
        from: getDefaultAddress(this.web3)
      });
  }
}
