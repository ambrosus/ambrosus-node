/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import config from '../../config/config';

import WorkerTaskTrackingRepository from '../../src/services/worker_task_tracking_repository';
import sinon from 'sinon';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Worker Task Tracking Repository', () => {
  let db;
  let client;
  let storage;
  let clock;
  const exampleTaskType = 'deliveringAmbrosia';
  const exampleTaskTimeout = 10;
  const anotherExampleTaskType = 'castingLightnings';
  const fakeTaskId = 'hephaestusDidNotKnowAboutPompei';
  const now = 15000000000;

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new WorkerTaskTrackingRepository(db);
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);
  });

  afterEach(async () => {
    await cleanDatabase(db);
    clock.restore();
  });

  after(async () => {
    client.close();
  });

  const getAllTasks = async () => db.collection('workerTasks').find({}, {fields: {_id: 0}})
    .toArray();

  describe('Starting task', () => {
    it('adds startTime, endTime, taskTimeout, workType and status to mongo', async () => {
      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
      expect(await getAllTasks()).to.deep.equal([
        {
          startTime: new Date(now),
          endTime: null,
          taskTimeout: new Date(now + (exampleTaskTimeout * 1000)),
          workType: exampleTaskType,
          status: 'RUNNING'
        }]);
    });

    it('throws if tried to begin task that is already running', async () => {
      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be
        .rejectedWith('Work of this type is currently in progress');
    });

    it('allows to simultaneously start task of different type', async () => {
      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
      await expect(storage.tryToBeginWork(anotherExampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
    });

    it('allows to start new task of same type if previous task is still running after taskTimeout has passed',
      async () => {
        await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
        clock.tick((exampleTaskTimeout - 1) * 1000);
        await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be
          .rejectedWith('Work of this type is currently in progress');
        clock.tick(1000);
        await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
      });

    it('sets timedout task statuses to TIMEOUT', async () => {
      await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
      clock.tick(exampleTaskTimeout * 1000);
      await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
      expect((await getAllTasks())[0]).to.deep.equal(
        {
          startTime: new Date(now),
          endTime: null,
          taskTimeout: new Date(now + (exampleTaskTimeout * 1000)),
          workType: exampleTaskType,
          status: 'TIMEOUT'
        });
    });
  });

  it('markExpiredTasks should mark all expired tasks', async () => {
    await storage.tryToBeginWork('1', exampleTaskTimeout);
    await storage.tryToBeginWork('2', exampleTaskTimeout + 5);
    clock.tick(5000);
    await storage.tryToBeginWork('3', exampleTaskTimeout - 5);
    await storage.tryToBeginWork('4', exampleTaskTimeout);
    clock.tick(5000);
    await storage.markExpiredTasks();
    expect((await getAllTasks())
      .reduce((acc, {workType, status}) => ({...acc, [workType]: status}), {})).to.deep.equal(
      {
        1: 'TIMEOUT',
        2: 'RUNNING',
        3: 'TIMEOUT',
        4: 'RUNNING'
      });
  });

  it('isTaskRunning returns true only if task status is RUNNING', async () => {
    const taskId = await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
    expect(await storage.isTaskRunning(exampleTaskType)).to.be.true;
    await storage.finishWork(taskId);
    expect(await storage.isTaskRunning(exampleTaskType)).to.be.false;
  });

  describe('Finishing task', async () => {
    it('sets endTime to current timestamp', async () => {
      clock.tick(2000);
      const workId = await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
      await storage.finishWork(workId, true);
      expect((await getAllTasks())[0].endTime).to.deep.equal(new Date(now + 2000));
    });

    it('sets status to SUCCESS when the task has succeeded', async () => {
      const workId = await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
      await storage.finishWork(workId, true);
      expect((await getAllTasks())[0].status).to.equal('SUCCESS');
    });

    it('sets status to FAILED when the task has succeeded', async () => {
      const workId = await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
      await storage.finishWork(workId, false);
      expect((await getAllTasks())[0].status).to.equal('FAILURE');
    });

    it('new task of same type can be added after previous task has been finished', async () => {
      const workId = await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
      await expect(storage.finishWork(workId, true)).to.be.fulfilled;
      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
    });

    it(`when different task types are in progress 'finishWork' only finishes requested one`, async () => {
      const workId = await storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout);
      await expect(storage.tryToBeginWork(anotherExampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
      await expect(storage.finishWork(workId)).to.be.fulfilled;

      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
      await expect(storage.tryToBeginWork(anotherExampleTaskType, exampleTaskTimeout)).to.be
        .rejectedWith('Work of this type is currently in progress');
    });

    it(`nothing happens if there is an attempt to finish a non-existent task`, async () => {
      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be.fulfilled;
      await expect(storage.finishWork(fakeTaskId)).to.be.fulfilled;
      await expect(storage.tryToBeginWork(exampleTaskType, exampleTaskTimeout)).to.be
        .rejectedWith('Work of this type is currently in progress');
    });
  });

  it('creates index with correct ttl', async () => {
    expect((await db.collection('workerTasks').indexes())[1].expireAfterSeconds).to
      .equal(config.workerTasksTTLInSeconds);
  });
});
