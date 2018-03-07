import Config from '../utils/config';
import {loadContract, getDefaultAddress, deployContract} from '../utils/web3_tools';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';

export default class ProofRepository {
  constructor(web3, identityManager) {
    this.web3 = web3;
    this.identityManager = identityManager;

    const contractAddress = Config.bundleRegistryContractAddress();

    if (contractAddress) {
      this.registryContract = loadContract(web3, BundleRegistry.abi, contractAddress);
    } else {
      this.registryContract = deployContract(web3, BundleRegistry.abi, BundleRegistry.bytecode);
    }
  }

  async uploadProof(bundleId) {
    const nodeAddress = this.identityManager.nodeAddress();
    await this.registryContract
      .addBundle(bundleId, nodeAddress)
      .send({
        from: getDefaultAddress(this.web3),
        gas: 200000
      });
  }
}
