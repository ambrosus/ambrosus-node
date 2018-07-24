/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiHttp from 'chai-http';
import Application from '../../src/application';
import ContractManager from '../../src/services/contract_manager';
import {cleanDatabase} from '../../src/utils/db_utils';
import {getTimestamp} from '../../src/utils/time_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import {adminAccountWithSecret} from '../fixtures/account';
import EmptyLogger from './empty_logger';
import config from '../../config/config';

chai.use(chaiHttp);

export default class Apparatus extends Application {
  DEFAULT_TOKEN_EXPIRATION = 60 * 60 * 24 * 28;

  constructor(customConfig) {
    super(new EmptyLogger());
    // Read defaults from global config, but allow the options to be customized
    // for each test.
    this.config = Object.freeze({...config, ...customConfig});
  }

  async start(_web3) {
    const web3 = _web3 || await createWeb3(this.config);

    if (!config.bundleRegistryContractAddress) {
      const bundleRegistryContractAddress = await ContractManager.deploy(web3);
      this.config = Object.freeze({...this.config, bundleRegistryContractAddress});
    }

    await this.build(this.config, {web3});
    await this.cleanDB();
    await this.startServer();
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

  url() {
    return `http://127.0.0.1:${this.config.serverPort}`;
  }

  async stop() {
    await this.server.stop();
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
