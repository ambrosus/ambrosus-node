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

  async onboardAsAtlas(address, stake, url) {
    const rolesContract = await this.contractManager.rolesContract();
    await rolesContract
      .methods
      .onboardAsAtlas(url)
      .send({
        from: address,
        value: stake
      });
  }

  async onboardAsHermes(address, url) {
    const rolesContract = await this.contractManager.rolesContract();
    await rolesContract
      .methods
      .onboardAsHermes(url)
      .send({
        from: address
      });
  }
}

export class Role {
  constructor(roleIndex) {
    this.roleIndex = parseInt(roleIndex, 10);
  }

  get name() {
    const roleNames = ['NONE', 'ATLAS', 'HERMES', 'APOLLO'];
    return roleNames[this.roleIndex];
  }

  static get NONE() {
    return new Role(0);
  }

  static get ATLAS() {
    return new Role(1);
  }

  static get HERMES() {
    return new Role(2);
  }

  static get APOLLO() {
    return new Role(3);
  }

  is(role) {
    return this.roleIndex === role.roleIndex;
  }

  toString() {
    return this.name;
  }
}
