/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class WorkerIntervalsRepository {
  constructor(db) {
    this.db = db;
  }

  async delete(name) {
    await this.db.collection('worker_intervals').deleteOne({name});
  }

  async get(name) {
    return this.db.collection('worker_intervals').findOne({name}, {projection: {_id: 0}});
  }
}
