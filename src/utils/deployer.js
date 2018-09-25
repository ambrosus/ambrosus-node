/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import SafeMathExtensionsJson from '../../contracts/SafeMathExtensions.json';

import {DEFAULT_GAS, deployContract, loadContract, link} from './web3_tools';

const getContractConstructor = (contractJson) => contractJson.abi.find((value) => value.type === 'constructor');

export default class Deployer {
  constructor(web3, sender, gas = DEFAULT_GAS) {
    this.web3 = web3;
    this.sender = sender;
    this.gas = gas;
  }

  async deployLibs() {
    return {
      SafeMathExtensions: await deployContract(this.web3, SafeMathExtensionsJson, [], {from: this.sender})
    };
  }

  async deployOrLoadContracts(jsons, alreadyDeployed, skipDeployment, libs, params) {
    const contracts = {};

    // first load already deployed contracts
    for (const [contractName, address] of Object.entries(alreadyDeployed)) {
      contracts[contractName] = await this.loadContract(jsons[contractName], address);
    }

    const generateConstructorParameterList = (jsons, params) => Object.entries(jsons)
      .map(([contractName, json]) => {
        const constructorMethod = getContractConstructor(json);
        const constructorParams = constructorMethod !== undefined ? constructorMethod.inputs.map((input) => ({paramName: input.name.slice(1), paramType: input.type})) : [];
        const resolvedParams = constructorParams.reduce(
          (acc, {paramName}) => {
            if (params[contractName] !== undefined && params[contractName][paramName] !== undefined) {
              acc[paramName] = params[contractName][paramName];
            }
            return acc;
          },
          {}
        );
        return {
          contractName,
          constructorParams,
          resolvedParams
        };
      });

    // prepare constructor parameter list. Filter out skipped and already deployed contracts.
    let waiting = generateConstructorParameterList(jsons, params)
      .filter(({contractName}) => alreadyDeployed[contractName] === undefined)
      .filter(({contractName}) => skipDeployment.indexOf(contractName) === -1);

    const resolveConstructorParameters = (list, params) => list.map((entry) => {
      entry.constructorParams.forEach(({paramName, paramType}) => {
        if (entry.resolvedParams[paramName] !== undefined) {
          return;
        }
        if (paramType === 'address' && params[paramName] !== undefined) {
          entry.resolvedParams[paramName] = params[paramName];
        }
      });
      return entry;
    });

    // resolve deployed contracts
    waiting = resolveConstructorParameters(
      waiting,
      alreadyDeployed
    );

    // resolve skipped contracts
    waiting = resolveConstructorParameters(
      waiting,
      skipDeployment.reduce(
        (acc, key) => {
          acc[key] = '0x0';
          return acc;
        },
        {}
      )
    );

    // iteratively deploy the waiting contracts
    const unresolvedParametersCount = (entry) => entry.constructorParams.length - Object.keys(entry.resolvedParams).length;
    while (waiting.length > 0) {
      waiting.sort((left, right) => unresolvedParametersCount(left) - unresolvedParametersCount(right));
      const entry = waiting.shift();
      if (unresolvedParametersCount(entry) > 0) {
        const unresolvedParameters = entry.constructorParams.map(({paramName}) => paramName).filter((paramName) => entry.resolvedParams[paramName] === undefined);
        throw `Failed to satisfy dependencies (${unresolvedParameters}) to deploy: ${entry.contractName}`;
      }
      const contract = await this.deployContract(
        jsons[entry.contractName],
        entry.constructorParams.map(({paramName}) => entry.resolvedParams[paramName]),
        libs
      );
      contracts[entry.contractName] = contract;
      waiting = resolveConstructorParameters(waiting, {[entry.contractName]: contract.options.address});
    }

    return contracts;
  }

  async loadContract(json, address) {
    return loadContract(this.web3, json.abi, address);
  }

  async deployContract(json, params, libs) {
    // link with libraries
    for (const [libName, libContract] of Object.entries(libs)) {
      link(json, libName, libContract);
    }

    // deploy
    return deployContract(this.web3, json, params, {from: this.sender});
  }

  async deployContext(contextJson, contracts) {
    return this.deployContract(
      contextJson,
      [
        Object.values(contracts).map((contract) => contract.options.address),
        contracts.catalogue.options.address
      ],
      []
    );
  }

  async updateContextPointer(contracts) {
    await contracts.head.methods.setContext(contracts.context.options.address).send({
      gas: this.gas,
      from: this.sender
    });
  }

  async transferOwnerships(contracts) {
    const {validatorSet, blockRewards, validatorProxy} = contracts;
    if (validatorSet !== undefined && validatorProxy !== undefined) {
      const validatorSetOwner = await validatorSet.methods.owner().call();
      if (validatorSetOwner === validatorProxy.options.address) {
        // nothing to do
      } else if (validatorSetOwner === this.sender) {
        await validatorSet.methods.transferOwnership(validatorProxy.options.address).send({from: this.sender});
      } else {
        throw `Failed to transfer ownership for validator set contract to validator proxy. The current owner ${validatorSetOwner} remains`;
      }
    }
    if (blockRewards !== undefined && validatorProxy !== undefined) {
      const blockRewardsOwner = await blockRewards.methods.owner().call();
      if (blockRewardsOwner === validatorProxy.options.address) {
        // nothing to do
      } else if (blockRewardsOwner === this.sender) {
        await contracts.blockRewards.methods.transferOwnership(validatorProxy.options.address).send({from: this.sender});
      } else {
        throw `Failed to transfer ownership for block rewards contract to validator proxy. The current owner ${blockRewardsOwner} remains`;
      }
    }
  }

  async deploy(jsons, alreadyDeployed, skipDeployment = [], params = {}) {
    const libs = await this.deployLibs();
    const {context: contextJson, ...jsonsWithoutContext} = jsons;
    const contracts = await this.deployOrLoadContracts(jsonsWithoutContext, alreadyDeployed, skipDeployment, libs, params);
    contracts.context = await this.deployContext(contextJson, contracts);
    await this.updateContextPointer(contracts);
    await this.transferOwnerships(contracts);

    return contracts;
  }
}
