/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MongoClient} from 'mongodb';
import Config from './config';
import url from 'url';

const connectToMongo = async (config = Config.default()) => {
  const uri = config.mongoUri();
  const database = url.parse(uri).pathname.substr(1);
  const client = await MongoClient.connect(uri);
  const db = await client.db(database);
  return {client, db};
};

const cleanDatabase = async (db) => {
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

export {connectToMongo, cleanDatabase};
