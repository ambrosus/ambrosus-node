import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Apparatus, {apparatusScenarioProcessor} from '../../helpers/apparatus';
import chaiHttp from 'chai-http';
import {accountWithSecret, adminAccountWithSecret} from '../../fixtures/account';
import ScenarioBuilder from '../../fixtures/scenario_builder';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Events Integrations: Find entries', () => {
  const accessLevel = 3;
  let apparatus;
  let scenario;

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await scenario.addAdminAccount(adminAccountWithSecret);
    await scenario.addAccount(0, accountWithSecret, {permissions: ['create_entity'], accessLevel});
    await scenario.addAsset(0, {sequenceNumber: 0});
    await scenario.addAsset(0, {sequenceNumber: 1});

    await scenario.addEvent(0, 0, {timestamp: 0, accessLevel: 1}, {entries: [{
      type: 'com.ambrosus.delivered',
      confirmationAddress: '0xD49f20a8339FFe6471D3a32f874fC82CfDd98750',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }]});
    await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 0}, {entries: [{
      type: 'com.ambrosus.scan',
      value: 'acceleration',
      acceleration: {
        valueX: '1',
        valueY: 2
      }      
    }]});
  });

  const get = (url) =>
    apparatus.request()
      .get(url)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);

  it('works with string', async () => {
    const response = await get(`/events?entry[type]=com.ambrosus.delivered`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data.entries[0].type).to.equal('com.ambrosus.delivered');
  });

  it('works with string and accessLevel=1', async () => {
    await scenario.addEvent(0, 0, {timestamp: 0, accessLevel: 0}, {entries: [{
      type: 'com.ambrosus.delivered',            
      confirmationAddress: '0x33333333333333333333333333333333333333',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }]});
    const response = await apparatus.request().get(`/events?entry[type]=com.ambrosus.delivered`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data.entries[0].confirmationAddress).to.equal('0x33333333333333333333333333333333333333');
  });

  it('works with strings on nested object', async () => {
    const response = await get(`/events?entry[acceleration.valueX]=1`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data.entries[0].type).to.equal('com.ambrosus.scan');
  });

  it('works with number decorator on nested object', async () => {
    const response = await get(`/events?entry[acceleration.valueY]=number(2)`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data.entries[0].type).to.equal('com.ambrosus.scan');
  });

  it('fails when array index provided in query', async () => {
    expect(get(`/events?entry[acceleration][0]=1`))
      .to.eventually.be.rejected.and.have.property('status', 400);
  });

  it('fails if array provided in query', async () => {
    expect(get(`/events?entry[acceleration]=[1,2]`))
      .to.eventually.be.rejected.and.have.property('status', 400);
  });

  it('fails if object provided in query', async () => {
    expect(get(`/events?entry[acceleration]={x: 1, y: 2}`))
      .to.eventually.be.rejected.and.have.property('status', 400);
  });

  it('with conjunction', async () => {
    await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 0}, {entries: [{
      type: 'com.ambrosus.delivered',                           
      confirmationAddress: '0x2222222222222222222222222222222222222222',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'      
    }]});    
    const response = await get('/events?entry[type]=com.ambrosus.delivered&fromTimestamp=1');
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data.entries[0].confirmationAddress).to.equal('0x2222222222222222222222222222222222222222');
  });

  afterEach(async () => {    
    await apparatus.cleanDB();
    scenario.reset();    
  });

  after(async () => {
    apparatus.stop();
  });
});
