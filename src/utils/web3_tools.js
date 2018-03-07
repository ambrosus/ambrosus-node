import Web3 from 'web3';
import Config from './config';

const DEFAULT_GAS = 4700000;

function isValidRPCAddress(rpc) {
  return /^((?:http)|(?:ws)):\/\//g.test(rpc);
}

function isUsingGanache(rpc) {
  return rpc === 'ganache';
}

function createGanacheProvider(secretKey) {
  // import in code with purpose:D
  const Ganache = require('ganache-core');
  const ganacheOptions = {
    accounts: [
      {
        balance: '1000000000000000000000',
        secretKey
      }
    ]
  };
  return Ganache.provider(ganacheOptions);
}

async function ganacheTopUpDefaultAccount(web3) {
  const [firstGanacheMasterAccount] = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({
    from: firstGanacheMasterAccount,
    to: getDefaultAddress(web3),
    value: web3.utils.toWei('10', 'ether'),
    gas: DEFAULT_GAS
  });
}

function importPrivateKey(web3) {
  try {
    const privateKey = Config.nodePrivateKey();
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.defaultAccount = account.address;
    return account;
  } catch (err) {
    throw new Error('A configuration value for web3 node private key is missing');
  }
}

export async function createWeb3() {
  const web3 = new Web3();

  const rpc = Config.web3Rpc();

  // TODO rewrite after ganache is fixed https://github.com/trufflesuite/ganache-core/pull/74
  const account = importPrivateKey(web3);
  web3.eth.defaultAccount = account.address;
  if (isValidRPCAddress(rpc)) {
    web3.setProvider(rpc);
    web3.eth.accounts.wallet.add(account);
  } else if (isUsingGanache(rpc)) {
    web3.setProvider(createGanacheProvider(account.privateKey));
    await ganacheTopUpDefaultAccount(web3);
  } else {
    throw new Error('A configuration value for web3 rpc server is missing');
  }

  return web3;
}

export function getDefaultAddress(web3) {
  // note: web3.eth.defaultAccount actually stores an address of the default account, and not the full account :P
  const {defaultAccount} = web3.eth;
  if (!defaultAccount) {
    throw new Error('web3 doesn\'t have a default account set. Check your configuration');
  }
  return defaultAccount;
}

export async function deployContract(web3, contractJson, args = [], options = {}) {
  const defaultAddress = getDefaultAddress(web3);
  const contract = await new web3.eth.Contract(contractJson.abi)
    .deploy({data: contractJson.bytecode, arguments: args})
    .send({
      from: defaultAddress,
      gas: DEFAULT_GAS,
      ...options
    });
  contract.setProvider(web3.currentProvider);
  return contract;
}

export function getDefaultPrivateKey(web3) {
  const defaultAddress = getDefaultAddress(web3);
  const account = web3.eth.accounts.wallet[defaultAddress];
  if (account === undefined) {
    return Config.nodePrivateKey();
  }
  return account.privateKey;
}
