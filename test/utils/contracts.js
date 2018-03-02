import BundleStorageJson from '../../build/contracts/BundleStorage.json';
import {deployContract} from '../../src/utils/web3_tools';


const deployContracts = async (web3) => {
  const bundleStorage = await deployContract(web3, BundleStorageJson);
  return {bundleStorage};
};

export default deployContracts;
