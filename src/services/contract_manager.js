import Config from '../utils/config';
import {loadContract, deployContract} from '../utils/web3_tools';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';

export default class ContractManager {
  constructor(web3, allowMissing = false) {
    this.web3 = web3;

    const bundleRegistryContractAddress = Config.bundleRegistryContractAddress();

    if (bundleRegistryContractAddress) {
      this.bundleRegistry = loadContract(web3, BundleRegistry.abi, bundleRegistryContractAddress);
    } else if (allowMissing) {
      this.bundleRegistry = null;
    } else {
      throw new Error('bundle proof registry contract address is not configured');
    }
  }

  bundleProofRegistryContract() {
    return this.bundleRegistry;
  }

  async deployIfNeeded() {
    if (this.bundleRegistry === null) {
      this.bundleRegistry = await deployContract(this.web3, BundleRegistry.abi, BundleRegistry.bytecode);
    }
    return this.bundleRegistry;
  }
}
