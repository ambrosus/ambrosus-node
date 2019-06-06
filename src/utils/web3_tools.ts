/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Web3 from 'web3';
import config, {Config} from '../config/config';
import BN from 'bn.js';
import {Account, Contract, Provider} from 'web3/types';

export const DEFAULT_GAS = 4700000;

function isValidRPCAddress(rpc: string): boolean {
  return /^((?:https?)|(?:ws)):\/\//g.test(rpc);
}

function isUsingGanache(rpc: string): boolean {
  return rpc === 'ganache';
}

async function createGanacheProvider(secretKey: string): Promise<Provider> {
  // import in code with purpose:D
  const Ganache = await import('ganache-core');
  const ganacheOptions = {
    accounts: [
      {
        balance: '100000000000000000000000000',
        secretKey
      },
      ...Array(9).fill({balance: '100000000000000000000000000'})
    ]
  };
  const provider = Ganache.provider(ganacheOptions);
  provider.setMaxListeners(750);
  return provider;
}

async function ganacheTopUpDefaultAccount(web3: Web3): Promise<void> {
  const [firstGanacheMasterAccount] = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({
    from: firstGanacheMasterAccount,
    to: getDefaultAddress(web3),
    value: web3.utils.toWei('10', 'ether'),
    gas: DEFAULT_GAS
  });
}

function importPrivateKey(web3: Web3, config: Config): Account {
  try {
    const privateKey = config.nodePrivateKey;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    return account;
  } catch (err) {
    throw new Error('A configuration value for web3 node private key is missing');
  }
}

export async function createWeb3(conf: Config = config): Promise<Web3> {
  const web3 = new Web3();

  const rpc = conf.web3Rpc;

  const account = importPrivateKey(web3, conf);

  if (isValidRPCAddress(rpc)) {
    web3.setProvider(new Web3.providers.HttpProvider(rpc));
  } else if (isUsingGanache(rpc)) {
    web3.setProvider(await createGanacheProvider(account.privateKey));
    await ganacheTopUpDefaultAccount(web3);
  } else {
    throw new Error('A configuration value for web3 rpc server is missing');
  }

  return web3;
}

export function getDefaultAddress(web3: Web3): string {
  // note: web3.eth.defaultAccount actually stores an address of the default account, and not the full account :P
  const {defaultAccount} = web3.eth;
  if (!defaultAccount) {
    throw new Error('web3 doesn\'t have a default account set. Check your configuration');
  }
  return defaultAccount;
}

export function getDefaultPrivateKey(web3: Web3): string {
  const defaultAddress = getDefaultAddress(web3);
  const account = web3.eth.accounts.wallet[defaultAddress];
  return account.privateKey;
}

export function loadContract(web3: Web3, abi: any[], address: string): Contract {
  return new web3.eth.Contract(abi, address, {
    gas: DEFAULT_GAS,
    gasPrice: web3.utils.toWei(config.defaultGasPrice.toString(), 'shannon')
  });
}
export async function deployContract(web3: Web3, json: any, args = [], options = {}): Promise<Contract> {
  const defaultAddress = getDefaultAddress(web3);
  return new web3.eth.Contract(json.abi, undefined, {
    gas: DEFAULT_GAS,
    gasPrice: web3.utils.toWei(config.defaultGasPrice.toString(), 'shannon')
  }).deploy({data: json.bytecode, arguments: args})
    .send({
      from: defaultAddress,
      gas: DEFAULT_GAS,
      ...options
    });
}

export function link(contract, name, library) {
  const address = library.options.address.replace('0x', '');
  const pattern = new RegExp(`_+${name}_+`, 'g');
  contract.bytecode = contract.bytecode.replace(pattern, address);
}

export async function isSyncing(web3) {
  const isSyncing = await web3.eth.isSyncing();
  if (isSyncing === false) {
    return false;
  }
  return isSyncing.currentBlock < isSyncing.highestBlock;
}

export async function waitForChainSync(web3, timeoutInSeconds, iterationCallback) {
  const sleep = async (timeout) => new Promise((resolve) => {
    setTimeout(resolve, timeout * 1000);
    if (iterationCallback) {
      iterationCallback();
    }
  });

  while (await isSyncing(web3)) {
    await sleep(timeoutInSeconds);
  }
}

export async function getBalance(web3, address) {
  return await web3.eth.getBalance(address);
}

export async function checkIfEnoughFundsToPayForGas(web3, address) {
  const maximalGasCost = new BN(DEFAULT_GAS).mul(web3.utils.toWei(new BN(config.defaultGasPrice), 'gwei'));
  return new BN(await getBalance(web3, address)).gte(maximalGasCost);
}

