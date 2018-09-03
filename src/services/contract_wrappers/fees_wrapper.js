/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';
import BN from 'bn.js';

export default class FeesWrapper extends ContractWrapper {
  async contract() {
    return this.contractManager.feesContract();
  }

  async feeForUpload(storagePeriods) {
    const contract = await this.contract();
    return contract.methods.getFeeForUpload(storagePeriods).call();
  }

  async checkIfEnoughFunds(fee) {
    const balance = new BN(await this.web3.eth.getBalance(this.contractManager.defaultAddress()));
    return balance.gte(new BN(fee));
  }
}
