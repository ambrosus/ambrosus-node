import writeFile from '../utils/write_file';
import build from '../build';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';
import {deployContract, getDefaultAddress} from '../../src/utils/web3_tools';

async function createAdminAccount(dataModelEngine) {
  try {
    console.log('Creating admin account created');
    const account = await dataModelEngine.createAdminAccount();
    console.log(`Address: ${account.address}`);
    console.log(`Secret:  ${account.secret}`);
  } catch (exception) {
    console.log(exception.message);
  }
}

async function whitelist(bundleRegistryContract, dataModelEngine) {
  const {web3} = dataModelEngine.proofRepository;
  const address = await getDefaultAddress(web3);
  await bundleRegistryContract
    .methods
    .addToWhitelist(address, 'whatever')
    .send({
      from: address,
      gas: 2000000
    });
}

async function deployRegistryContract(dataModelEngine) {
  console.log('\nDeploying bundle registry contract...');
  const bundleRegistryContract = await deployContract(
    dataModelEngine.proofRepository.web3,
    BundleRegistry.abi,
    BundleRegistry.bytecode);

  const contractAddress = bundleRegistryContract.options.address;
  const fileName = './config/registryContractAddress.json';
  console.log(`Contract deployed at ${contractAddress}`);
  whitelist(bundleRegistryContract, dataModelEngine);
  await writeFile(fileName, `"${contractAddress}"`);
  console.log(`Contract address stored in ${fileName}.`);
}

async function setupDevelopment(dataModelEngine) {
  await createAdminAccount(dataModelEngine);
  await deployRegistryContract(dataModelEngine);
}

build()
  .then(async ({client, dataModelEngine}) => {
    await setupDevelopment(dataModelEngine);
    await client.close();
  })
  .catch((exception) => {
    console.error(exception);
    process.exit(1);
  });
