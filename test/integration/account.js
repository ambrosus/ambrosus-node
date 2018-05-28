/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import {addAccountRequest, adminAccountWithSecret, accountWithSecret, account} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {put} from '../../src/utils/dict_utils';


chai.use(chaiHttp);
chai.use(chaiAsPromised);
chai.use(properAddress);
chai.use(properSecret);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let apparatus;
  let scenario;

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    await scenario.addAdminAccount(adminAccountWithSecret);
  });

  describe('Create an account', () => {
    it('should create an account', async () => {
      const result = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(addAccountRequest());
      expect(result.body.address).to.be.equal(account.address);
      expect(result.body.permissions).to.be.deep.equal(['permission1', 'permission2']);
      expect(result.body.accessLevel).to.be.equal(7);
      expect(result.body.registeredBy).to.be.equal(adminAccountWithSecret.address);
      expect(result.body).to.have.property('registeredOn');
      expect(result.status).to.eq(201);
    });

    it('should fail to create if no token', async () => {
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .send(addAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });

    it('should fail to create account if non-existing user', async () => {
      const nonExistingUser = accountWithSecret;
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(nonExistingUser.secret)}`)
        .send(addAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });

  describe('Get account detail', () => {
    it('get by account address', async () => {
      const registeredAccount = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(addAccountRequest());
      const response = await apparatus.request()
        .get(`/accounts/${registeredAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send({});
      expect(response.body.address).to.equal(registeredAccount.body.address);
      expect(response.body.secret).to.be.undefined;
      expect(registeredAccount.body.permissions).to.be.deep.equal(['permission1', 'permission2']);
      expect(response.body.accessLevel).to.be.equal(7);
      expect(registeredAccount.body.registeredBy).to.be.equal(adminAccountWithSecret.address);
      expect(response.body).to.have.property('registeredOn');
    });

    it('should return 404 code if non-existing account', async () => {
      const pendingRequest = apparatus.request()
        .get(`/accounts/0x1234567`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send({});
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('Modify an account', () => {
    let storedAccount;
    const changedPermissions = ['perm1', 'perm2', 'perm3'];
    const accessLevel = 4;
    let modifyRequest;

    beforeEach(async () => {
      storedAccount = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(addAccountRequest());
      modifyRequest = {permissions : changedPermissions, accessLevel};
    });

    it('should modify the targeted account', async () => {
      const modifiedAccount = await apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(modifyRequest);
      expect(modifiedAccount.body.address).to.equal(storedAccount.body.address);
      expect(modifiedAccount.body.secret).to.be.undefined;
      expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
      expect(modifiedAccount.body.accessLevel).to.be.equal(accessLevel);
      expect(modifiedAccount.body.registeredBy).to.be.equal(adminAccountWithSecret.address);
    });

    it('should fail to modify if no token', async () => {
      const pendingRequest = apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .send(modifyRequest);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });

    it('should fail to modify account if non-existing requester user', async () => {
      const nonExistingUser = accountWithSecret;
      const pendingRequest = apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(nonExistingUser.secret)}`)
        .send(modifyRequest);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail if trying to modify non-existing account', async () => {
      const pendingRequest = apparatus.request()
        .put(`/accounts/0x1234567`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(modifyRequest);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });

    it('should fail to modify if unsupported parameters passed', async () => {
      const pendingRequest = apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(put(modifyRequest, 'extraParam', 'superValue'));
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should fail to modify if any of parameters are invalid', async () => {
      const pendingRequest = apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(put(modifyRequest, 'permissions', 'notArrayValue'));
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });
  });

  describe('Find accounts', () => {
    beforeEach(async () => {
      await scenario.addAccount(0, null,
        {permissions: ['register_account', 'perm2'], accessLevel: 1});
      await scenario.addAccount(1, null,
        {permissions: ['perm1', 'perm2'], accessLevel: 2});
      await scenario.addAccount(0, null, {permissions: ['perm1'], accessLevel: 3});
    });

    it('finding accounts returns all accounts if no parameters', async () => {
      const response = await apparatus.request()
        .get('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      expect(response.body.resultCount).to.equal(4);
      expect(response.body.results.map((account) => account.address).sort())
        .to.deep.equal(scenario.accounts.map((account) => account.address).sort());
    });

    it('find results are sorted by registeredOn', async () => {
      const response = await apparatus.request()
        .get('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      for (let ind = 0; ind < response.body.resultCount - 1; ind++) {
        expect(response.body.results[ind].registeredOn).to.be.at.least(response.body.results[ind + 1].registeredOn);
      }
    });

    it('should fail if no token', async () => {
      const pendingRequest = apparatus.request()
        .get(`/accounts`)
        .send();
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });

    it('should fail if non-existing requester user', async () => {
      const nonExistingUser = accountWithSecret;
      const pendingRequest = apparatus.request()
        .get(`/accounts`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(nonExistingUser.secret)}`)
        .send();
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should filter by accessLevel', async () => {
      const response = await apparatus.request()
        .get('/accounts?accessLevel=2')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      expect(response.body.resultCount).to.equal(3);
      expect(response.body.results.map((account) => account.address).sort())
        .to.deep.equal([scenario.accounts[2].address, scenario.accounts[3].address, adminAccountWithSecret.address].sort());
    });

    it('should filter by registeredBy', async () => {
      const response = await apparatus.request()
        .get(`/accounts?registeredBy=${scenario.accounts[1].address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      expect(response.body.resultCount).to.equal(1);
      expect(response.body.results[0].address).to.equal(scenario.accounts[2].address);
    });
  });

  after(async () => {
    await apparatus.stop();
  });
});
