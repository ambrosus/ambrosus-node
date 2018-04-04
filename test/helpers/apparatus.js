import Server from '../../src/server';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import TokenAuthenticator from '../../src/utils/token_authenticator';
import HttpsClient from '../../src/utils/https_client';
import IdentityManager from '../../src/services/identity_manager';
import AccountRepository from '../../src/services/account_repository';
import EntityBuilder from '../../src/services/entity_builder';
import EntityRepository from '../../src/services/entity_repository';
import DataModelEngine from '../../src/services/data_model_engine';
import chai from 'chai';
import chaiHttp from 'chai-http';
import AccountAccessDefinitions from '../../src/services/account_access_definitions';
import {adminAccountWithSecret} from '../fixtures/account';
import ProofRepository from '../../src/services/proof_repository';
import ContractManager from '../../src/services/contract_manager';
import EntityDownloader from '../../src/services/entity_downloader';
import {getTimestamp} from '../../src/utils/time_utils';

chai.use(chaiHttp);

export default class Apparatus {
  DEFAULT_TOKEN_EXPIRATION = 60 * 60 * 24 * 28;

  async start(web3) {
    const {client, db} = await connectToMongo();
    this.client = client;
    this.db = db;
    this.web3 = web3 || await createWeb3();
    this.contractManager = new ContractManager(this.web3, true);
    await this.contractManager.deployIfNeeded();

    await this.cleanDB();

    this.identityManager = new IdentityManager(this.web3);
    this.tokenAuthenticator = new TokenAuthenticator(this.identityManager);
    this.entityBuilder = new EntityBuilder(this.identityManager);
    this.entityRepository = new EntityRepository(db);
    this.httpsClient = new HttpsClient();
    this.entityDownloader = new EntityDownloader(this.httpsClient);
    this.proofRepository = new ProofRepository(this.web3, 
      this.identityManager.nodeAddress(),
      this.contractManager.bundleProofRegistryContract());
    this.accountRepository = new AccountRepository(db);
    this.accountAccessDefinitions = new AccountAccessDefinitions(this.identityManager, this.accountRepository);
    this.modelEngine = new DataModelEngine(
      this.identityManager, 
      this.tokenAuthenticator, 
      this.entityBuilder, 
      this.entityRepository,
      this.entityDownloader,
      this.proofRepository,
      this.accountRepository,
      this.accountAccessDefinitions);

    this.server = new Server(this.modelEngine);
    this.server.start();

    return this;
  }

  generateToken(secret = adminAccountWithSecret.secret, validUntil = this.defaultValidUntil()) {
    return this.tokenAuthenticator.generateToken(secret, validUntil);
  }


  defaultValidUntil() {
    return getTimestamp() + this.DEFAULT_TOKEN_EXPIRATION;
  }

  request() {
    return chai.request(this.server.server);
  }

  async cleanDB() {
    return cleanDatabase(this.db);
  }

  async stop() {
    await this.server.stop();
    await this.client.close();
  }
}

const apparatusScenarioProcessor = (apparatus) => ({
  onAddAdminAccount: async (account) => await apparatus.modelEngine.addAdminAccount(account.address),
  onAddAsset: async (asset) => {
    const response = await apparatus.request()
      .post('/assets')
      .send(asset);
    return response.body;
  },
  onAddEvent: async (event) => {
    const response = await apparatus.request()
      .post(`/assets/${event.content.idData.assetId}/events`)
      .send(event);
    return response.body;
  },
  onAddAccount: async (accountRequest, secret) => {
    const newAccount = await apparatus.request()
      .post('/accounts')
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(secret)}`)
      .send(accountRequest);
    return newAccount.body;
  }
});

export {apparatusScenarioProcessor};
