import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import {createAccountRequest, adminAccountWithSecret, accountWithSecret} from '../fixtures/account';
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
    await scenario.injectAccount(adminAccountWithSecret);
  });

  describe('Create an account', () => {
    it('should create an account', async () => {
      const account = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(createAccountRequest());
      expect(account.body.address).to.be.properAddress;
      expect(account.body.secret).to.be.properSecret;
      expect(account.body.permissions).to.be.deep.equal([]);
      expect(account.body.createdBy).to.be.equal(adminAccountWithSecret.address);
      expect(account.status).to.eq(201);
    });

    it('should fail to create if no token', async () => {
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .send(createAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });

    it('should fail to create account if non-existing user', async () => {
      const nonExistingUser = accountWithSecret;
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(nonExistingUser.secret)}`)
        .send(createAccountRequest({createdBy: nonExistingUser.address}));
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('should fail to create account if session user and createdBy mismatch', async () => {
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(accountWithSecret.secret)}`)
        .send(createAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });
  });

  describe('Get account detail', () => {
    it('get by account address', async () => {
      const account = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(createAccountRequest());
      const response = await apparatus.request()
        .get(`/accounts/${account.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send({});
      expect(response.body.address).to.equal(account.body.address);
      expect(response.body.secret).to.be.undefined;
      expect(account.body.permissions).to.be.deep.equal([]);
      expect(account.body.createdBy).to.be.equal(adminAccountWithSecret.address);
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
    let modifyRequest;

    beforeEach(async () => {
      storedAccount = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(createAccountRequest());
      modifyRequest = {permissions : changedPermissions};
    });

    it('should modify the targeted account', async () => {
      const modifiedAccount = await apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(modifyRequest);
      expect(modifiedAccount.body.address).to.equal(storedAccount.body.address);
      expect(modifiedAccount.body.secret).to.be.undefined;
      expect(modifiedAccount.body.permissions).to.be.deep.equal(changedPermissions);
      expect(modifiedAccount.body.createdBy).to.be.equal(adminAccountWithSecret.address);
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

    it('should fail to modify if not supported parameters passed', async () => {
      const pendingRequest = apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(put(modifyRequest, 'extraParam', 'superValue'));
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should fail to modify if not parameters are invalid type', async () => {
      const pendingRequest = apparatus.request()
        .put(`/accounts/${storedAccount.body.address}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send(put(modifyRequest, 'permissions', 'notArrayValue'));
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });
  });

  after(async () => {
    apparatus.stop();
  });
});
