/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AccountAccessDefinitions from './services/account_access_definitions';
import AccountRepository from './services/account_repository';
import ContractManager from './services/contract_manager';
import DataModelEngine from './services/data_model_engine';
import EntityBuilder from './services/entity_builder';
import EntityDownloader from './services/entity_downloader';
import EntityRepository from './services/entity_repository';
import FindEventQueryObjectFactory from './services/find_event_query_object';
import FindAccountQueryObjectFactory from './services/find_account_query_object';
import FindAssetQueryObjectFactory from './services/find_asset_query_object';
import IdentityManager from './services/identity_manager';
import ProofRepository from './services/proof_repository';
import Config from './utils/config';
import {connectToMongo} from './utils/db_utils';
import HttpsClient from './utils/https_client';
import TokenAuthenticator from './utils/token_authenticator';
import {createWeb3} from './utils/web3_tools';

class Builder {
  async ensureAdminAccountExist() {
    await this.dataModelEngine.addAdminAccount();
  }

  async build(dependencies = {}, config = Config.default()) {
    this.config = config;
    const {web3} = dependencies;
    const {db, client} = await connectToMongo(this.config);
    this.db = db;
    this.client = client;
    this.web3 = web3 || await createWeb3(this.config);
    const bundleRegistryContractAddress = this.config.bundleRegistryContractAddress();
    this.bundleProofRegistryContract = ContractManager.loadBundleRegistryContract(this.web3, bundleRegistryContractAddress);
    this.identityManager = new IdentityManager(this.web3);
    this.tokenAuthenticator = new TokenAuthenticator(this.identityManager);
    const maximumEntityTimestampOvertake = this.config.maximumEntityTimestampOvertake();
    this.entityBuilder = new EntityBuilder(this.identityManager, maximumEntityTimestampOvertake);
    this.entityRepository = new EntityRepository(this.db);
    await this.entityRepository.initializeIndexes();
    this.findEventQueryObjectFactory = new FindEventQueryObjectFactory(this.db);
    this.findAssetQueryObjectFactory = new FindAssetQueryObjectFactory(this.db);
    this.httpsClient = new HttpsClient();
    this.entityDownloader = new EntityDownloader(this.httpsClient);
    this.proofRepository = new ProofRepository(this.web3,
      this.identityManager.nodeAddress(),
      this.bundleProofRegistryContract);
    this.accountRepository = new AccountRepository(this.db);
    this.findAccountQueryObjectFactory = new FindAccountQueryObjectFactory(this.db);
    this.accountAccessDefinitions = new AccountAccessDefinitions(this.identityManager, this.accountRepository);
    this.dataModelEngine = new DataModelEngine(
      this.identityManager,
      this.tokenAuthenticator,
      this.entityBuilder,
      this.entityRepository,
      this.entityDownloader,
      this.proofRepository,
      this.accountRepository,
      this.findEventQueryObjectFactory,
      this.findAccountQueryObjectFactory,
      this.findAssetQueryObjectFactory,
      this.accountAccessDefinitions,
      this.client,
    );
    return {dataModelEngine: this.dataModelEngine, client: this.client};
  }
}

export default Builder;
