import {connectToMongo} from './utils/db_utils';
import {createWeb3} from './utils/web3_tools';
import HttpsClient from './utils/https_client';
import IdentityManager from './services/identity_manager';
import TokenAuthenticator from './utils/token_authenticator';
import EntityBuilder from './services/entity_builder';
import EntityStorage from './services/entity_repository';
import AccountRepository from './services/account_repository';
import DataModelEngine from './services/data_model_engine';
import AccountAccessDefinitions from './services/account_access_definitions';
import ProofRepository from './services/proof_repository';
import ContractManager from './services/contract_manager';
import EntityDownloader from './services/entity_downloader';

async function build(_web3, mongoUri, mongoDatabase) {
  const {db, client} = await connectToMongo(mongoUri, mongoDatabase);
  const web3 = _web3 || await createWeb3();
  const contractManager = new ContractManager(web3);
  const identityManager = new IdentityManager(web3);
  const tokenAuthenticator = new TokenAuthenticator(identityManager);
  const entityBuilder = new EntityBuilder(identityManager);
  const entityRepository = new EntityStorage(db);
  const proofRepository = new ProofRepository(web3,
    identityManager.nodeAddress(),
    contractManager.bundleProofRegistryContract());
  const accountRepository = new AccountRepository(db);
  const accountAccessDefinitions = new AccountAccessDefinitions(identityManager, accountRepository);
  const httpsClient = new HttpsClient();
  const entityDownloader = new EntityDownloader(httpsClient);
  const dataModelEngine = new DataModelEngine(
    identityManager,
    tokenAuthenticator,
    entityBuilder,
    entityRepository,
    entityDownloader,
    proofRepository,
    accountRepository,
    accountAccessDefinitions);
  return {dataModelEngine, client};
}

export default build;
