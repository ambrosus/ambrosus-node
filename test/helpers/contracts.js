import BundleRegistryJson from '../../build/contracts/BundleRegistry.json';
import {deployContract} from '../../src/utils/web3_tools';


const deployContracts = async (web3) => {
  const bundleRegistry = await deployContract(web3, BundleRegistryJson.abi, BundleRegistryJson.bytecode);
  return {bundleRegistry};
};

export default deployContracts;
