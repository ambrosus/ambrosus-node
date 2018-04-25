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

class Builder {
  constructor(options) {
    const {mongoUri, mongoDatabase, web3} = options;
    this.mongoUri = mongoUri;
    this.mongoDatabase = mongoDatabase;
    this.web3 = web3;
  }

  async build() {
    const {db, client} = await connectToMongo(this.mongoUri, this.mongoDatabase);
    this.client = client;
    this.web3 = this.web3 || await createWeb3();
    this.contractManager = new ContractManager(this.web3);
    this.identityManager = new IdentityManager(this.web3);
    this.tokenAuthenticator = new TokenAuthenticator(this.identityManager);
    this.entityBuilder = new EntityBuilder(this.identityManager);
    this.entityRepository = new EntityStorage(db);
    this.proofRepository = new ProofRepository(this.web3,
      this.identityManager.nodeAddress(),
      this.contractManager.bundleProofRegistryContract());
    this.accountRepository = new AccountRepository(db);
    this.accountAccessDefinitions = new AccountAccessDefinitions(this.identityManager, this.accountRepository);
    this.httpsClient = new HttpsClient();
    this.entityDownloader = new EntityDownloader(this.httpsClient);
    this.dataModelEngine = new DataModelEngine(
      this.identityManager,
      this.tokenAuthenticator,
      this.entityBuilder,
      this.entityRepository,
      this.entityDownloader,
      this.proofRepository,
      this.accountRepository,
      this.accountAccessDefinitions);

    await this.dataModelEngine.addAdminAccount();

    return {dataModelEngine: this.dataModelEngine, client: this.client};
  }
}

export default Builder;

