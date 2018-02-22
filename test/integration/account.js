import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromissed from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import Aparatus, {aparatusScenarioProcessor}  from '../helpers/aparatus';
import {createAccountRequest, adminAccountWithSecret, createFullAccountRequest, accountWithSecret} from '../fixtures/account';
import addSignature from '../fixtures/add_signature';
import ScenarioBuilder from '../fixtures/scenario_builder';


chai.use(chaiHttp);
chai.use(chaiAsPromissed);
chai.use(properAddress);
chai.use(properSecret);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let aparatus;
  let scenario;
  let account;

  before(async () => {
    aparatus = new Aparatus();
    await aparatus.start();
    scenario = new ScenarioBuilder(aparatus.identityManager, aparatusScenarioProcessor(aparatus));
  });

  beforeEach(async () => {
    await aparatus.cleanDB();
    scenario.reset();
    account = await scenario.injectAccount(adminAccountWithSecret);
  });

  describe('Get account detail', () => {
    it('get by account address', async () => {
      const signedAccountRequest = createFullAccountRequest(aparatus.identityManager);
      account = await aparatus.request()
        .post('/accounts')
        .send(signedAccountRequest);
      const response = await aparatus.request()
        .get(`/accounts/${account.body.content.address}`)
        .send({});
      expect(response.body.content.address).to.equal(account.body.content.address);
      expect(response.body.content.secret).to.be.undefined;
    });

    it('should return 404 code if non-existing account', async () => {
      const pendingRequest = aparatus.request()
        .get(`/accounts/0x1234567`)
        .send({});
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('Create an account', () => {
    it('should create an account (client signed)', async () => {
      const signedAccountRequest = createFullAccountRequest(aparatus.identityManager);
      account = await aparatus.request()
        .post('/accounts')
        .send(signedAccountRequest);
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
      expect(account.status).to.eq(201);
    });

    it('should create an account (server signed)', async () => {
      const signedAccountRequest = createAccountRequest({createdBy: adminAccountWithSecret.address});
      account = await aparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB ${adminAccountWithSecret.secret}`)
        .send(signedAccountRequest);
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
      expect(account.status).to.eq(201);
    });

    it('should fail to create account if no signature', async () => {
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .send(createAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('should fail to create account if non-existing user', async () => {
      const nonExistingUser = accountWithSecret;
      const request = addSignature(aparatus.identityManager,
        createAccountRequest({
          createdBy:
            nonExistingUser.address
        }), nonExistingUser.secret);
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .send(request);
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });

  after(async () => {
    aparatus.stop();
  });
});
