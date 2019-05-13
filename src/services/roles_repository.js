/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';

export default class RolesRepository {
  constructor(rolesWrapper, configWrapper) {
    this.rolesWrapper = rolesWrapper;
    this.configWrapper = configWrapper;
  }

  async onboardedRole(address) {
    const roleIndex = await this.rolesWrapper.onboardedRole(address);
    return new Role(roleIndex);
  }

  async onboardAsAtlas(address, url, stake = '10000000000000000000000') {
    await this.rolesWrapper.onboardAsAtlas(address, stake, url);
  }

  async onboardAsHermes(address, url) {
    await this.rolesWrapper.onboardAsHermes(address, url);
  }

  async nodeUrl(address) {
    const url = await this.rolesWrapper.nodeUrl(address);
    validateAndCast({url})
      .required(['url'])
      .isUrl(['url']);
    return url;
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
