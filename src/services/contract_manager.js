import {loadContract, deployContract} from '../utils/web3_tools';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';

export default class ContractManager {
  static loadBundleRegistryContract(web3, bundleRegistryContractAddress) {
    let result;
    if (bundleRegistryContractAddress) {
      result = loadContract(web3, BundleRegistry.abi, bundleRegistryContractAddress);
    } else {
      throw new Error('bundle proof registry contract address is not configured');
    }
    return result;
  }

  static async deploy(web3) {
    const contract = await deployContract(web3, BundleRegistry.abi, BundleRegistry.bytecode);
    return contract.options.address;
  }
}
