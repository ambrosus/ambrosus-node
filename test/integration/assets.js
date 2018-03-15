import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import chaiHttp from 'chai-http';

import {pick, get} from '../../src/utils/dict_utils';
import {createFullAsset, createFullEvent} from '../fixtures/assets_events';
import pkPair from '../fixtures/pk_pair';
import {adminAccountWithSecret, notRegisteredAccount, account} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Assets - Integrations', () => {
  let apparatus;
  let scenario;
  let adminAccount;
  let otherAccount;

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    adminAccount = await scenario.injectAccount(adminAccountWithSecret);
    otherAccount = await scenario.addAccount(account.address);
  });

  describe('creating asset', () => {
    let asset = null;

    beforeEach(async () => {
      asset = createFullAsset(apparatus.identityManager, {createdBy: adminAccount.address}, adminAccount.secret);
    });

    it('works with valid input (client signed)', async () => {
      const response = await apparatus.request()
        .post('/assets')
        .send(asset);
      expect(response.status).to.eq(201);
      expect(response.body.content).to.deep.equal(asset.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedAsset = pick(asset, ['content.signature', 'assetId']);

      const response = await apparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${adminAccount.secret}`)
        .send(unsignedAsset);
      expect(response.status).to.eq(201);
      expect(response.body.content.idData).to.deep.equal(unsignedAsset.content.idData);
    });

    it('returns 400 for invalid input (missing required field)', async () => {
      const brokenAsset = pick(asset, 'content.idData.timestamp');
      const request = apparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenAsset);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('returns 403 for authorisation error (user does not exist)', async () => {
      const failingAsset = createFullAsset(apparatus.identityManager, {createdBy: notRegisteredAccount.address}, notRegisteredAccount.secret);
      
      const request = apparatus.request()
        .post('/assets')
        .send(failingAsset);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('returns 403 for permission error (no `create_entity` permission)', async () => {
      const notPermittedAsset = createFullAsset(apparatus.identityManager, {createdBy: otherAccount.address},
        otherAccount.secret);

      const request = apparatus.request()
        .post('/assets')
        .send(notPermittedAsset);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });

  describe('fetching asset', () => {
    let asset;

    beforeEach(async () => {
      asset = await scenario.addAsset();
    });

    it('should get asset by id', async () => {
      const response = await apparatus.request()
        .get(`/assets/${asset.assetId}`);
      expect(response.body).to.deep.equal(asset);
    });

    it('should return 404 if asset with that id doesn\'t exist', async () => {
      const request = apparatus.request()
        .get(`/assets/nonexistingAsset`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('creating event', () => {
    let baseAsset = null;
    let inputEvent = null;


    beforeEach(async () => {
      baseAsset = await scenario.addAsset();
      inputEvent = createFullEvent(apparatus.identityManager, {assetId: baseAsset.assetId, createdBy: adminAccount.address}, {}, adminAccount.secret);
    });

    it('works with valid input (client signed)', async () => {
      const response = await apparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .send(inputEvent);

      expect(response.status).to.eq(201);
      expect(response.body.content).to.deep.equal(inputEvent.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedEvent = pick(inputEvent, ['content.signature', 'eventId', 'content.idData.dataHash']);

      const response = await apparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .set('Authorization', `AMB ${adminAccount.secret}`)
        .send(unsignedEvent);

      expect(response.status).to.eq(201);
      // the idData should include all values taken from the input + dataHash
      for (const key of ['timestamp', 'accessLevel', 'assetId', 'createdBy']) {
        expect(get(response.body.content.idData, key)).to.equal(get(unsignedEvent.content.idData, key));
      }
      expect(response.body.content.idData.dataHash).to.exist;
      expect(response.body.content.data).to.deep.equal(unsignedEvent.content.data);
    });

    it('fails for invalid input', async () => {
      const brokenEvent = pick(inputEvent, 'content.data');
      const request = apparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenEvent);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('returns 403 for authorisation error (user does not exist)', async () => {
      const failingEvent = createFullEvent(apparatus.identityManager, {assetId: baseAsset.assetId, createdBy: notRegisteredAccount.address}, {}, notRegisteredAccount.secret);
    
      const request = apparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .send(failingEvent);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });
  
  describe('fetching event', () => {
    let asset;
    let event;


    beforeEach(async () => {
      asset = await scenario.addAsset();
      event = await scenario.addEvent();
    });

    it('works for existing event', async () => {
      const response = await apparatus.request()
        .get(`/assets/${asset.assetId}/events/${event.eventId}`);
      expect(response.body).to.deep.equal(event);
    });

    it('should return 404 if asset with that id doesn\'t exist', async () => {
      const request = apparatus.request()
        .get(`/assets/${asset.assetId}/events/nonexistingEvent`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  after(async () => {
    apparatus.stop();
  });
});
