/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getDefaultAddress, loadContract} from '../utils/web3_tools';

import {contractJsons} from '../utils/contracts_consts';
import RolesWrapper from './contract_wrappers/roles_wrapper';
import ConfigWrapper from './contract_wrappers/config_wrapper';
import UploadsWrapper from './contract_wrappers/uploads_wrapper';
import FeesWrapper from './contract_wrappers/fees_wrapper';
import ChallengesWrapper from './contract_wrappers/challenges_wrapper';
import ShelteringWrapper from './contract_wrappers/sheltering_wrapper';

export default class ContractManager {
  constructor(web3, headContractAddress) {
    this.web3 = web3;
    if (headContractAddress) {
      this.head = loadContract(web3, contractJsons.head.abi, headContractAddress);
    } else {
      throw new Error('Head contract address is not configured');
    }
    this.rolesWrapper = new RolesWrapper(this);
    this.configWrapper = new ConfigWrapper(this);
    this.uploadsWrapper = new UploadsWrapper(this);
    this.feesWrapper = new FeesWrapper(this);
    this.challengesWrapper = new ChallengesWrapper(this);
    this.shelteringWrapper = new ShelteringWrapper(this);
  }

  defaultAddress() {
    return getDefaultAddress(this.web3);
  }

  async contractByKey(contractName) {
    const contractAddress = await this.contractAddressFromContext(contractName);
    return loadContract(this.web3, contractJsons[contractName].abi, contractAddress);
  }

  async contractAddressFromContext(contractName) {
    const availableContracts = [
      'kycWhitelist',
      'roles',
      'fees',
      'challenges',
      'payouts',
      'shelteringTransfers',
      'sheltering',
      'uploads',
      'config'
    ];

    if (!availableContracts.includes(contractName)) {
      throw new Error('Requested contract does not exist');
    }

    const context = await this.context();
    const from  = this.defaultAddress();
    return context.methods[`${contractName}()`]().call({from});
  }

  async context() {
    const from = getDefaultAddress(this.web3);
    const contextAddress = await this.head
      .methods
      .context()
      .call({from});
    return loadContract(this.web3, contractJsons.context.abi, contextAddress);
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

  async shelteringContract() {
    return this.contractByKey('sheltering');
  }

  async uploadsContract() {
    return this.contractByKey('uploads');
  }

  async configContract() {
    return this.contractByKey('config');
  }
}
