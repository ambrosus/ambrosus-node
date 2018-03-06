import {createWeb3, deployContract} from '../utils/web3_tools';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';

async function deployBundleRegistry() {
  const web3 = await createWeb3();
  return deployContract(web3, BundleRegistry);
}

deployBundleRegistry()
  .then((contract) => {
    console.log(`Bundle registry has been deployed at: ${contract.options.address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
