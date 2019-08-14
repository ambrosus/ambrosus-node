/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class OperationalModeRepository {
  constructor(db) {
    this.db = db;
  }

  async set(mode) {
    await this.db.collection('operationalmode').updateOne({_id:1}, {$set : {_id:1, ...mode}}, {upsert : true});
  }

  async updateInfo(info) {
    await this.db.collection('operationalmode').updateOne({_id:1}, {$set : {info}});
  }

  async get() {
    return this.db.collection('operationalmode').findOne({_id:1}, {projection: {_id: 0}});
  }
}
