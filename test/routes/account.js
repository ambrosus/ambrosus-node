import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromissed from 'chai-as-promised';
import Aparatus from '../helpers/aparatus';
import {createAccountRequest, accountWithSecret} from '../fixtures/account';

chai.use(chaiHttp);
chai.use(chaiAsPromissed);

const {expect} = chai;

describe('Accounts - Integrations', async () => {
  let aparatus;
  let account;



  before(async () => {
    aparatus = new Aparatus();
    await aparatus.start();
    account = await aparatus.request()
      .post('/accounts')
      .send(createAccountRequest());
  });

  it('should create an account', async () => {
    expect(account.body.content.address).to.match(/^0x[0-9-a-fA-F]{40}$/);
    expect(account.body.content.secret).to.match(/^0x[0-9-a-fA-F]{64}$/);
    expect(account.status).to.eq(201);
  });

  it('should get account data by account address', async () => {
    const response = await aparatus.request()
      .get(`/accounts/${account.body.content.address}`)
      .send({});
    expect(response.body.content.address).to.equal(account.body.content.address);
    expect(response.body.content.secret).to.be.undefined;
  });

  after(async () => {
    aparatus.stop();
  });
});
