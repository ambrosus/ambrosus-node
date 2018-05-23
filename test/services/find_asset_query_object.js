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
import {createAsset} from '../fixtures/assets_events';

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
      createAsset({timestamp : 1}),
      createAsset({timestamp : 2}),
      createAsset({timestamp : 3})
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
});
