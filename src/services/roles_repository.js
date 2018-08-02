/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class RolesRepository {
  constructor(contractManager) {
    this.contractManager = contractManager;
  }

  async onboardedRole(address) {
    const rolesContract = await this.contractManager.rolesContract();
    const roleIndex = await rolesContract.methods.getOnboardedRole(address).call();
    return new Role(roleIndex);
  }
}

class Role {
  constructor(roleIndex) {
    this.roleIndex = parseInt(roleIndex, 10);
  }

  get index() {
    return this.roleIndex;
  }

  get name() {
    const roleNames = ['NONE', 'ATLAS', 'HERMES', 'APOLLO'];
    return roleNames[this.index];
  }
}
