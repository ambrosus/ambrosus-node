/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import config from '../../src/config/config';

import FindQueryObject from '../../src/services/find_query_object';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('FindQueryObject', () => {
  let findQueryObject;
  let db;
  let client;
  let mockParams;
  let blacklistedFields;
  let assembledOptions;
  let mockSortingKey;

  before(async () => {
    ({db, client} = await connectToMongo(config));
    mockParams = {perPage : 2, page : 2};
    findQueryObject = new FindQueryObject(db, 'mockName', mockParams);
    blacklistedFields = {
      _id: 0,
      repository: 0
    };
    mockSortingKey = 'aabb';
    assembledOptions = {
      skip : 4,
      limit : 2,
      sort : mockSortingKey,
      projection : blacklistedFields
    };
  });

  after(async () => {
    await cleanDatabase(db);
    client.close();
  });

  it('doesn\'t have default sorting key', () => {
    expect(() => findQueryObject.getSortingKey()).to.throw(Error);
  });

  it('doesn\'t have default assemble query method', () => {
    expect(() => findQueryObject.assembleQuery()).to.throw(Error);
  });

  it('doesn\'t have default item transformer', () => {
    const res = findQueryObject.getItemTransformer();
    expect(res).to.equal(null);
  });

  it('has default blacklisted fields', () => {
    const res = findQueryObject.getBlacklistedFields();
    expect(res).to.deep.equal(blacklistedFields);
  });

  it('assembles options for query', () => {
    const mockGetSortingKey = sinon.stub(findQueryObject, 'getSortingKey');
    mockGetSortingKey.returns(mockSortingKey);

    const res = findQueryObject.assembleOptionsForQuery();
    expect(res).to.deep.equal(assembledOptions);

    mockGetSortingKey.restore();
  });

  describe('query execution', () => {
    let res;
    let mockAssembleOptionsForQuery;
    let mockAssembleQuery;
    let mockGetItemTransformer;

    before(async () => {
      await db.collection('mockName').insertOne({item : 1});
      await db.collection('mockName').insertOne({item : 2});
      await db.collection('mockName').insertOne({item : 3});
      await db.collection('mockName').insertOne({item : 4});
      await db.collection('mockName').insertOne({item : 5});
      await db.collection('mockName').insertOne({item : 6});
      await db.collection('mockName').insertOne({item : 7});
      await db.collection('mockName').insertOne({item : 8});

      mockAssembleOptionsForQuery = sinon.stub(findQueryObject, 'assembleOptionsForQuery');
      mockAssembleOptionsForQuery.returns(assembledOptions);

      mockAssembleQuery = sinon.stub(findQueryObject, 'assembleQuery');
      mockAssembleQuery.resolves();

      mockGetItemTransformer = sinon.stub(findQueryObject, 'getItemTransformer');
      mockGetItemTransformer.returns((result) => result.item);

      res = await findQueryObject.execute();
    });

    it('assembles options', () => {
      expect(mockAssembleOptionsForQuery).to.have.been.called;
    });

    it('assembles query', () => {
      expect(mockAssembleQuery).to.have.been.called;
    });

    it('uses item transformer', () => {
      expect(mockGetItemTransformer).to.have.been.called;
    });

    it('returns transformed results', () => {
      expect(res.results).to.deep.equal([5, 6]);
      expect(res.resultCount).to.deep.equal(8);
    });

    after(() => {
      mockAssembleOptionsForQuery.restore();
      mockAssembleQuery.restore();
      mockGetItemTransformer.restore();
    });
  });
});
