/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class WorkerTaskTrackingRepository {
  constructor(db) {
    this.db = db;
  }

  statuses = {
    running: 'RUNNING',
    timeout: 'TIMEOUT',
    success: 'SUCCESS',
    failure: 'FAILURE'
  };

  async markExpiredTasks() {
    await this.db.collection('workerTasks').updateMany({
      status: this.statuses.running,
      taskTimeout: {$lte: new Date()}
    }, {
      $set: {status: this.statuses.timeout}
    });
  }

  async isTaskRunning(workType) {
    return (await this.db.collection('workerTasks').findOne({
      status: this.statuses.running,
      workType
    })) !== null;
  }

  async tryToBeginWork(workType, taskTimeout) {
    await this.markExpiredTasks();
    if (await this.isTaskRunning(workType)) {
      throw new Error('Work of this type is currently in progress');
    }
    const startTime = new Date();
    const {insertedId} = await this.db.collection('workerTasks').insertOne({
      startTime,
      endTime: null,
      taskTimeout: new Date(startTime.getTime() + (taskTimeout * 1000)),
      workType,
      status: this.statuses.running
    });
    return insertedId;
  }

  async finishWork(taskId, success = true) {
    const status = success ? this.statuses.success : this.statuses.failure;
    await this.db.collection('workerTasks').updateOne({_id: taskId}, {$set: {status, endTime: new Date()}});
  }
}
