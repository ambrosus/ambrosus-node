import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromissed from 'chai-as-promised';
import Aparatus from '../helpers/aparatus';
import {createAccountRequest, adminAccountWithSecret, createFullAccountRequest} from '../fixtures/account';
import {put} from '../../src/utils/dict_utils';

chai.use(chaiHttp);
chai.use(chaiAsPromissed);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let aparatus;
  let account;

  before(async () => {
    aparatus = new Aparatus();    
    await aparatus.start();    
  });

  beforeEach(async () => {
    await aparatus.modelEngine.createAdminAccount(adminAccountWithSecret);
  });

  it('should create an account (client signed)', async () => {
    const signedAccountRequest = createFullAccountRequest(aparatus.identityManager);
    account = await aparatus.request()
      .post('/accounts')
      .send(signedAccountRequest);
    expect(account.body.content.address).to.match(/^0x[0-9-a-fA-F]{40}$/);
    expect(account.body.content.secret).to.match(/^0x[0-9-a-fA-F]{64}$/);
    expect(account.status).to.eq(201);
  });

  it('should create an account (server signed)', async () => {
    const signedAccountRequest = createAccountRequest({createdBy: adminAccountWithSecret.address});
    account = await aparatus.request()
      .post('/accounts')
      .set('Authorization', `AMB ${adminAccountWithSecret.secret}`)
      .send(signedAccountRequest);
    expect(account.body.content.address).to.match(/^0x[0-9-a-fA-F]{40}$/);
    expect(account.body.content.secret).to.match(/^0x[0-9-a-fA-F]{64}$/);
    expect(account.status).to.eq(201);
  });

  it('should get account data by account address', async () => {
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

  it('should fail to create account if no signature', async () => {
    const pendingRequest = aparatus.request()
      .post('/accounts')
      .send(createAccountRequest());
    await expect(pendingRequest)
      .to.eventually.be.rejected
      .and.have.property('status', 400);
  });

  it('should fail to create account if invalid signature', async () => {
    let request = createAccountRequest();
    request = put(request, 'content.signature', 'invalidsignature');
    const pendingRequest = aparatus.request()
      .post('/accounts')
      .send(request);
    await expect(pendingRequest)
      .to.eventually.be.rejected
      .and.have.property('status', 400);
  });

  afterEach(async () => {
    await aparatus.cleanDB();
  });

  after(async () => {
    aparatus.stop();
  });
});
