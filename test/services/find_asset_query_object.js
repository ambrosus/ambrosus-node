/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import FindAssetQueryObjectFactory, {FindAssetQueryObject} from '../../src/services/find_asset_query_object';
import {createAsset} from '../fixtures/assets_events';
import config from '../../src/config/config';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;



describe('Find Asset Query Object', () => {
  let db;
  let client;
  let findAssetQueryObjectFactory;
  let findAssetQueryObject;
  let assets;

  before(async () => {
    ({db, client} = await connectToMongo(config));
    assets = [
      {assetId: '0x0', ...createAsset({timestamp: 1, createdBy: '0x123'})},
      {assetId: '0x1', ...createAsset({timestamp: 2, createdBy: '0xabc'})},
      {assetId: '0x2', ...createAsset({timestamp: 3, createdBy: '0x123'})},
      {assetId: '0x3', ...createAsset({timestamp: 4, createdBy: '0xabc'})}
    ];
    await db.collection('assets').insertOne({...assets[0]});
    await db.collection('assets').insertOne({...assets[1]});
    await db.collection('assets').insertOne({...assets[2]});
    await db.collection('assets').insertOne({...assets[3]});
    findAssetQueryObjectFactory = new FindAssetQueryObjectFactory(db);
    findAssetQueryObject = findAssetQueryObjectFactory.create();
  });

  after(async () => {
    await cleanDatabase(db);
    client.close();
  });

  it('is created by FindAccountQueryObjectFactory', () => {
    expect(findAssetQueryObject instanceof FindAssetQueryObject).to.be.true;
  });

  it('has default sorting key', () => {
    expect(findAssetQueryObject.getSortingKey()).to.be.deep.equal([['content.idData.timestamp', 'descending']]);
  });

  it('default assemble options', async () => {
    expect(findAssetQueryObject.assembleOptionsForQuery()).to.deep.equal({
      skip: 0,
      limit: 100,
      sort: [['content.idData.timestamp', 'descending']],
      projection: {
        _id: 0,
        repository: 0
      }
    });
  });

  it('executed returns assets sorted by timestamp', async () => {
    const found = await findAssetQueryObject.execute();
    expect(found.results).to.deep.equal([assets[3], assets[2], assets[1], assets[0]]);
    expect(found.resultCount).to.equal(4);
  });

  it('with createdBy param returns events for selected creator', async () => {
    findAssetQueryObject = findAssetQueryObjectFactory.create({createdBy: '0x123'});
    const found = await findAssetQueryObject.execute();
    expect(found.results).have.lengthOf(2);
    expect(found.resultCount).to.equal(2);
    expect(found.results).to.deep.equal([assets[2], assets[0]]);
    found.results.forEach((element) => expect(element.content.idData.createdBy).to.equal('0x123'));
  });

  it('when given page and perPage, returns requested number of assets from requested page', async () => {
    findAssetQueryObject = findAssetQueryObjectFactory.create({perPage: 1, page: 1});
    const found = await findAssetQueryObject.execute();
    expect(found.results).to.deep.equal([assets[2]]);
    expect(found.resultCount).to.equal(4);
  });

  describe('Find by timestamp', () => {
    it('finds all before toTimestamp inclusively', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({toTimestamp: 2});
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[1], assets[0]]);
      expect(found.resultCount).to.equal(2);
    });

    it('finds all after fromTimestamp inclusively', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({fromTimestamp: 2});
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[3], assets[2], assets[1]]);
      expect(found.resultCount).to.equal(3);
    });

    it('finds all between timestamps inclusively', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({toTimestamp: 3, fromTimestamp: 2});
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[2], assets[1]]);
      expect(found.resultCount).to.equal(2);
    });

    it('finds all in the exact moment when fromTimestamp=toTimestamp', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({toTimestamp: 2, fromTimestamp: 2});
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[1]]);
      expect(found.resultCount).to.equal(1);
    });

    it('finds none when fromTimestamp>toTimestamp', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({toTimestamp: 2, fromTimestamp: 3});
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([]);
      expect(found.resultCount).to.equal(0);
    });

    it('finds none if nothing is in the scope', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({fromTimestamp: 1000});
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([]);
      expect(found.resultCount).to.equal(0);
    });
  });

  it('when given list of possible assets selects only among them', async () => {
    findAssetQueryObject = findAssetQueryObjectFactory.create({assetIds: ['0x0', '0x2']});
    const found = await findAssetQueryObject.execute();
    expect(found.results).to.deep.equal([assets[2], assets[0]]);
    expect(found.resultCount).to.equal(2);
  });
});
