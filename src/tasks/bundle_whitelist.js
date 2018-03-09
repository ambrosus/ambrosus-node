import {createWeb3} from '../utils/web3_tools';
import commandLineArgs from 'command-line-args';
import ContractManager from '../services/contract_manager';

const optionDefinitions = [
  {name: 'add', type: Boolean},
  {name: 'remove', type: Boolean},
  {name: 'check', type: Boolean},
  {name: 'address', alias: 'a', type: String, multiple: true, defaultValue: []}
];

const DEFAULT_GAS = 4700000;

console.log('Connecting to AMB chain');
createWeb3()
  .then(async (web3) => {
    console.log('Connected');
    const bundleRegistry = new ContractManager(web3).bundleProofRegistryContract();
    const options = commandLineArgs(optionDefinitions);
    if ([options.add, options.remove, options.check].filter((opt) => opt).length !== 1) {
      console.error('One of the arguments --add, --remove or --check should be given');
      return;
    }
    if (options.add) {
      await addToWhiteList(web3, bundleRegistry, options.address);
    }
    if (options.remove) {
      await removeFromWhiteList(web3, bundleRegistry, options.address);
    }
    if (options.check) {
      await checkWhiteList(web3, bundleRegistry, options.address);
    }
  })
  .catch(console.error);

const addToWhiteList = async (web3, bundleRegistry, addresses) => {
  for (const address of addresses) {
    try {
      await bundleRegistry.methods.addToWhitelist(address).send({
        from: web3.eth.defaultAccount,
        gas: DEFAULT_GAS
      });
      console.log(`${address} was added to whitelist`);
    } catch (err) {
      console.error(`Failed to add ${address} to whitelist\n${err}`);
    }
  }
};

const removeFromWhiteList = async (web3, bundleRegistry, addresses) => {
  for (const address of addresses) {
    try {
      await bundleRegistry.methods.removeFromWhitelist(address).send({
        from: web3.eth.defaultAccount,
        gas: DEFAULT_GAS
      });
      console.log(`${address} was removed from whitelist`);
    } catch (err) {
      console.error(`Failed to remove ${address} from whitelist\n${err}`);
    }
  }
};

const checkWhiteList = async (web3, bundleRegistry, addresses) => {
  for (const address of addresses) {
    try {
      const result = await bundleRegistry.methods.isWhitelisted(address).call();
      console.log(result ? `✔️ ${address} is whitelisted` : `🚫 ${address} is not whitelisted`);
    } catch (err) {
      console.error(err);
    }
  }
};


