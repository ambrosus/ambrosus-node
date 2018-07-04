/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import FindAssetQueryObjectFactory, {FindAssetQueryObject} from '../../src/services/find_asset_query_object';
import {createAsset, createEvent} from '../fixtures/assets_events';

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
    ({db, client} = await connectToMongo());
    assets = [
      {assetId: '0x0', ...createAsset({timestamp: 1, createdBy: '0x123'})},
      {assetId: '0x1', ...createAsset({timestamp: 2, createdBy: '0xabc'})},
      {assetId: '0x2', ...createAsset({timestamp: 3, createdBy: '0x123'})}
    ];
    await db.collection('assets').insertOne({...assets[0]});
    await db.collection('assets').insertOne({...assets[1]});
    await db.collection('assets').insertOne({...assets[2]});
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

  it('executed returns assets sorted by timestamp', async () => {
    const found = await findAssetQueryObject.execute();
    expect(found.results).to.deep.equal([assets[2],assets[1],assets[0]]);
    expect(found.resultCount).to.equal(3);
  });

  it('with createdBy param returns events for selected creator', async () => {
    findAssetQueryObject = findAssetQueryObjectFactory.create({createdBy: '0x123'});
    const found = await findAssetQueryObject.execute();
    expect(found.results).have.lengthOf(2);
    expect(found.resultCount).to.equal(2);
    expect(found.results).to.deep.equal([assets[2],assets[0]]);
    found.results.forEach((element) => expect(element.content.idData.createdBy).to.equal('0x123'));
  });

  it('when given page and perPage, returns requested number of assets from requested page', async () => {
    findAssetQueryObject = findAssetQueryObjectFactory.create({perPage: 1, page: 1});
    const found = await findAssetQueryObject.execute();
    expect(found.results).to.deep.equal([assets[1]]);
    expect(found.resultCount).to.equal(3);
  });

  describe('Select by identifiers', () => {
    let events;

    before(async () => {
      events = [
        await createEvent({assetId: assets[0].assetId}, [{type: 'ambrosus.event.identifiers', id: '1'}]),
        await createEvent({assetId: assets[0].assetId, timestamp: 2}, [{type: 'ambrosus.event.identifiers', id: '2'}]),
        await createEvent({assetId: assets[1].assetId, accessLevel: 2}, [{type: 'ambrosus.event.identifiers', id: '2',
          id2: 'abc'}]),
        await createEvent({assetId: assets[2].assetId}, [{type: 'some.other.type', id: '3'}])
      ];
      await Promise.all(events.map((event) => db.collection('events').insertOne({...event})));
    });

    it('returns assets with matching identifiers', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({identifier: {id: '2'}}, 100);
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[1], assets[0]]);
      expect(found.resultCount).to.equal(2);
    });

    it('finds assets when select by several ids', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({identifier: {id: '2', id2: 'abc'}}, 100);
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[1]]);
      expect(found.resultCount).to.equal(1);
    });

    it('omits assets when the access level in event was higher than user\'s', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({identifier: {id: '2'}}, 1);
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[0]]);
      expect(found.resultCount).to.equal(1);
    });

    it('when access level was not given assumes it equals 0', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({identifier: {id: '2'}});
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([assets[0]]);
      expect(found.resultCount).to.equal(1);
    });

    it('ignores events with type other than ambrosus.event.identifiers', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({identifier: {id: '3'}}, 100);
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([]);
      expect(found.resultCount).to.equal(0);
    });

    it('returns empty array when unknown identifier', async () => {
      findAssetQueryObject = findAssetQueryObjectFactory.create({identifier: {unknownId: '3'}}, 100);
      const found = await findAssetQueryObject.execute();
      expect(found.results).to.deep.equal([]);
      expect(found.resultCount).to.equal(0);
    });
  });
});
