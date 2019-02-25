/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


export default class WorkerLogRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0
    };
  }

  async storeLog(log) {
    await this.db.collection('workerLogs').insertOne({...log});
  }

  async getLogs(logCount) {
    const cursor = await this.db.collection('workerLogs').find({}, {projection: this.blacklistedFields})
      .sort({timestamp: -1})
      .limit(logCount);
    return await cursor.toArray();
  }
}
