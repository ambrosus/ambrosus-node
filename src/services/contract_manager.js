/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getDefaultAddress, loadContract} from '../utils/web3_tools';

import {contractsJsons, serviceContractsJsons} from '../utils/contracts_consts';

export default class ContractManager {
  constructor(web3, headContractAddress) {
    this.web3 = web3;
    if (headContractAddress) {
      this.head = loadContract(web3, serviceContractsJsons.head.abi, headContractAddress);
    } else {
      throw new Error('Head contract address is not configured');
    }
  }

  async contractByKey(contractName) {
    const contractAddress = await this.contractAddressFromContext(contractName);
    return loadContract(this.web3, contractsJsons[contractName].abi, contractAddress);
  }

  async contractAddressFromContext(contractName) {
    const availableContracts = [
      'kycWhitelist',
      'roles',
      'fees',
      'challenges',
      'payouts',
      'shelteringTransfers',
      'uploads',
      'config'
    ];

    if (!availableContracts.includes(contractName)) {
      throw new Error('Requested contract does not exist');
    }

    const context = await this.context();
    const from  = getDefaultAddress(this.web3);
    return context.methods[`${contractName}()`]().call({from});
  }

  async context() {
    const from = getDefaultAddress(this.web3);
    const contextAddress = await this.head
      .methods
      .context()
      .call({from});
    return loadContract(this.web3, serviceContractsJsons.context.abi, contextAddress);
  }

  async kycWhitelistContract() {
    return this.contractByKey('kycWhitelist');
  }

  async rolesContract() {
    return this.contractByKey('roles');
  }

  async feesContract() {
    return this.contractByKey('fees');
  }

  async challengesContract() {
    return this.contractByKey('challenges');
  }

  async payoutsContract() {
    return this.contractByKey('payouts');
  }

  async shelteringTransfersContract() {
    return this.contractByKey('shelteringTransfers');
  }

  async uploadsContract() {
    return this.contractByKey('uploads');
  }

  async configContract() {
    return this.contractByKey('config');
  }
}
