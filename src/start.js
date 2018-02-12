import Server from './server';
import {connectToMongo} from './utils/db_utils';
import {createWeb3} from './utils/web3_tools';
import IdentityManager from './services/identity_manager';
import DataObjectBuilder from './services/data_object_builder';
import DataModelEngine from './services/data_model_engine';

async function start() {
  const {db} = await connectToMongo();
  const web3 = await createWeb3();

  const identityManager = new IdentityManager(web3);
  const objectBuilder = new DataObjectBuilder(identityManager);
  const modelEngine = new DataModelEngine(objectBuilder);

  const server = new Server(db, identityManager, objectBuilder, modelEngine);

  server.start();  
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
