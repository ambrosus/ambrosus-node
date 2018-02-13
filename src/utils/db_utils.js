import {MongoClient} from 'mongodb';
import config from 'config';

const connectToMongo = async () => {
  const uri = process.env.MONGODB_URI || config.get('mongo.db_uri');  
  const database = process.env.MONGODB_DATABASE || config.get('mongo.database');  
  const client = await MongoClient.connect(uri);
  const db = await client.db(database);
  return {client, db};
};

const cleanDatabase = async (db) => {
  const collections = await db.collections();
  for (const colection of collections) {
    await colection.deleteMany({});
  }
};

export {connectToMongo, cleanDatabase};
