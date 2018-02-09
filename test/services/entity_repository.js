import chai from 'chai';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {createAsset} from '../fixtures/asset_fixture_builder';
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
    const returnedAsset = await storage.getAsset(exmapleAssetId);
    expect(exampleAsset).to.deep.equal(returnedAsset);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(() => {
    client.close();
  });
});
