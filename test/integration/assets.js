import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import chaiHttp from 'chai-http';

import {pick} from '../../src/utils/dict_utils';
import {createFullAsset} from '../fixtures/assets_events';
import pkPair from '../fixtures/pk_pair';
import {adminAccountWithSecret, notRegisteredAccount, accountWithSecret} from '../fixtures/account';
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
    otherAccount = await scenario.addAccount(0, accountWithSecret);
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

  describe('fetching event', () => {
    let asset;
    let event;


    beforeEach(async () => {
      asset = await scenario.addAsset();
      event = await scenario.addEvent();
    });

    it('works for existing event', async () => {
      const response = await apparatus.request()
        .get(`/assets/${asset.assetId}/events/${event.eventId}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
      expect(response.body).to.deep.equal(event);
    });

    it('should return 404 if asset with that id doesn\'t exist', async () => {
      const request = apparatus.request()
        .get(`/assets/${asset.assetId}/events/nonexistingEvent`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  after(async () => {
    apparatus.stop();
  });
});
