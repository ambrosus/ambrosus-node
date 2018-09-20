/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';

export default class RolesWrapper extends ContractWrapper {
  async contract() {
    return this.contractManager.rolesContract();
  }

  async onboardedRole(address) {
    const contract = await this.contract();
    return contract.methods.getOnboardedRole(address).call();
  }

  async selfOnboardedRole() {
    return this.onboardedRole(this.contractManager.defaultAddress());
  }

  async nodeUrl(address) {
    const contract = await this.contract();
    return contract.methods.getUrl(address).call();
  }

  async onboardAsAtlas(address, stake, url) {
    const contract = await this.contract();
    return contract.methods.onboardAsAtlas(url).send({
      from: address,
      value: stake
    });
  }

  async onboardAsHermes(address, url) {
    const contract = await this.contract();
    return contract.methods.onboardAsHermes(url).send({
      from: address
    });
  }
}
