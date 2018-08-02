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
import {connectToMongo} from './utils/db_utils';
import HttpsClient from './utils/https_client';
import TokenAuthenticator from './utils/token_authenticator';
import {createWeb3, getDefaultAddress} from './utils/web3_tools';
import RolesRepository from './services/roles_repository';

class Builder {
  async ensureAdminAccountExist() {
    await this.dataModelEngine.addAdminAccount();
  }

  async ensureAccountIsOnboarded() {
    const role = await this.rolesRepository.onboardedRole(getDefaultAddress(this.web3));
    if (role.index === 0) {
      throw new Error('You must be onboarded in order to start a node');
    }
    if (role.name !== 'ATLAS' && role.name !== 'HERMES') {
      throw new Error(`You must be onboarded as an ATLAS or HERMES while being ${role.name}`);
    }
  }

  async build(config, dependencies = {}) {
    this.config = config;
    const {web3} = dependencies;
    const {db, client} = await connectToMongo(this.config);
    this.db = db;
    this.client = client;
    this.web3 = web3 || await createWeb3(this.config);
    const {headContractAddress} = this.config;
    this.contractManager = new ContractManager(this.web3, headContractAddress);
    this.rolesRepository = new RolesRepository(this.contractManager);
    this.identityManager = new IdentityManager(this.web3);
    this.tokenAuthenticator = new TokenAuthenticator(this.identityManager);
    const {maximumEntityTimestampOvertake} = this.config;
    this.entityBuilder = new EntityBuilder(this.identityManager, maximumEntityTimestampOvertake);
    this.entityRepository = new EntityRepository(this.db);
    await this.entityRepository.initializeIndexes();
    this.findEventQueryObjectFactory = new FindEventQueryObjectFactory(this.db);
    this.findAssetQueryObjectFactory = new FindAssetQueryObjectFactory(this.db);
    this.httpsClient = new HttpsClient();
    this.entityDownloader = new EntityDownloader(this.httpsClient);
    this.accountRepository = new AccountRepository(this.db);
    this.findAccountQueryObjectFactory = new FindAccountQueryObjectFactory(this.db);
    this.accountAccessDefinitions = new AccountAccessDefinitions(this.identityManager, this.accountRepository);
    this.dataModelEngine = new DataModelEngine(
      this.identityManager,
      this.tokenAuthenticator,
      this.entityBuilder,
      this.entityRepository,
      this.entityDownloader,
      this.accountRepository,
      this.findEventQueryObjectFactory,
      this.findAccountQueryObjectFactory,
      this.findAssetQueryObjectFactory,
      this.accountAccessDefinitions,
      this.client,
      this.contractManager
    );
    return {dataModelEngine: this.dataModelEngine, client: this.client};
  }
}

export default Builder;
