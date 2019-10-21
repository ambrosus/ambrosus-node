/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class OrganizationRepository {
  constructor(db) {
    this.db = db;
  }

  async disable(organizationId) {
    await this.db.collection('organization').updateOne({organizationId}, {$set : {active: false, organizationId}});
  }

  async enable(organizationId) {
    await this.db.collection('organization').updateOne({organizationId}, {$set : {active: true, organizationId}});
  }

  async isActive(organizationId) {
    const organization = await this.db.collection('organization').findOne({organizationId});

    if (organization === null) {
      return true;
    }

    return organization.active;
  }
}
