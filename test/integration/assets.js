import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Aparatus from '../helpers/aparatus';
import chaiHttp from 'chai-http';

import {pick, get} from '../../src/utils/dict_utils';
import {createFullAsset, createFullEvent} from '../fixtures/asset_fixture_builder';
import pkPair from '../fixtures/pk_pair';
import {createFullAccountRequest, adminAccountWithSecret, notRegisteredAccount} from '../fixtures/account';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;
let account;

describe('Assets - Integrations', () => {
  let aparatus;

  before(async () => {
    aparatus = new Aparatus();
    await aparatus.start();
    await aparatus.modelEngine.createAdminAccount(adminAccountWithSecret);
    account = await aparatus.request()
      .post('/accounts')
      .send(createFullAccountRequest(aparatus.identityManager));
  });

  describe('creating asset', () => {
    let inputAsset = null;

    beforeEach(async () => {
      inputAsset = createFullAsset(aparatus.identityManager, {createdBy: account.body.content.address}, account.body.content.secret);
    });

    it('works with valid input (client signed)', async () => {
      const response = await aparatus.request()
        .post('/assets')
        .send(inputAsset);
      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${response.body.assetId}`);
      expect(response.body.content).to.deep.equal(inputAsset.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedAsset = pick(inputAsset, ['content.signature', 'assetId']);

      const response = await aparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${account.body.content.secret}`)
        .send(unsignedAsset);
      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${response.body.assetId}`);
      expect(response.body.content.idData).to.deep.equal(unsignedAsset.content.idData);
    });

    it('fails for invalid input', async () => {
      const brokenAsset = pick(inputAsset, 'content.idData.timestamp');
      const request = aparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenAsset);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('fails for not existing creator', async () => {
      const failingAsset = createFullAsset(aparatus.identityManager, {createdBy: notRegisteredAccount.address}, notRegisteredAccount.secret);
      
      const request = aparatus.request()
        .post('/assets')
        .send(failingAsset);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });

  describe('fetching asset', () => {
    let asset;

    beforeEach(async () => {
      const signedAsset = createFullAsset(aparatus.identityManager, {createdBy: account.body.content.address}, account.body.content.secret);
      const response = await aparatus.request()
        .post('/assets')
        .send(signedAsset);
      asset = response.body;
    });

    it('should get asset by id', async () => {
      const response = await aparatus.request()
        .get(`/assets/${asset.assetId}`);
      expect(response.body).to.deep.equal(asset);
    });

    it('should return 404 if asset with that id doesn\'t exist', async () => {
      const request = aparatus.request()
        .get(`/assets/nonexistingAsset`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('creating event', () => {
    let baseAsset = null;
    let inputEvent = null;


    beforeEach(async () => {
      baseAsset = createFullAsset(aparatus.identityManager, {createdBy: account.body.content.address}, account.body.content.secret);
      await aparatus.request()
        .post('/assets')
        .send(baseAsset);
      inputEvent = createFullEvent(aparatus.identityManager, {assetId: baseAsset.assetId, createdBy: account.body.content.address}, {}, account.body.content.secret);
    });

    it('works with valid input (client signed)', async () => {
      const response = await aparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .send(inputEvent);

      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${baseAsset.assetId}/events/${response.body.eventId}`);
      expect(response.body.content).to.deep.equal(inputEvent.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedEvent = pick(inputEvent, ['content.signature', 'eventId', 'content.idData.dataHash']);

      const response = await aparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .set('Authorization', `AMB ${account.body.content.secret}`)
        .send(unsignedEvent);

      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${baseAsset.assetId}/events/${response.body.eventId}`);
      // the idData should include all values taken from the input + dataHash
      for (const key of ['timestamp', 'accessLevel', 'assetId', 'createdBy']) {
        expect(get(response.body.content.idData, key)).to.equal(get(unsignedEvent.content.idData, key));
      }
      expect(response.body.content.idData.dataHash).to.exist;
      expect(response.body.content.data).to.deep.equal(unsignedEvent.content.data);
    });

    it('fails for invalid input', async () => {
      const brokenEvent = pick(inputEvent, 'content.data');
      const request = aparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenEvent);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('fails for not existing creator', async () => {
      const failingEvent = createFullEvent(aparatus.identityManager, {assetId: baseAsset.assetId, createdBy: notRegisteredAccount.address}, {}, notRegisteredAccount.secret);
    
      const request = aparatus.request()
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
      const signedAsset = createFullAsset(aparatus.identityManager, {createdBy: account.body.content.address}, account.body.content.secret);
      const addAssetResponse = await aparatus.request()
        .post('/assets')
        .send(signedAsset);
      asset = addAssetResponse.body;

      const signedEvent = createFullEvent(aparatus.identityManager, {assetId: asset.assetId, createdBy: account.body.content.address}, {}, account.body.content.secret);

      const addEventResponse = await aparatus.request()
        .post(`/assets/${asset.assetId}/events`)
        .send(signedEvent);
      event = addEventResponse.body;
    });

    it('works for existing event', async () => {
      const response = await aparatus.request()
        .get(`/assets/${asset.assetId}/events/${event.eventId}`);
      expect(response.body).to.deep.equal(event);
    });

    it('should return 404 if asset with that id doesn\'t exist', async () => {
      const request = aparatus.request()
        .get(`/assets/${asset.assetId}/events/nonexistingEvent`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  after(async () => {
    aparatus.stop();
  });
});
