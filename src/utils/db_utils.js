/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MongoClient} from 'mongodb';
import fs from 'fs';
import querystring from 'querystring';

const connectToMongo = async (config) => {
  const query = {};
  const options = {};
  let user = '';

  if (config.mongoReplicaSet) {
    Object.assign(query, {replicaSet: config.mongoReplicaSet});
  }

  if (config.mongoX509User) {
    Object.assign(query, {
      ssl: true,
      authMechanism: 'MONGODB-X509'
    });

    Object.assign(options, {
      sslValidate: true,
      sslCA: [fs.readFileSync(config.mongoX509SslCaPath)],
      sslCert: fs.readFileSync(config.mongox509SslCertPath),
      sslKey: fs.readFileSync(config.mongox509SslKeyPath)
    });

    user = `${encodeURIComponent(config.mongoX509User)}@`;
  }

  const queryStr = querystring.stringify(query);
  const url = `mongodb://${user}${config.mongoHosts}/?${queryStr}`;

  const client = await MongoClient.connect(url, options);
  const db = await client.db(config.mongoDbName);
  return {client, db};
};

const cleanDatabase = async (db) => {
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

export {connectToMongo, cleanDatabase};
