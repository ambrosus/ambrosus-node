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
