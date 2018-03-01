import Web3 from 'web3';
import config from 'config';

function isValidRPCAddress(rpc) {
  return /^((?:http)|(?:ws)):\/\//g.test(rpc);
}

function isUsingGanache(rpc) {
  return rpc === 'ganache';
}

function createGanacheProvider() {
  // import in code with purpose:D
  const Ganache = require('ganache-core');
  const ganacheOptions = {
    accounts: [{balance: '100000000000000000000'}]
  };
  return Ganache.provider(ganacheOptions);
}

async function ganacheTopUpDefaultAccount(web3) {
  const [firstGanacheMasterAccount] = await web3.eth.getAccounts();
  const defaultAddress = await getDefaultAddress(web3);
  await web3.eth.sendTransaction({
    from: firstGanacheMasterAccount,
    to: defaultAddress,
    value: web3.utils.toWei('10', 'ether')
  });
}

function importPrivateKey(web3) {
  try {
    const privateKey = process.env.WEB3_NODEPRIVATEKEY || config.get('web3.nodePrivateKey');
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
  } catch (err) {
    throw new Error('A configuration value for web3 node private key is missing');
  }
}

export async function createWeb3() {
  const web3 = new Web3();

  const rpc = process.env.WEB3_RPC || config.get('web3.rpc');

  if (isValidRPCAddress(rpc)) {
    web3.setProvider(rpc);
    importPrivateKey(web3);
  } else if (isUsingGanache(rpc)) {
    web3.setProvider(createGanacheProvider());
    importPrivateKey(web3);
    ganacheTopUpDefaultAccount(web3);
  } else {
    throw new Error('A configuration value for web3 rpc server is missing');
  }

  return web3;
}

export async function getDefaultAddress(web3) {
  // note: web3.eth.defaultAccount actually stores an address of the default account, and not the full account :P
  const {defaultAccount} = web3.eth;
  if (!defaultAccount) {
    throw new Error('web3 doesn\'t have a default account set. Check your configuration');
  }
  return defaultAccount;
}

export async function getDefaultPrivateKey(web3) {
  const defaultAddress = await getDefaultAddress(web3);
  const account = web3.eth.accounts.wallet[defaultAddress];
  return account.privateKey;
}
