/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import config from '../../src/config/config';

import WorkerLogRepository from '../../src/services/worker_log_repository';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Worker Log Repository', () => {
  let db;
  let client;
  let storage;
  const exampleLog = {foo: 'bar', timestamp: '1234'};

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new WorkerLogRepository(db);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    client.close();
  });

  it('db round trip works', async () => {
    await expect(storage.storeLog(exampleLog)).to.be.fulfilled;
    expect((await storage.getLogs(1))[0]).to.be.deep.equal(exampleLog);
  });

  it('returns expected number of newest logs', async () => {
    await expect(storage.storeLog(exampleLog)).to.be.fulfilled;
    await expect(storage.storeLog(exampleLog)).to.be.fulfilled;
    expect((await storage.getLogs(3)).length).to.be.equal(2);
    await expect(storage.storeLog(exampleLog)).to.be.fulfilled;
    expect((await storage.getLogs(3)).length).to.be.equal(3);
    await expect(storage.storeLog(exampleLog)).to.be.fulfilled;
    await expect(storage.storeLog(exampleLog)).to.be.fulfilled;
    expect((await storage.getLogs(3)).length).to.be.equal(3);
  });
});
