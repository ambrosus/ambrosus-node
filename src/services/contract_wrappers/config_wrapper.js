/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint-disable new-cap */
import ContractWrapper from './contract_wrapper';

export default class ConfigWrapper extends ContractWrapper {
  get getContractName() {
    return 'config';
  }

  async atlas1Stake() {
    const contract = await this.contract();
    return contract.methods.ATLAS1_STAKE().call();
  }

  async challengeDuration() {
    const contract = await this.contract();
    return contract.methods.CHALLENGE_DURATION().call();
  }

  async bundleSizeLimit() {
    const contract = await this.contract();
    return contract.methods.BUNDLE_SIZE_LIMIT().call();
  }
}
