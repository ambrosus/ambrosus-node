/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MongoClient} from 'mongodb';
import querystring from 'querystring';
import bson from 'bson';

const createMongoUrl = (config) => {
  const query = {};
  let credentials = '';

  if (config.mongoReplicaSet) {
    query.replicaSet = config.mongoReplicaSet;
  }

  if (config.mongoUser) {
    const user = encodeURIComponent(config.mongoUser);
    const password = encodeURIComponent(config.mongoPassword);
    credentials = `${user}:${password}@`;

    query.authSource = 'admin';
  }

  const queryStr = `?${querystring.stringify(query)}`;
  return `mongodb://${credentials}${config.mongoHosts}/${queryStr}`;
};

const connectToMongo = async (config) => {
  const url = createMongoUrl(config);
  const client = await MongoClient.connect(url);
  const db = await client.db(config.mongoDBName);
  return {client, db};
};

const cleanDatabase = async (db) => {
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

const mongoObjectSize = new bson.BSON().calculateObjectSize;

export {connectToMongo, cleanDatabase, createMongoUrl, mongoObjectSize};
