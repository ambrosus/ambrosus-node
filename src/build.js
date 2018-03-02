import {connectToMongo} from './utils/db_utils';
import {createWeb3} from './utils/web3_tools';
import IdentityManager from './services/identity_manager';
import TokenAuthenticator from './utils/token_authenticator';
import EntityBuilder from './services/entity_builder';
import EntityStorage from './services/entity_repository';
import AccountRepository from './services/account_repository';
import DataModelEngine from './services/data_model_engine';
import AccountAccessDefinitions from './services/account_access_definitions';

export default async function build() {
  const {db, client} = await connectToMongo();
  const web3 = await createWeb3();
  const identityManager = new IdentityManager(web3);
  const tokenAuthenticator = new TokenAuthenticator(identityManager);  
  const entityBuilder = new EntityBuilder(identityManager);
  const entityRepository = new EntityStorage(db);
  const accountRepository = new AccountRepository(db);
  const accountAccessDefinitions = new AccountAccessDefinitions(identityManager);
  const dataModelEngine = new DataModelEngine(identityManager, tokenAuthenticator, entityBuilder, entityRepository, accountRepository,
    accountAccessDefinitions);
  return {dataModelEngine, client};
}
