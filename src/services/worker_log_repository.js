/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


export default class WorkerLogRepository {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.blacklistedFields = {
      _id: 0
    };
  }

  async initializeIndex() {
    await this.db.createCollection('workerLogs');
    if ((await this.db.collection('workerLogs').indexes()).length > 1) {
      // There exists other index besides _id
      await this.db.collection('workerLogs').dropIndexes();
    }
    await this.db.collection('workerLogs').createIndex({timestamp: -1}, {expireAfterSeconds: this.config.workerLogsTTLInSeconds});
  }

  async storeLog(log) {
    await this.db.collection('workerLogs').insertOne({...log});
  }

  async getLogs(logCount) {
    const cursor = await this.db.collection('workerLogs').find({}, {fields: this.blacklistedFields})
      .sort({timestamp: -1})
      .limit(logCount);
    return await cursor.toArray();
  }
}
