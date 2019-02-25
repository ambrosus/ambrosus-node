/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class WorkerTaskTrackingRepository {
  constructor(db) {
    this.db = db;
  }

  async tryToBeginWork(workType) {
    try {
      const {insertedId} = await this.db.collection('workerTasks').insertOne({
        startTime: new Date(),
        workType
      });
      return insertedId;
    } catch (error) {
      if (error.message.includes(`duplicate key error`)) {
        throw new Error('Work of this type is currently in progress');
      }
      throw error;
    }
  }

  async finishWork(taskId) {
    await this.db.collection('workerTasks').deleteOne({_id: taskId});
  }
}
