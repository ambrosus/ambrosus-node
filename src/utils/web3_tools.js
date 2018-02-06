import Web3 from 'web3';
import config from 'config';

function isValidRPCAddress(rpc) {
  return /^((?:http)|(?:ws)):\/\//g.test(rpc);
}

function isUsingGenache(rpc) {
  return rpc === 'ganache';
}

function createGenacheProvider() {
  // import in code with purpose:D
  const Ganache = require('ganache-core');
  const ganacheOptions = {
    accounts: [{balance: '1000000000000000000000000000'}]
  };
  return Ganache.provider(ganacheOptions);
}

function tryToImportPrivateKey(web3) {
  try {
    const privateKey = process.env.WEB3_PRIVATEKEY || config.get('web3.privateKey');
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
  } catch (err) {
    // silently ignore -> we don't care
  }
}

export async function createWeb3() {
  const web3 = new Web3();

  const rpc = process.env.WEB3_RPC || config.get('web3.rpc');

  if (isValidRPCAddress(rpc)) {
    web3.setProvider(rpc);
    tryToImportPrivateKey(web3);
  } else if (isUsingGenache('ganache')) {
    web3.setProvider(createGenacheProvider);
    [web3.eth.defaultAccount] = (await web3.eth.getAccounts());
  } else {
    throw new Error('A configuration value for web3 rpc server is missing');
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
