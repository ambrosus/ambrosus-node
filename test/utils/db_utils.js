/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect} from 'chai';
import {createMongoUrl, uploadJSONToGridFSBucket, connectToMongo, cleanDatabase, downloadJSONFromGridFSBucket, isFileInGridFSBucket} from '../../src/utils/db_utils';
import {GridFSBucket} from 'mongodb';
import config from '../../src/config/config';


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

describe('GridFS helper functions', () => {
  let db;
  let client;
  const exampleJsonObject = {
    fidget: {
      foo: 'bar'
    },
    spinners: [
      5, 'a string', true
    ]
  };
  const exampleFilename = 'test-file';

  before(async () => {
    ({db, client} = await connectToMongo(config));
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    client.close();
  });

  it('reads stored object', async () => {
    const testBucket = new GridFSBucket(db, {bucketName: 'testbucket'});
    expect(isFileInGridFSBucket(exampleFilename, testBucket)).to.eventually.be.false;

    await uploadJSONToGridFSBucket(exampleFilename, exampleJsonObject, testBucket);
    const returnedJsonObject = await downloadJSONFromGridFSBucket(exampleFilename, testBucket);

    expect(isFileInGridFSBucket(exampleFilename, testBucket)).to.eventually.be.true;
    expect(returnedJsonObject).to.deep.equal(exampleJsonObject);
  });
});
