import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import {stub} from 'sinon';
import Apparatus from '../helpers/apparatus';
import pkPair from '../fixtures/pk_pair';
import Config from '../../src/utils/config';

chai.use(chaiHttp);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('CORS - Integrations', async () => {
  const requestData = {
    validUntil: 1700000000000
  };

  let apparatus;
  let ambAuthEnabledStub;

  before(async () => {
    apparatus = new Apparatus();
    ambAuthEnabledStub = stub(Config, 'isAuthorizationWithSecretKeyEnabled');

    await apparatus.start();
  });

  beforeEach(async () => {
    ambAuthEnabledStub.returns(true);
    await apparatus.cleanDB();
  });

  after(async () => {
    ambAuthEnabledStub.restore();
    apparatus.stop();
  });

  it('Adds the Access-Control-Allow-Origin response header matching the Origin', async () => {
    const response = await apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`)
      .set('origin', 'example.com')
      .send(requestData);
    expect(response.header).to.have.property('access-control-allow-origin');
    expect(response.header['access-control-allow-origin']).to.equal('example.com');
  });

  it('Does nothing if the Origin request header is missing', async () => {
    const response = await apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`) 
      .send(requestData);
    expect(response.header).to.not.have.property('access-control-allow-origin');
  });
});
