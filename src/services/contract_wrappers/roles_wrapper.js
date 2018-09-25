/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';

export default class RolesWrapper extends ContractWrapper {
  get getContractName() {
    return 'roles';
  }

  async onboardedRole(address) {
    const contract = await this.contract();
    return contract.methods.getOnboardedRole(address).call();
  }

  async nodeUrl(address) {
    const contract = await this.contract();
    return contract.methods.getUrl(address).call();
  }

  async onboardAsApollo(address, deposit) {
    const contract = await this.contract();
    return contract.methods.onboardAsApollo().send({
      from: address,
      value: deposit
    });
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

  async selfOnboardAsApollo(deposit) {
    return this.onboardAsApollo(this.defaultAddress, deposit);
  }

  async selfOnboardAsAtlas(stake, url) {
    return this.onboardAsAtlas(this.defaultAddress, stake, url);
  }

  async selfOnboardAsHermes(url) {
    return this.onboardAsHermes(this.defaultAddress, url);
  }
}
