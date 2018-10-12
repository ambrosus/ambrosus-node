/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect} from 'chai';
import {createMongoUrl, mongoObjectSize} from '../../src/utils/db_utils';

describe('createMongoUrl', () => {
  it('parses config with credentials and replica set', () => {
    const url = createMongoUrl({
      mongoHosts: 'mongo1.com,mongo2.com',
      mongoReplicaSet: 'my_replica_set',
      mongoUser: 'salvador',
      mongoPassword: 'allende'
    });
    expect(url).to.eql(
      'mongodb://salvador:allende@mongo1.com,mongo2.com/?replicaSet=my_replica_set&authSource=admin'
    );
  });

  it('parses config with credentials', () => {
    const url = createMongoUrl({
      mongoHosts: 'mongo1.com,mongo2.com',
      mongoUser: 'salvador',
      mongoPassword: 'allende'
    });
    expect(url).to.eql(
      'mongodb://salvador:allende@mongo1.com,mongo2.com/?authSource=admin'
    );
  });

  it('parses config with replica set', () => {
    const url = createMongoUrl({
      mongoHosts: 'mongo1.com,mongo2.com',
      mongoReplicaSet: 'my_replica_set'
    });
    expect(url).to.eql(
      'mongodb://mongo1.com,mongo2.com/?replicaSet=my_replica_set'
    );
  });

  it('parses config without credentials and replica set', () => {
    const url = createMongoUrl({
      mongoHosts: 'mongo1.com,mongo2.com'
    });
    expect(url).to.eql('mongodb://mongo1.com,mongo2.com/?');
  });
});

describe('mongoObjectSize', () => {
  it('returns size of an object', async () => {
    expect(mongoObjectSize({foo: 1, bar: 3})).to.equal(23);
  });
});
