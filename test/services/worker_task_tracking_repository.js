/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import config from '../../config/config';

import WorkerTaskTrackingRepository from '../../src/services/worker_task_tracking_repository';
import sinon from 'sinon';

const {expect} = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Worker Task Tracking Repository', () => {
  let db;
  let client;
  let storage;
  let clock;
  const exampleTaskType = 'deliveringAmbrosia';
  const anotherExampleTaskType = 'castingLightnings';
  const fakeTaskId = 'hephaestusDidNotKnowAboutPompei';
  const now = 15000000000;

  const expectedErrorMessage = 'Work of this type is currently in progress';

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new WorkerTaskTrackingRepository(db);
    clock = sinon.useFakeTimers(now);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    clock.restore();
    client.close();
  });

  it('saves task start time', async () => {
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
    expect(await db.collection('workerTasks').findOne({}, {fields: {_id: 0}})).to.deep.equal({
      startTime: new Date(now),
      workType: exampleTaskType
    });
  });

  it('throws if tried to begin task that is already running', async () => {
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.rejectedWith(expectedErrorMessage);
  });

  it('ends task properly', async () => {
    const workId = await storage.tryToBeginWork(exampleTaskType);
    await expect(storage.finishWork(workId)).to.be.fulfilled;
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
  });

  it('allows to simultaneously start task of different type', async () => {
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
    await expect(storage.tryToBeginWork(anotherExampleTaskType)).to.be.fulfilled;
  });

  it(`when different task types are in progress 'finishWork' only finishes requested one`, async () => {
    const workId = await storage.tryToBeginWork(exampleTaskType);
    await expect(storage.tryToBeginWork(anotherExampleTaskType)).to.be.fulfilled;
    await expect(storage.finishWork(workId)).to.be.fulfilled;

    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
    await expect(storage.tryToBeginWork(anotherExampleTaskType)).to.be.rejectedWith(expectedErrorMessage);
  });

  it(`nothing happens if there is an attempt to finish a non-existent task`, async () => {
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
    await expect(storage.finishWork(fakeTaskId)).to.be.fulfilled;
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.rejectedWith(expectedErrorMessage);
  });

  describe('Waiting for possibility to start work', () => {
    describe('waitForChainSync', () => {
      const timeout = 3;
      let clock;
      let callbackSpy;
      let tryToBeginWorkStub;

      beforeEach(() => {
        callbackSpy = null;
        tryToBeginWorkStub = sinon.stub(storage, 'tryToBeginWork');
      });

      before(() => {
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        tryToBeginWorkStub.restore();
      });

      after(() => {
        clock.restore();
      });

      it('tries to start a task every `timeout` seconds', async () => {
        tryToBeginWorkStub.rejects(new Error(expectedErrorMessage));
        let callCount = 0;
        const workId = await storage.beginWorkWhenPossible(exampleTaskType, timeout, 100, () => {
          callCount++;
          expect(tryToBeginWorkStub).to.have.callCount(callCount);
          if (callCount === 10) {
            tryToBeginWorkStub.resolves(fakeTaskId);
          }
          clock.tick(timeout * 1000);
        });

        expect(tryToBeginWorkStub).to.have.callCount(11);
        expect(workId).to.equal(fakeTaskId);
      });

      it('does not sleep when the task can be started', async () => {
        const spy = sinon.spy();
        await expect(storage.beginWorkWhenPossible(exampleTaskType, timeout, 100, spy)).to.be.fulfilled;
        expect(spy).to.be.not.called;
      });

      it('throws when tryToBeginWorkStub throws exception different from WorkInProgress', async () => {
        tryToBeginWorkStub.rejects(new Error('Unexpected exception'));
        await expect(storage.beginWorkWhenPossible(exampleTaskType, timeout, 100)).to.be.rejected;
      });

      it('throws when task could not be started after `maxTries` tries', async () => {
        tryToBeginWorkStub.rejects(new Error(expectedErrorMessage));
        await expect(storage.beginWorkWhenPossible(exampleTaskType, timeout, 10, () => clock.tick(timeout * 1000))).to.be.rejected;
        expect(tryToBeginWorkStub).to.have.callCount(10);
      });
    });
  });
});
