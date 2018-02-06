import Web3 from 'web3';
import config from 'config';
import BN from 'bn.js';

const defaultGas = 4712388;

const decimals = 18;

export async function createWeb3() {
  const web3 = new Web3();

  // take the RPC value from the config and create a provider
  const rpc = process.env.WEB3_RPC || config.get('web3.rpc');
  if (/^((?:http)|(?:ws)):\/\//g.test(rpc)) {
    web3.setProvider(rpc);
  } else if (rpc === 'ganache') {
    // import in code with purpose:D
    const Ganache = require('ganache-core');
    const defaultBalance = '1000000000000000000000000000';
    const ganacheOptions = {
      accounts: [{balance: defaultBalance}]
    };
    web3.setProvider(Ganache.provider(ganacheOptions));
    [web3.eth.defaultAccount] = (await web3.eth.getAccounts());
  } else {
    throw new Error('A configuration value for web3 rpc server is missing');
  }

  // optionaly: take the privateKey value from the config and import the account into the web3 wallet
  try {
    const privateKey = process.env.WEB3_PRIVATEKEY || config.get('web3.privateKey');
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
  } catch (err) {
    // we don't care
  }

  return web3;
}

export async function getDefaultAccount(web3) {
  const {defaultAccount} = web3.eth;
  if (!defaultAccount) {
    throw new Error('web3 doesn\'t have a default account set. Check your configuration');
  }
  return defaultAccount;
}

export async function deployContract(web3, contractJson, args = [], options = {}) {
  const defaultAccount = await getDefaultAccount(web3);
  const augmentedOptions = {
    from: defaultAccount,
    gas: defaultGas,
    ...options
  };
  const contract = await new web3.eth.Contract(contractJson.abi)
    .deploy({data: contractJson.bytecode, arguments: args})
    .send(augmentedOptions);
  contract.setProvider(web3.currentProvider);
  return contract;
}

export function toWei(value) {
  const suffix = '0'.repeat(decimals);
  return new BN(`${value}${suffix}`);
}
