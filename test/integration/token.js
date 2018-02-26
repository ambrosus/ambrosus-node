import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import Apparatus from '../helpers/apparatus';
import pkPair from '../fixtures/pk_pair';

chai.use(chaiHttp);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Token - Integrations', async () => {
  const requestData = {
    validUntil: 42
  };
  const expectedToken = 'eyJpZERhdGEiOnsiY3JlYXRlZEJ5IjoiMHg3NDJlNjJjYzdhMTllZjdkOWM0NDMwNmMwN2ZhZDU0YjViZjZkNGJlIiwidmFsaWRVbnRpbCI6NDJ9LCJzaWduYXR1cmUiOiIweGJkYThkM2Y4MGU3NGRmZjM3YmMyN2QyYjU2MzUwNWNkMmZmZGNjNjQxZjhiNDZkZjYwM2VmNTcwZTBhOTY3Nzg2ZDJiMDMxZTVjYjAyMzNmMGJkMDQ3NGQ2NWYzOTEyMDU1Y2YwYmYxZDNjZDU5Zjk4NzdjZWQ2MWJiZGM4MjFmMWMifQ';

  let apparatus;

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
  });

  it('gets new token', async () => {
    const token = await apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`)
      .send(requestData);
    expect(token.body).to.deep.eq({
      token: expectedToken
    });
  });

  it('throws 401 if bad secret', async () => {
    const request = apparatus.request()
      .post('/token')
      .set('authorization', `AMB 0xxyz`)
      .send(requestData);
    await expect(request).to.eventually.be.rejected.and.have.property('status', 401);
  });

  it('throws 401 if no secret provided', async () => {
    const request = apparatus.request()
      .post('/token')
      .send(requestData);
    await expect(request).to.eventually.be.rejected.and.have.property('status', 401);
  });

  it('throws 400 if no `validUntil` provided', async () => {
    const request = apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`)
      .send({});
    await expect(request).to.eventually.be.rejected.and.have.property('status', 400);
  });

  it('ignores all fields other than `validUntil`', async () => {
    const token = await apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`)
      .send({
        ...requestData,
        createdBy: '0x2331232131213123',
        one: 1
      });
    expect(token.body).to.deep.eq({
      token: expectedToken
    });
  });

  after(async () => {
    apparatus.stop();
  });
});
