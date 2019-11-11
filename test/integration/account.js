/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import ServerApparatus, {apparatusScenarioProcessor} from '../helpers/server_apparatus';
import {addAccountRequest, adminAccountWithSecret, notRegisteredAccount} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {pick, put} from '../../src/utils/dict_utils';
import allPermissions from '../../src/utils/all_permissions';

chai.use(chaiHttp);
chai.use(chaiAsPromised);
chai.use(properAddress);
chai.use(properSecret);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let apparatus;
  let scenario;
  const newAccount = addAccountRequest();

  before(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    await scenario.addAdminAccount(adminAccountWithSecret);
  });

  describe('Create an account', () => {
    const createAccountRequest = async (account, sender) => apparatus.request()
      .post('/accounts')
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(sender.secret)}`)
      .send(account);

    const injectAccount = async (permissions, organization = newAccount.organization) => scenario.addAccount(0, null,
      {permissions, accessLevel: 2, organization});

    describe('By admin', () => {
      it('should be able to create accounts', async () => {
        const result = await createAccountRequest(newAccount, adminAccountWithSecret);
        expect(result.body.address).to.be.equal(newAccount.address);
        expect(result.body.permissions).to.be.deep.equal(newAccount.permissions);
        expect(result.body.accessLevel).to.be.equal(newAccount.accessLevel);
        expect(result.body.registeredBy).to.be.equal(adminAccountWithSecret.address);
        expect(result.body).to.have.property('registeredOn');
        expect(result.status).to.eq(201);
      });

      it('can create accounts with any permissions', async () => {
        const result = await createAccountRequest({...newAccount, permissions: Object.values(allPermissions)}, adminAccountWithSecret);
        expect(result.status).to.equal(201);
      });

      it('can create accounts with any access level', async () => {
        const result = await createAccountRequest({...newAccount, accessLevel: 2147483647}, adminAccountWithSecret);
        expect(result.status).to.equal(201);
      });

      it('can create accounts with any organization', async () => {
        const result = await createAccountRequest({...newAccount, organization: 123}, adminAccountWithSecret);
        expect(result.status).to.equal(201);
      });
    });

    it('account with register_accounts permission should be able to create accounts', async () => {
      const accountWithPermissions = await injectAccount([allPermissions.registerAccounts]);
      const result = await createAccountRequest(newAccount, accountWithPermissions);
      expect(result.body.registeredBy).to.be.equal(accountWithPermissions.address);
      expect(result.status).to.eq(201);
    });

    it('can create accounts without organization set', async () => {
      const accountWithPermissions = await injectAccount([allPermissions.registerAccounts]);
      const result = await createAccountRequest(pick(newAccount, 'organization'), accountWithPermissions);
      expect(result.status).to.eq(201);
    });

    it('protected account should be able to create protected account', async () => {
      const protectedAccount = await injectAccount([allPermissions.protectedAccount, allPermissions.registerAccounts]);
      const result = await createAccountRequest({...newAccount, permissions: [allPermissions.protectedAccount]}, protectedAccount);
      expect(result.status).to.eq(201);
    });

    it('should fail to create if no token given', async () => {
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .send(newAccount);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });

    it('should fail to create account if non-existing user', async () => {
      await expect(createAccountRequest(newAccount, notRegisteredAccount))
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail to create account with same address twice', async () => {
      await createAccountRequest(newAccount, adminAccountWithSecret);
      await expect(createAccountRequest(newAccount, adminAccountWithSecret))
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should fail to create when creator lacks register_accounts permission', async () => {
      const accountWithoutPermissions = await injectAccount([allPermissions.manageAccounts, allPermissions.createEvent]);
      await expect(createAccountRequest(newAccount, accountWithoutPermissions))
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail to create the account with permissions the creator lacks', async () => {
      const notAdminAccount = await injectAccount([allPermissions.registerAccounts, allPermissions.createEvent]);
      await expect(createAccountRequest({...newAccount, permissions: [allPermissions.createAsset]}, notAdminAccount))
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail to create super account', async () => {
      const notAdminAccount = await injectAccount(Object.values(pick(allPermissions, 'superAccount')));
      await expect(createAccountRequest({...newAccount, permissions: [allPermissions.superAccount]}, notAdminAccount))
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail to create the account with higher access level', async () => {
      const accountWithPermissions = await injectAccount([allPermissions.registerAccounts]);
      await expect(createAccountRequest({...newAccount, accessLevel: 1000}, accountWithPermissions))
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail to create the account from another organization', async () => {
      const accountWithPermissions = await injectAccount([allPermissions.registerAccounts], 5);
      await expect(createAccountRequest({...newAccount, organization: 1000}, accountWithPermissions))
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });

  describe('Get account detail', () => {
    const injectAccount = async (permissions) => scenario.addAccount(0, null,
      {permissions});

    it('get by account address', async () => {
      const registeredAccount = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(newAccount);
      const response = await apparatus.request()
        .get(`/accounts/${registeredAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send({});
      expect(response.body.address).to.equal(newAccount.address);
      expect(response.body.secret).to.be.undefined;
      expect(response.body.permissions).to.be.deep.equal(newAccount.permissions);
      expect(response.body.accessLevel).to.be.equal(newAccount.accessLevel);
      expect(registeredAccount.body.registeredBy).to.be.equal(adminAccountWithSecret.address);
      expect(response.body).to.have.property('registeredOn');
    });

    it('can get account if has manage_account permission', async () => {
      const accountWithPermissions = await injectAccount([allPermissions.manageAccounts]);
      const registeredAccount = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(newAccount);
      const response = await apparatus.request()
        .get(`/accounts/${registeredAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(accountWithPermissions.secret)}`)
        .send({});
      expect(response.body.address).to.equal(newAccount.address);
    });

    it('should fail with 403 if no manage_account permission', async () => {
      const accountWithoutPermissions = await injectAccount([]);
      const registeredAccount = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(newAccount);
      const pendingRequest = apparatus.request()
        .get(`/accounts/${registeredAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(accountWithoutPermissions.secret)}`)
        .send({});
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
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
    const changedPermissions = [allPermissions.createAsset];
    const accessLevel = 4;
    const organization = 5;
    let modifyRequest;

    beforeEach(async () => {
      storedAccount = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(newAccount);
      modifyRequest = {permissions : changedPermissions, accessLevel};
    });

    const injectAccount = async (permissions) => scenario.addAccount(0, null,
      {permissions, accessLevel, organization: storedAccount.body.organization});

    const modifyAccountRequest = async (request, sender, address = storedAccount.body.address) => apparatus.request()
      .put(`/accounts/${address}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(sender.secret)}`)
      .send(request);

    it('should fail to modify if no token given', async () => {
      const pendingRequest = apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .send(modifyRequest);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });

    it('should fail to modify account if non-existing sender', async () => {
      await expect(modifyAccountRequest(modifyRequest, notRegisteredAccount))
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail if trying to modify non-existing account', async () => {
      await expect(modifyAccountRequest(modifyRequest, adminAccountWithSecret, '0x1234567'))
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });

    it('should fail to modify if unsupported parameters passed', async () => {
      await expect(modifyAccountRequest(put(modifyRequest, 'extraParam', 'superValue'), adminAccountWithSecret))
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should fail to modify if any of parameters are invalid', async () => {
      await expect(modifyAccountRequest(put(modifyRequest, 'permissions', 'notArrayValue'), adminAccountWithSecret))
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    describe('By admin', () => {
      it('should modify the targeted account', async () => {
        const modifiedAccount = await modifyAccountRequest(modifyRequest, adminAccountWithSecret);
        expect(modifiedAccount.body.address).to.equal(storedAccount.body.address);
        expect(modifiedAccount.body.secret).to.be.undefined;
        expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
        expect(modifiedAccount.body.accessLevel).to.be.equal(accessLevel);
        expect(modifiedAccount.body.organization).to.be.equal(storedAccount.body.organization);
        expect(modifiedAccount.body.registeredBy).to.be.equal(adminAccountWithSecret.address);
      });

      it('should be able to change organization', async () => {
        const modifiedAccount = await modifyAccountRequest({...modifyRequest, organization}, adminAccountWithSecret);
        expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
        expect(modifiedAccount.body.accessLevel).to.be.equal(accessLevel);
        expect(modifiedAccount.body.organization).to.be.equal(organization);
      });

      it('can modify protected accounts', async () => {
        const protectedAccount = await injectAccount([allPermissions.protectedAccount]);
        const modifiedAccount = await modifyAccountRequest(modifyRequest, adminAccountWithSecret, protectedAccount.address);
        expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
      });

      it('can modify super accounts', async () => {
        const superAccount = await injectAccount([allPermissions.superAccount]);
        const modifiedAccount = await modifyAccountRequest(modifyRequest, adminAccountWithSecret, superAccount.address);
        expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
      });

      it('can give accounts any permissions', async () => {
        const superAccount = await injectAccount([allPermissions.superAccount]);
        const modifiedAccount = await modifyAccountRequest({permissions: Object.values(allPermissions)}, adminAccountWithSecret, superAccount.address);
        expect(modifiedAccount.body.permissions).to.be.deep.equal(Object.values(allPermissions));
      });

      it('can give accounts any access level', async () => {
        const superAccount = await injectAccount([allPermissions.superAccount]);
        const modifiedAccount = await modifyAccountRequest({accessLevel: 12312321}, adminAccountWithSecret, superAccount.address);
        expect(modifiedAccount.body.accessLevel).to.be.deep.equal(12312321);
      });

      it('can modify accounts from any organization', async () => {
        const otherOrganizationAccount = await apparatus.request()
          .post('/accounts')
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send(put(pick(notRegisteredAccount, 'secret'), 'organization', 13213));
        const modifiedAccount = await modifyAccountRequest(modifyRequest, adminAccountWithSecret, otherOrganizationAccount.body.address);
        expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
      });
    });

    describe('By normal accounts', () => {
      let managerAccount;

      beforeEach(async () => {
        managerAccount = await injectAccount([allPermissions.manageAccounts, allPermissions.createAsset]);
      });

      it('can modify accounts when has manage_accounts permission', async () => {
        const modifiedAccount = await modifyAccountRequest(modifyRequest, managerAccount);
        expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
        expect(modifiedAccount.body.registeredBy).to.be.equal(adminAccountWithSecret.address);
      });

      it('should fail when account lacks manage_accounts permission', async () => {
        const noPermissionAccount = await injectAccount([allPermissions.createEvent]);
        await expect(modifyAccountRequest(modifyRequest, noPermissionAccount))
          .to.eventually.be.rejected
          .and.have.property('status', 403);
      });

      it('should fail to modify the protected account', async () => {
        const protectedAccount = await injectAccount([allPermissions.protectedAccount]);
        await expect(modifyAccountRequest(modifyRequest, managerAccount, protectedAccount.address))
          .to.eventually.be.rejected
          .and.have.property('status', 403);
      });

      it('should fail to modify the protected account even if is protected itself', async () => {
        const protectedAccount = await injectAccount([allPermissions.manageAccounts, allPermissions.protectedAccount]);
        const otherProtectedAccount = await injectAccount([allPermissions.protectedAccount]);
        await expect(modifyAccountRequest(modifyRequest, protectedAccount, otherProtectedAccount.address))
          .to.eventually.be.rejected
          .and.have.property('status', 403);
      });

      it('should fail to add any permission the modifier does not have', async () => {
        await expect(modifyAccountRequest({permissions: [allPermissions.createEvent]}, managerAccount))
          .to.eventually.be.rejected
          .and.have.property('status', 403);
      });

      it('protected account should be able to add the protected_account permission', async () => {
        const protectedAccount = await injectAccount([allPermissions.manageAccounts, allPermissions.protectedAccount]);
        const result = await modifyAccountRequest({permissions: [allPermissions.protectedAccount]}, protectedAccount);
        expect(result.body.permissions).to.deep.equal([allPermissions.protectedAccount]);
      });

      it('should fail to set higher access level than own', async () => {
        const notAdminAccount = await injectAccount([allPermissions.manageAccounts]);
        await expect(modifyAccountRequest({accessLevel: 1000}, notAdminAccount))
          .to.eventually.be.rejected
          .and.have.property('status', 403);
      });

      it('can change access level of account with higher access level than own', async () => {
        const hugeAccessLevelAccount = await apparatus.request()
          .post('/accounts')
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send(put(pick(notRegisteredAccount, 'secret'), 'accessLevel', 10000));
        const modifiedAccount = await modifyAccountRequest(modifyRequest, managerAccount, hugeAccessLevelAccount.body.address);
        expect(modifiedAccount.body.accessLevel).to.equal(accessLevel);
      });

      it('should fail to modify the account from another organization', async () => {
        const differentOrganizationAccount = await apparatus.request()
          .post('/accounts')
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send(put(pick(notRegisteredAccount, 'secret'), 'organization', 1234));
        await expect(modifyAccountRequest(modifyRequest, managerAccount, differentOrganizationAccount.body.address))
          .to.eventually.be.rejected
          .and.have.property('status', 403);
      });

      it('should be able to set different organization than own', async () => {
        const result = await modifyAccountRequest({organization: 3123}, managerAccount);
        expect(result.body.organization).to.equal(3123);
      });

      it('should be able to modify accounts without organization set', async () => {
        const noOrganizationAccount = await apparatus.request()
          .post('/accounts')
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send(pick(notRegisteredAccount, 'secret'));
        const modifiedAccount = await modifyAccountRequest({organization: managerAccount.organization},
          managerAccount, noOrganizationAccount.body.address);
        expect(modifiedAccount.body.organization).to.equal(managerAccount.organization);
        expect(modifiedAccount.status).to.eq(200);
      });

      it('should be able to change permissions and organization of account with higher access level', async () => {
        const highAccessLevelAccount = await apparatus.request()
          .post('/accounts')
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send(put(pick(notRegisteredAccount, 'secret'), 'accessLevel', 9999));
        const result = await modifyAccountRequest({permissions: [], organization: 3123}, managerAccount, highAccessLevelAccount.body.address);
        expect(result.body.permissions).to.deep.equal([]);
        expect(result.body.organization).to.equal(3123);
      });

      it('should be able to change accessLevel and organization of account with different permissions', async () => {
        const otherPermissionsAccount = await injectAccount([allPermissions.createEvent]);
        const result = await modifyAccountRequest({accessLevel: 2, organization: 3123}, managerAccount, otherPermissionsAccount.address);
        expect(result.body.accessLevel).to.deep.equal(2);
        expect(result.body.organization).to.equal(3123);
      });
    });
  });

  describe('Find accounts', () => {
    const injectAccount = async (permissions) => scenario.addAccount(0, null,
      {permissions});

    beforeEach(async () => {
      await scenario.addAccount(0, null,
        {permissions: [allPermissions.registerAccounts, allPermissions.manageAccounts, allPermissions.createEvent], accessLevel: 2});
      await scenario.addAccount(1, null,
        {permissions: [allPermissions.createEvent, allPermissions.manageAccounts], accessLevel: 1});
      await scenario.addAccount(0, null, {permissions: [allPermissions.createAsset], accessLevel: 3});
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

    it('user with manage_accounts permission can perform search', async () => {
      const permittedAccount = await injectAccount([allPermissions.manageAccounts]);

      const response = await apparatus.request()
        .get('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(permittedAccount.secret)}`)
        .send();
      expect(response.body.resultCount).to.equal(4);

      for (let index = 0; index < scenario.accounts.length;) {
        if (scenario.accounts[index].organization === 0) {
          scenario.accounts.splice(index, 1);
        } else {
          index++;
        }
      }

      expect(response.body.results.map((account) => account.address).sort())
        .to.deep.equal(scenario.accounts.map((account) => account.address).sort());
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
      const pendingRequest = apparatus.request()
        .get(`/accounts`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(notRegisteredAccount.secret)}`)
        .send();
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail if no manage_account permission', async () => {
      const noPermissionsAccount = await injectAccount([allPermissions.registerAccounts]);
      const pendingRequest = apparatus.request()
        .get(`/accounts`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(noPermissionsAccount.secret)}`)
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
        .to.deep.equal([scenario.accounts[1].address, scenario.accounts[3].address, adminAccountWithSecret.address].sort());
    });

    it('should fail if access level is not a number', async () => {
      const pendingRequest = apparatus.request()
        .get('/accounts?accessLevel=2n')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should filter by registeredBy', async () => {
      const response = await apparatus.request()
        .get(`/accounts?registeredBy=${scenario.accounts[1].address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      expect(response.body.resultCount).to.equal(1);
      expect(response.body.results[0].address).to.equal(scenario.accounts[2].address);
    });

    it('should apply paging', async () => {
      const response = await apparatus.request()
        .get(`/accounts?page=1&perPage=2`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      expect(response.body.resultCount).to.equal(4);
      expect(response.body.results).to.have.length(2);
    });
  });

  after(async () => {
    await apparatus.stop();
  });
});
