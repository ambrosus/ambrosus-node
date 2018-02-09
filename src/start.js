import Server from './server';
import {connectToMongo} from './utils/db_utils';
import {createWeb3} from './utils/web3_tools';
import IdentityManager from './services/identity_manager';
import EntityBuilder from './services/entity_builder';
import EntityStorage from './services/entity_repository';
import AccountRepository from './services/account_repository';
import DataModelEngine from './services/data_model_engine';
import LinkHelper from './services/link_helper';

async function start() {
  const {db} = await connectToMongo();
  const web3 = await createWeb3();

  const identityManager = new IdentityManager(web3);
  const entityBuilder = new EntityBuilder(identityManager);
  const entityRepository = new EntityStorage(db);
  const accountRepository = new AccountRepository(db);
  const modelEngine = new DataModelEngine(identityManager, entityBuilder, entityRepository, accountRepository);
  const linkHelper = new LinkHelper();

  const server = new Server(modelEngine, linkHelper);

  server.start();  
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
