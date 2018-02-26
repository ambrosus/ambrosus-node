import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromissed from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import Aparatus, {aparatusScenarioProcessor} from '../helpers/aparatus';
import {createAccountRequest, adminAccountWithSecret, accountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';


chai.use(chaiHttp);
chai.use(chaiAsPromissed);
chai.use(properAddress);
chai.use(properSecret);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let aparatus;
  let scenario;

  before(async () => {
    aparatus = new Aparatus();
    await aparatus.start();
    scenario = new ScenarioBuilder(aparatus.identityManager, aparatusScenarioProcessor(aparatus));
  });

  beforeEach(async () => {
    await aparatus.cleanDB();
    scenario.reset();
    await scenario.injectAccount(adminAccountWithSecret);
  });

  describe('Create an account', () => {
    it('should create an account (client signed)', async () => {
      const account = await aparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${aparatus.generateToken()}`)
        .send(createAccountRequest());
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
      expect(account.status).to.eq(201);
    });

    it('should fail to create if no token', async () => {
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .send(createAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });

    it('should fail to create account if non-existing user', async () => {
      const nonExistingUser = accountWithSecret;
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${aparatus.generateToken(nonExistingUser.secret)}`)
        .send(createAccountRequest({createdBy: nonExistingUser.address}));
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 404);
    });

    it('should fail to create account if session user and createBy mismatch', async () => {
      const pendingRequest = aparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${aparatus.generateToken(accountWithSecret.secret)}`)
        .send(createAccountRequest());
      await expect(pendingRequest)
        .to.eventually.be.rejected
        .and.have.property('status', 401);
    });
  });

  describe('Get account detail', () => {
    it('get by account address', async () => {
      const account = await aparatus.request()
        .post('/accounts')
        .set('Authorization', `AMB_TOKEN ${aparatus.generateToken()}`)
        .send(createAccountRequest());
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


  after(async () => {
    aparatus.stop();
  });
});
