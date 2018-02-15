import chai from 'chai';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {createAsset, createEvent} from '../fixtures/asset_fixture_builder';
import {put} from '../../src/utils/dict_utils';

import EntityRepository from '../../src/services/entity_repository';

const {expect} = chai;

describe('Entity Repository', () => {
  let db;
  let client;
  let storage;

  before(async () => {
    ({db, client} = await connectToMongo());
    storage = new EntityRepository(db);
  });

  it('Assets', async () => {
    const exmapleAssetId = '0x123456';
    const exampleAsset = put(createAsset(), 'assetId', exmapleAssetId);
    await storage.storeAsset(exampleAsset);
    await expect(storage.getAsset(exmapleAssetId)).to.eventually.be.deep.equal(exampleAsset);
    const otherAssetId = '0x33333';
    await expect(storage.getAsset(otherAssetId)).to.eventually.be.equal(null);
  });

  it('Events', async () => {
    const exampleEventId = '0x123456';
    const exampleEvent = put(createEvent(), 'eventId', exampleEventId);
    await storage.storeEvent(exampleEvent);
    await expect(storage.getEvent(exampleEventId)).to.eventually.be.deep.equal(exampleEvent);
    const otherEventId = '0x33333';
    await expect(storage.getEvent(otherEventId)).to.eventually.be.equal(null);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(() => {
    client.close();
  });
});
