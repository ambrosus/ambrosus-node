import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import {createAccountRequest, adminAccountWithSecret, accountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';


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
      expect(account.body.content.address).to.be.properAddress;
      expect(account.body.content.secret).to.be.properSecret;
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
        .and.have.property('status', 404);
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


  after(async () => {
    apparatus.stop();
  });
});
