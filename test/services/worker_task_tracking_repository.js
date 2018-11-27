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

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Worker Log Repository', () => {
  let db;
  let client;
  let storage;
  const exampleTaskType = 'deliveringAmbrosia';
  const anotherExampleTaskType = 'castingLightnings';
  const fakeTaskId = 'hephaestusDidNotKnowAboutPompei';

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new WorkerTaskTrackingRepository(db);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    client.close();
  });

  it('throws if tried to begin task that is already running', async () => {
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.rejectedWith('Work of this type is currently in progress');
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
    await expect(storage.tryToBeginWork(anotherExampleTaskType)).to.be.rejectedWith('Work of this type is currently in progress');
  });

  it(`nothing happens if there is an attempt to finish a non-existent task`, async () => {
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.fulfilled;
    await expect(storage.finishWork(fakeTaskId)).to.be.fulfilled;
    await expect(storage.tryToBeginWork(exampleTaskType)).to.be.rejectedWith('Work of this type is currently in progress');
  });
});
