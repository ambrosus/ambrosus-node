/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import Query, {EventQuery} from '../../src/services/query';

const {expect} = chai;

describe('Query object', () => {
  it('Should add parts to query', async () => {
    const query = new Query();
    expect(query.compose()).to.deep.equal({});
    query.add({foo: 'bar'});
    expect(query.compose()).to.deep.equal({foo: 'bar'});
    query.add({foo: 'bar'});
    expect(query.compose()).to.deep.equal({$and: [{foo: 'bar'}, {foo: 'bar'}]});
  });

  describe('Event query object', () => {
    let query;

    beforeEach(() => {
      query = new EventQuery();
    });

    it('addDataAccessLevelLimitationIfNeeded adds its part if needed', async () => {
      query.addDataAccessLevelLimitationIfNeeded(2);
      expect(query.compose()).to.deep.equal({'content.idData.accessLevel': {$lte: 2}});
      query.addDataAccessLevelLimitationIfNeeded(3);
      expect(query.compose()).to.deep.equal({'content.idData.accessLevel': {$lte: 2}});
      query.addDataAccessLevelLimitationIfNeeded(1);
      expect(query.compose()).to.deep.equal({'content.idData.accessLevel': {$lte: 1}});
    });
  });
});
