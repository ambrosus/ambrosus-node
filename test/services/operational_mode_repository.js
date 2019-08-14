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

import OperationalModeRepository from '../../src/services/operational_mode_repository';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Operational Mode Repository', () => {
  let db;
  let client;
  let storage;
  const normalMode = {mode: 'normal', info: {}};
  const retireMode = {mode: 'retire', info: {}};
  const retireModeInfoA = {mode: 'retire', info: {total: 10, transfers: 0, transfered: 0}};
  const retireModeInfoB = {mode: 'retire', info: {total: 10, transfers: 5, transfered: 3}};

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new OperationalModeRepository(db);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    client.close();
  });

  it('set and get mode works', async () => {
    await expect(storage.set(normalMode)).to.be.fulfilled;
    expect(await storage.get()).to.be.deep.equal(normalMode);
    await expect(storage.set(retireMode)).to.be.fulfilled;
    expect(await storage.get()).to.be.deep.equal(retireMode);
  });

  it('update mode info works', async () => {
    await expect(storage.set(retireMode)).to.be.fulfilled;
    expect(await storage.get()).to.be.deep.equal(retireMode);
    await expect(storage.updateInfo(retireModeInfoA.info)).to.be.fulfilled;
    expect(await storage.get()).to.be.deep.equal(retireModeInfoA);
    await expect(storage.updateInfo(retireModeInfoB.info)).to.be.fulfilled;
    expect(await storage.get()).to.be.deep.equal(retireModeInfoB);
  });
});
