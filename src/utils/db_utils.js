/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MongoClient} from 'mongodb';
import querystring from 'querystring';
import StringReadStream from './string_read_stream';
import StringWriteStream from './string_write_stream';

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
  const client = await MongoClient.connect(url, {useNewUrlParser: true});
  const db = await client.db(config.mongoDBName);
  return {client, db};
};

const cleanDatabase = async (db) => {
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

const asyncPipe = async (readStream, writeStream) => new Promise((resolve, reject) => {
  writeStream.on('finish', () => resolve());
  writeStream.on('error', (err) => reject(err));
  readStream.pipe(writeStream);
});

const isFileInGridFSBucket = async (filename, bucket) => {
  const gridFSCursor = await bucket.find({filename});
  return await gridFSCursor.count() > 0;
};

const uploadJSONToGridFSBucket = async (filename, json, bucket) => {
  const writeStream = bucket.openUploadStream(
    filename,
    {
      contentType: 'application/json'
    }
  );

  const serializedJSON = JSON.stringify(json);
  const readStream = new StringReadStream(serializedJSON);

  await asyncPipe(readStream, writeStream);
};

const downloadJSONFromGridFSBucket = async (filename, bucket) => {
  const readStream = bucket.openDownloadStreamByName(filename);
  const writeStream = new StringWriteStream();

  await asyncPipe(readStream, writeStream);

  const serializedJSON = writeStream.get();
  return JSON.parse(serializedJSON);
};

export {connectToMongo, cleanDatabase, createMongoUrl, isFileInGridFSBucket, uploadJSONToGridFSBucket, downloadJSONFromGridFSBucket};
