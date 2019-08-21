/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiHttp from 'chai-http';
import {cleanDatabase} from '../../src/utils/db_utils';
import {getTimestamp} from '../../src/utils/time_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import {adminAccountWithSecret} from '../fixtures/account';
import EmptyLogger from './empty_logger';
import config from '../../src/config/config';
import devConfig from '../../src/config/devConfig';
import Builder from '../../src/builder';
import ServerWorker from '../../src/workers/server_worker';
import deployAll from '../../src/utils/deployment';
import {Role} from '../../src/services/roles_repository';
import {addToKycWhitelist} from '../../src/utils/prerun';

chai.use(chaiHttp);

export default class ServerApparatus extends Builder {
  DEFAULT_TOKEN_EXPIRATION = 60 * 60 * 24 * 28;

  constructor(customConfig, role = Role.HERMES) {
    super();
    this.logger = new EmptyLogger();
    this.role = role;
    // Read defaults from global config, but allow the options to be customized
    // for each test.
    this.config = Object.freeze({...config, ...customConfig});
    this.devConfig = devConfig;
    this.worker = null;
  }

  async start(_web3) {
    const web3 = _web3 || await createWeb3(this.config);

    if (!config.headContractAddress) {
      const headContract = await deployAll(web3, this.devConfig.deployerPrivateKey, this.logger);
      const headContractAddress = headContract.options.address;
      this.config = Object.freeze({...this.config, headContractAddress});
    }

    await this.build(this.config, {web3});
    await this.cleanDB();
    await this.ensureAdminAccountExist();
    this.worker = new ServerWorker(
      this.dataModelEngine,
      web3,
      this.role,
      this.config,
      this.logger,
      this.operationalMode
    );
    await this.worker.start();
  }

  async onboardAsHermes(url) {
    await addToKycWhitelist(Role.HERMES, '0', this.dataModelEngine, this.kycWhitelistWrapper, new EmptyLogger());
    await this.rolesRepository.onboardAsHermes(this.identityManager.nodeAddress(), url);
  }

  async onboardAsAtlas(url) {
    await addToKycWhitelist(Role.ATLAS, this.devConfig.defaultStake, this.dataModelEngine, this.kycWhitelistWrapper, new EmptyLogger());
    await this.rolesRepository.onboardAsAtlas(this.identityManager.nodeAddress(), url);
  }

  generateToken(secret = adminAccountWithSecret.secret, validUntil = this.defaultValidUntil()) {
    return this.tokenAuthenticator.generateToken(secret, validUntil);
  }

  defaultValidUntil() {
    return getTimestamp() + this.DEFAULT_TOKEN_EXPIRATION;
  }

  request() {
    return chai.request(this.worker.apiServer);
  }

  async cleanDB() {
    return cleanDatabase(this.db);
  }

  url() {
    return `http://127.0.0.1:${this.config.serverPort}`;
  }

  async stop() {
    await this.worker.stop();
    this.worker = null;
    await this.client.close();
  }
}

const apparatusScenarioProcessor = (apparatus) => ({
  onAddAdminAccount: async (account) => await apparatus.dataModelEngine.addAdminAccount(account.address),
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
