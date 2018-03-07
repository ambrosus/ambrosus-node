import {MongoClient} from 'mongodb';
import Config from './config';

const connectToMongo = async () => {
  const uri = Config.get('mongo.db_uri', process.env.MONGODB_URI);
  const database = Config.get('mongo.database', process.env.MONGODB_DATABASE);
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
