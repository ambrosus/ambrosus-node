import {MongoClient} from 'mongodb';
import Config from './config';

const connectToMongo = async (mongoUri, mongoDatabase) => {
  const uri = mongoUri || Config.mongoDbUri();
  const database = mongoDatabase || Config.mongoDbDatabase();
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
