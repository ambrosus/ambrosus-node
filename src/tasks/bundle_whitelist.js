import {createWeb3} from '../utils/web3_tools';
import commandLineArgs from 'command-line-args';
import ContractManager from '../services/contract_manager';

const optionDefinitions = [
  {name: 'add', type: Boolean},
  {name: 'remove', type: Boolean},
  {name: 'check', type: Boolean},
  {name: 'geturl', type: Boolean},
  {name: 'seturl', type: Boolean},
  {name: 'address', alias: 'a', type: String, multiple: true, defaultValue: []},
  {name: 'url', alias: 'u', type: String, multiple: true, defaultValue: []}
];

const DEFAULT_GAS = 4700000;

const ensureSameLength = (array1, array2) => {
  if ((array1.length || array2.length) && array1.length !== array2.length) {
    throw new Error('Different length of addreses and url lists');
  }
};

console.log('Connecting to AMB chain...');
createWeb3()
  .then(async (web3) => {
    console.log('Connected.');
    const bundleRegistry = new ContractManager(web3).bundleProofRegistryContract();
    const options = commandLineArgs(optionDefinitions);
    if ([options.add, options.remove, options.check, options.geturl, options.seturl].filter((opt) => opt).length !== 1) {
      console.error('One of the arguments --add, --remove or --check should be given, e.g.');
      console.error('yarn run ops:bundle:whitelist --add -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466" -u "node.ambrosus.com"');
      console.error('yarn run ops:bundle:whitelist --remove -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"');
      console.error('yarn run ops:bundle:whitelist --check -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"');
      console.error('yarn run ops:bundle:whitelist --seturl -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466" -u "node.amb.to"');
      console.error('yarn run ops:bundle:whitelist --geturl -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"');
      return;
    }
    if (options.add) {
      ensureSameLength(options.address, options.url);
      await addToWhiteList(web3, bundleRegistry, options.address, options.url);
    }
    if (options.remove) {
      await removeFromWhiteList(web3, bundleRegistry, options.address);
    }
    if (options.check) {
      await checkWhiteList(web3, bundleRegistry, options.address);
    }
    if (options.geturl) {
      await getUrl(web3, bundleRegistry, options.address);
    }
    if (options.seturl) {
      ensureSameLength(options.address, options.url);
      await setUrl(web3, bundleRegistry, options.address, options.url);
    }
  })
  .catch(console.error);

const addToWhiteList = async (web3, bundleRegistry, addresses, urls) => {
  for (const index in addresses) {
    try {
      await bundleRegistry.methods.addToWhitelist(addresses[index], urls[index]).send({
        from: web3.eth.defaultAccount,
        gas: DEFAULT_GAS
      });
      console.log(`${addresses[index]} was added to whitelist`);
    } catch (err) {
      console.error(`Failed to add ${addresses[index]} to whitelist\n${err}`);
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
      console.log(result === true ? `✔️ ${address} is whitelisted` : `🚫 ${address} is not whitelisted`);
    } catch (err) {
      console.error(err);
    }
  }
};

const getUrl = async (web3, bundleRegistry, addresses) => {
  for (const address of addresses) {
    try {
      const result = await bundleRegistry.methods.getUrlForVendor(address).call();
      console.log(`Url for ${address} is ${result}`);
    } catch (err) {
      console.error(err);
    }
  }
};

const setUrl = async (web3, bundleRegistry, addresses, urls) => {
  for (const index in addresses) {
    try {
      await bundleRegistry.methods.changeVendorUrl(addresses[index], urls[index]).send({
        from: web3.eth.defaultAccount,
        gas: DEFAULT_GAS
      });
      console.log(`${addresses[index]} was added to whitelist`);
    } catch (err) {
      console.error(`Failed to add ${addresses[index]} to whitelist\n${err}`);
    }
  }
};
