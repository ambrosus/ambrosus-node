import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import Apparatus, {apparatusScenarioProcessor}  from '../helpers/apparatus';
import {createAccountRequest, adminAccountWithSecret, createFullAccountRequest, accountWithSecret} from '../fixtures/account';
import addSignature from '../fixtures/add_signature';
import ScenarioBuilder from '../fixtures/scenario_builder';


chai.use(chaiHttp);
chai.use(chaiAsPromised);
chai.use(properAddress);
chai.use(properSecret);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let apparatus;
  let scenario;
  let adminAccount;

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    adminAccount = await scenario.injectAccount(adminAccountWithSecret);
  });

  describe('Get account detail', () => {
    it('get by account address', async () => {
      const signedAccountRequest = createFullAccountRequest(apparatus.identityManager, adminAccount);
      const account = await apparatus.request()
        .post('/accounts')
        .send(signedAccountRequest);
      const response = await apparatus.request()
        .get(`/accounts/${account.body.content.address}`)
        .send({});
      expect(response.body.content.address).to.equal(account.body.content.address);
      expect(response.body.content.secret).to.be.undefined;
    });

    it('should return 404 code if non-existing account', async () => {
      const pendingRequest = apparatus.request()
        .get(`/accounts/0x1234567`)
        .send({});
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('Create an account', () => {
    it('should create an account (client signed)', async () => {
      const signedAccountRequest = createFullAccountRequest(apparatus.identityManager, adminAccount);
      const account = await apparatus.request()
        .post('/accounts')
        .send(signedAccountRequest);
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
      expect(account.status).to.eq(201);
    });

    it('should create an account (server signed)', async () => {
      const signedAccountRequest = createAccountRequest({createdBy: adminAccountWithSecret.address});
      const account = await apparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB ${adminAccountWithSecret.secret}`)
        .send(signedAccountRequest);
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
      expect(account.status).to.eq(201);
    });

    it('should fail to create account if no signature', async () => {
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .send(createAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should fail to create account if non-existing user', async () => {
      const nonExistingUser = accountWithSecret;
      const request = addSignature(apparatus.identityManager,
        createAccountRequest({
          createdBy:
            nonExistingUser.address
        }), nonExistingUser.secret);
      const pendingRequest = apparatus.request()
        .post('/accounts')
        .send(request);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  after(async () => {
    apparatus.stop();
  });
});
