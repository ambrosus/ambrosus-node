import {MongoClient} from 'mongodb';
import config from 'config';

async function connectToMongo() {
  const uri = process.env.MONGODB_URI || config.get('mongo.db_uri');
  const database = process.env.MONGODB_DATABASE || config.get('mongo.database');
  const client = await MongoClient.connect(uri);
  const db = await client.db(database);
  return {client, db};
}

export default connectToMongo;
