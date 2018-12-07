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

  async beginWorkWhenPossible(workType, timeoutInSeconds, maxTries, iterationCallback) {
    const sleep = async (timeout) => new Promise((resolve) => {
      setTimeout(resolve, timeout * 1000);
      if (iterationCallback) {
        iterationCallback();
      }
    });
    let iterationCount = 0;
    while (iterationCount < maxTries) {
      iterationCount++;
      try {
        return await this.tryToBeginWork(workType);
      } catch (err) {
        if (err.message === 'Work of this type is currently in progress') {
          await sleep(timeoutInSeconds);
        } else {
          throw err;
        }
      }
    }
    throw new Error(`Could not start ${workType} task after ${maxTries} retries`);
  }
}
