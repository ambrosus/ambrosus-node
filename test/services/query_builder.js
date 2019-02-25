/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import QueryBuilder from '../../src/services/query_builder';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('QueryBuilder', () => {
  let queryBuilder;

  beforeEach(() => {
    queryBuilder = new QueryBuilder();
  });

  it('adds query parts', () => {
    queryBuilder.add('partOne');
    queryBuilder.add('partTwo');
    expect(queryBuilder.queryParts).to.deep.equal(['partOne', 'partTwo']);
  });

  it('composes empty query', () => {
    const res = queryBuilder.compose();
    expect(res).to.deep.equal({});
  });

  it('composes query with one item', () => {
    queryBuilder.add('partOne');
    const res = queryBuilder.compose();
    expect(res).to.deep.equal('partOne');
  });

  it('composes query with two or more items', () => {
    queryBuilder.add('partOne');
    queryBuilder.add('partTwo');
    queryBuilder.add('partThree');
    const res = queryBuilder.compose();
    expect(res).to.deep.equal({$and: ['partOne', 'partTwo', 'partThree']});
  });
});
