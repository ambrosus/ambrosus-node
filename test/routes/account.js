import chai, { assert } from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromissed from 'chai-as-promised';
import Server from '../../src/server.js';

chai.use(chaiHttp);
chai.use(chaiAsPromissed);

const expect = chai.expect;

let server;

describe('Accounts', async function () {

  before(async function () {
    server = new Server();    
    server.start();
  });

  it('should create an account', async function () {
    const response = await chai.request(server.server).post('/accounts').send({});
    expect(response.status).to.eq(200);
  });

  xit('account should be unique', async function () {
    const response1 = await chai.request(server.server).post('/accounts').send({});    
    const response2 = await chai.request(server.server).post('/accounts').send({});    
    expect(response1.body.content.address).to.not.eq(response2.body.content.address);
  });

  after(async function () {
    await server.stop();
  });

});