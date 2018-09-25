/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// import {deployContract, link} from '../../src/utils/web3_tools';
import {contractJsons} from '../utils/contracts_consts';
import Deployer from './deployer';


const deployAll = async (web3, privateKey, logger) => {
  const deployingAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(deployingAccount);

  const deployer = new Deployer(web3, deployingAccount.address);

  const params = {
    head: {
      owner: deployingAccount.address
    },
    validatorSet: {
      owner: deployingAccount.address,
      initialValidators : [],
      superUser: deployingAccount.address
    },
    blockRewards: {
      owner: deployingAccount.address,
      baseReward: '2000000000000000000',
      superUser: deployingAccount.address
    }
  };

  const {head} = await deployer.deploy(contractJsons, {}, [], params);

  logger.info({message: 'Contracts successfully deployed', head: head.options.address});

  return head;
};

// const deployLibraries = async (web3) => ({SafeMathExtensions: await deployContract(web3, contractJsons.safeMathExtensions.abi, contractJsons.safeMathExtensions.bytecode)});

// const getContractConstructor = (contractJson) => contractJson.abi.find((value) => value.type === 'constructor');

// const contractToAddress = (contract) => contract.options.address;

// const linkLibraries = (libraries, contracts) => {
//   for (const contractName in contracts) {
//     for (const lib of Object.entries(libraries)) {
//       const [libName, libContract] = lib;
//       link(contracts[contractName], libName, libContract);
//     }
//   }
// };

// const deployOne = async (defaultJson, web3, head) => {
//   const contractJson = defaultJson;

//   const constructorArgs = [];
//   const constructor = getContractConstructor(contractJson);
//   if (constructor !== undefined && constructor.inputs.find((input) => input.name === '_head' && input.type === 'address') !== undefined) {
//     constructorArgs.push(head.options.address);
//   }

//   return deployContract(web3, contractJson.abi, contractJson.bytecode, constructorArgs);
// };

// const deployContracts = async (contractJsons, web3, head) => {
//   const deployedContracts = {};
//   for (const contractName in contractJsons) {
//     deployedContracts[contractName] = await deployOne(contractJsons[contractName], web3, head);
//   }
//   const contextConstructorParams = getContractConstructor(contractJsons.context)
//     .inputs
//     .map((input) => input.name.slice(1));

//   if (!contextConstructorParams.every((key) => contractJsons[key] !== undefined)) {
//     throw 'Missing a parameter for context constructor';
//   }

//   return contextConstructorParams.map((key) => contractToAddress(deployedContracts[key]));
// };

export default deployAll;
