import {MongoClient} from 'mongodb';
import Config from './config';

const connectToMongo = async () => {
  const uri = Config.mongoDbUri();
  const database = Config.mongoDbDatabase();
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
