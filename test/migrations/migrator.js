/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import config from '../../config/config';
import Migrator from '../../src/migrations/Migrator';
import EmptyLogger from '../helpers/empty_logger';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Migrator', () => {
  let db;
  let client;
  let migrator;
  let logger;
  let clock;
  const migrationSleepTimeInSeconds = 3;
  const now = 1500000;

  before(async () => {
    ({db, client} = await connectToMongo(config));
    migrator = new Migrator(db, {
      migrationSleepTimeInSeconds
    });
    logger = new EmptyLogger();
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers(now * 1000);
  });

  afterEach(async () => {
    await cleanDatabase(db);
    clock.restore();
  });

  after(() => {
    client.close();
  });

  it('initMigrationsCollection inserts new document with version=0 and migrationRunning=false when collection is empty', async () => {
    await migrator.initMigrationsCollection();
    expect(await db.collection('migrations').findOne({})).to.include({version: 0, migrationRunning: false});
  });

  it('initMigrationsCollection performs no modifications when collection is not empty', async () => {
    await db.collection('migrations').insertOne({version: 123, migrationRunning: true});
    await migrator.initMigrationsCollection();
    expect(await db.collection('migrations').findOne({})).to.include({version: 123, migrationRunning: true});
    expect(await db.collection('migrations').find({})
      .count()).to.equal(1);
  });

  describe('initMigrations', () => {
    it('inserts new document with version=0 and migrationRunning=false when collection is empty', async () => {
      await migrator.initMigrations(logger);
      expect(await db.collection('migrations').findOne({})).to.include({version: 0});
    });

    it('sets migrationRunning to true when no other migration is running', async () => {
      await db.collection('migrations').insertOne({version: 123, migrationRunning: false});
      await migrator.initMigrations(logger);
      expect(await db.collection('migrations').findOne({})).to.include({version: 123, migrationRunning: true});
    });

    it('works correctly if migrationRunning field does not exist in the migration document', async () => {
      await db.collection('migrations').insertOne({version: 123});
      await migrator.initMigrations(logger);
      expect(await db.collection('migrations').findOne({})).to.include({version: 123, migrationRunning: true});
    });

    it('waits until the other migration is finished', async () => {
      const expectedIterationsCount = 5;
      migrator.sleepFunction = async () => {
        callCount++;
        if (callCount === expectedIterationsCount) {
          await migrator.markMigrationAsDone();
        }
        clock.tick(migrationSleepTimeInSeconds * 1000);
      };
      await migrator.initMigrations(logger);
      let callCount = 0;
      await migrator.waitForOtherMigrationsAndMarkAsStarted(logger);
      expect(callCount).to.equal(expectedIterationsCount);
      expect(await db.collection('migrations').findOne({})).to.include({version: 0, migrationRunning: true});
    });
  });

  it('markMigrationAsDone sets migrationRunning to false', async () => {
    await migrator.initMigrations(logger);
    await migrator.markMigrationAsDone();
    expect(await db.collection('migrations').findOne({})).to.include({migrationRunning: false});
  });
});
