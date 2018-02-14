import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromissed from 'chai-as-promised';
import Aparatus from '../helpers/aparatus';

chai.use(chaiHttp);
chai.use(chaiAsPromissed);

const {expect} = chai;

let aparatus;

describe('Accounts', async () => {
  before(async () => {    
    aparatus = new Aparatus();
    await aparatus.start();
  });

  it('should create an account', async () => {
    const response = await aparatus.request()
      .post('/accounts')
      .send({});
    expect(response.body.content.address).to.match(/^0x[0-9-a-fA-F]{40}$/);
    expect(response.body.content.secret).to.match(/^0x[0-9-a-fA-F]{64}$/);
    expect(response.status).to.eq(201);
  });

  after(async () => {
    aparatus.stop();
  });
});
