/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AccountAccessDefinitions from './services/account_access_definitions';
import AccountRepository from './services/account_repository';
import {
  ChallengesWrapper,
  ConfigWrapper,
  FeesWrapper,
  HeadWrapper,
  KycWhitelistWrapper,
  RolesWrapper,
  ShelteringWrapper,
  UploadActions,
  UploadsWrapper
} from 'ambrosus-node-contracts';
import DataModelEngine from './services/data_model_engine';
import EntityBuilder from './services/entity_builder';
import EntityDownloader from './services/entity_downloader';
import EntityRepository from './services/entity_repository';
import WorkerLogRepository from './services/worker_log_repository';
import FindEventQueryObjectFactory from './services/find_event_query_object';
import FindAccountQueryObjectFactory from './services/find_account_query_object';
import FindAssetQueryObjectFactory from './services/find_asset_query_object';
import IdentityManager from './services/identity_manager';
import {connectToMongo} from './utils/db_utils';
import HttpsClient from './utils/https_client';
import TokenAuthenticator from './utils/token_authenticator';
import {createWeb3, getDefaultAddress} from './utils/web3_tools';
import RolesRepository, {Role} from './services/roles_repository';
import UploadRepository from './services/upload_repository';
import ChallengesRepository from './services/challenges_repository';
import Migrator from './migrations/Migrator';
import FailedChallengesCache from './services/failed_challenges_cache';

class Builder {
  async ensureAdminAccountExist() {
    await this.dataModelEngine.addAdminAccount();
  }

  async ensureAccountIsOnboarded(allowedRoles) {
    const role = await this.rolesRepository.onboardedRole(getDefaultAddress(this.web3));
    if (role.is(Role.NONE)) {
      throw new Error('You must be onboarded in order to start a node');
    }
    if (!allowedRoles.some((allowedRole) => role.is(allowedRole))) {
      throw new Error(
        `You must be onboarded as one of the following roles: ${allowedRoles.toString()}. Instead onboarded as ${role.name}`);
    }
    return role;
  }

  async build(config, dependencies = {}) {
    this.config = config;
    const {web3} = dependencies;
    const {db, client} = await connectToMongo(this.config);
    this.db = db;
    this.client = client;
    this.web3 = web3 || await createWeb3(this.config);
    this.migrator = new Migrator(db, this.config);
    this.identityManager = new IdentityManager(this.web3);
    const {headContractAddress} = this.config;

    const defaultAddress = await getDefaultAddress(this.web3);

    this.headWrapper = new HeadWrapper(headContractAddress, this.web3, defaultAddress);
    this.rolesWrapper = new RolesWrapper(this.headWrapper, this.web3, defaultAddress);
    this.configWrapper = new ConfigWrapper(this.headWrapper, this.web3, defaultAddress);
    this.uploadsWrapper = new UploadsWrapper(this.headWrapper, this.web3, defaultAddress);
    this.feesWrapper = new FeesWrapper(this.headWrapper, this.web3, defaultAddress);
    this.challengesWrapper = new ChallengesWrapper(this.headWrapper, this.web3, defaultAddress);
    this.shelteringWrapper = new ShelteringWrapper(this.headWrapper, this.web3, defaultAddress);
    this.kycWhitelistWrapper = new KycWhitelistWrapper(this.headWrapper, this.web3, defaultAddress);
    this.uploadActions = new UploadActions(this.uploadsWrapper, this.feesWrapper, this.shelteringWrapper);

    this.rolesRepository = new RolesRepository(this.rolesWrapper, this.configWrapper);
    const {lowFundsWarningAmount} = this.config;
    this.uploadRepository = new UploadRepository(
      this.web3,
      this.identityManager,
      this.uploadActions,
      this.shelteringWrapper,
      this.rolesWrapper,
      this.feesWrapper,
      this.configWrapper,
      lowFundsWarningAmount
    );
    this.challengesRepository = new ChallengesRepository(this.challengesWrapper,
      this.configWrapper);
    this.tokenAuthenticator = new TokenAuthenticator(this.identityManager);
    const {maximumEntityTimestampOvertake} = this.config;
    this.entityBuilder = new EntityBuilder(this.identityManager, maximumEntityTimestampOvertake);
    this.entityRepository = new EntityRepository(this.db);
    this.workerLogRepository = new WorkerLogRepository(this.db);
    this.findEventQueryObjectFactory = new FindEventQueryObjectFactory(this.db);
    this.findAssetQueryObjectFactory = new FindAssetQueryObjectFactory(this.db);
    this.failedChallengesCache = new FailedChallengesCache();
    this.httpsClient = new HttpsClient();
    this.entityDownloader = new EntityDownloader(this.httpsClient);
    this.accountRepository = new AccountRepository(this.db);
    this.findAccountQueryObjectFactory = new FindAccountQueryObjectFactory(this.db);
    this.accountAccessDefinitions = new AccountAccessDefinitions(this.identityManager, this.accountRepository);
    this.dataModelEngine = new DataModelEngine({
      identityManager: this.identityManager,
      tokenAuthenticator: this.tokenAuthenticator,
      entityBuilder: this.entityBuilder,
      entityRepository: this.entityRepository,
      entityDownloader: this.entityDownloader,
      accountRepository: this.accountRepository,
      findEventQueryObjectFactory: this.findEventQueryObjectFactory,
      findAccountQueryObjectFactory: this.findAccountQueryObjectFactory,
      findAssetQueryObjectFactory: this.findAssetQueryObjectFactory,
      accountAccessDefinitions: this.accountAccessDefinitions,
      mongoClient: this.client,
      uploadRepository: this.uploadRepository,
      rolesRepository: this.rolesRepository,
      workerLogRepository: this.workerLogRepository
    });
    return {dataModelEngine: this.dataModelEngine, client: this.client, kycWhitelistWrapper: this.kycWhitelistWrapper, web3};
  }
}

export default Builder;
