import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import chaiHttp from 'chai-http';

import {adminAccountWithSecret, notRegisteredAccount, accountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {createFullEvent} from '../fixtures/assets_events';
import {pick} from '../../src/utils/dict_utils';
import pkPair from '../fixtures/pk_pair';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Events - Integrations', () => {
  let apparatus;
  let scenario;

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  describe('creating events', () => {
    let event;
    let asset;
    let adminAccount;
    let otherAccount;

    beforeEach(async () => {
      adminAccount = await scenario.injectAccount(adminAccountWithSecret);
      otherAccount = await scenario.addAccount(0, accountWithSecret);
      asset = await scenario.addAsset(0);
      event = createFullEvent(apparatus.identityManager, {
        createdBy: adminAccount.address,
        assetId: asset.assetId
      }, {}, adminAccount.secret);
    });

    it('works with valid input (client signed)', async () => {
      const response = await apparatus.request()
        .post(`/assets/${asset.assetId}/events`)
        .send(event);
      expect(response.status).to.eq(201);
      expect(response.body.content).to.deep.equal(event.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedEvent = pick(event, ['content.signature', 'assetId']);

      const response = await apparatus.request()
        .post(`/assets/${asset.assetId}/events`)
        .set('Authorization', `AMB ${adminAccount.secret}`)
        .send(unsignedEvent);
      expect(response.status).to.eq(201);
      expect(response.body.content.idData).to.deep.equal(unsignedEvent.content.idData);
    });

    it('returns 400 for invalid input (missing required field)', async () => {
      const brokenEvent = pick(event, 'content.idData.timestamp');
      const request = apparatus.request()
        .post(`/assets/${asset.assetId}/events`)
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenEvent);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('returns 403 for authorisation error (user does not exist)', async () => {
      const failingEvent = createFullEvent(apparatus.identityManager,
        {createdBy: notRegisteredAccount.address, assetId: asset.assetId},
        {},
        notRegisteredAccount.secret);

      const request = apparatus.request()
        .post(`/assets/${asset.assetId}/events`)
        .send(failingEvent);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('returns 403 for permission error (no `create_entity` permission)', async () => {
      const notPermittedAsset = createFullEvent(apparatus.identityManager,
        {
          createdBy: otherAccount.address,
          assetId: asset.assetId
        }, {}, otherAccount.secret);

      const request = apparatus.request()
        .post(`/assets/${asset.assetId}/events`)
        .send(notPermittedAsset);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    afterEach(async () => {
      await apparatus.cleanDB();
      scenario.reset();
    });
  });

  describe('finding events', () => {
    before(async () => {
      await scenario.injectAccount(adminAccountWithSecret);
      await scenario.addAccount(0, accountWithSecret, {permissions : ['create_entity']});
      await scenario.addAsset(0);
      await scenario.addAsset(0);
      await scenario.generateEvents(
        12,
        (inx) => ({
          accountInx: inx % 4 === 0 ? 1 : 0,
          subjectInx: inx % 3 === 0 ? 1 : 0,
          fields: {timestamp: inx},
          data: {}
        })
      );
    });

    it('with perPage returns only requested number of newest (by timestamp) events', async () => {
      const perPage = 4;
      const response = await apparatus.request().get(`/events?perPage=${perPage}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(perPage);
      expect(body.resultCount).to.equal(12);
      expect(body.results[0]).to.deep.equal(scenario.events[11]);
      expect(body.results[3]).to.deep.equal(scenario.events[8]);
    });

    it('with page and perPage returns events from selected page', async () => {
      const perPage = 4;
      const page = 2;
      const response = await apparatus.request().get(`/events?perPage=${perPage}&page=${page}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(perPage);
      expect(body.resultCount).to.equal(12);
      expect(body.results).to.deep.equal([scenario.events[0], scenario.events[1], scenario.events[2], scenario.events[3]].reverse());
    });

    it('with assetId returns only events for target asset (default syntax)', async () => {
      const targetAssetId = scenario.assets[0].assetId;
      const response = await apparatus.request().get(`/events?assetId=${targetAssetId}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(8);
      expect(body.resultCount).to.equal(8);
      body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
    });

    
    it('alias syntax for assetId search returns only events for target asset', async () => {
      const targetAssetId = scenario.assets[0].assetId;
      const response = await apparatus.request().get(`/assets/${targetAssetId}/events`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(8);
      expect(body.resultCount).to.equal(8);
      body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
    });

    it('alias syntax with other parameters filters properly', async () => {
      const targetAssetId = scenario.assets[0].assetId;      
      const fromTimestamp = 2;
      const toTimestamp = 10;
      const perPage = 4;
      const page = 1;
      const response = await apparatus.request().get(`/assets/${targetAssetId}/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}&perPage=${perPage}&page=${page}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(2);
      expect(body.resultCount).to.equal(6);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 10));
      body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));      
    });


    it('with createdBy returns only events for target creator', async () => {
      const targetCreatorAddress = scenario.accounts[1].address;
      const response = await apparatus.request().get(`/events?createdBy=${targetCreatorAddress}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(3);
      expect(body.resultCount).to.equal(3);
      body.results.forEach((element) => expect(element.content.idData.createdBy).to.equal(targetCreatorAddress));
    });

    it('with fromTimestamp returns only events newer than selected timestamp', async () => {
      const fromTimestamp = 5;
      const response = await apparatus.request().get(`/events?fromTimestamp=${fromTimestamp}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(7);
      expect(body.resultCount).to.equal(7);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.least(5));
    });

    it('with toTimestamp returns only events older than selected timestamp', async () => {
      const toTimestamp = 5;
      const response = await apparatus.request().get(`/events?toTimestamp=${toTimestamp}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(6);
      expect(body.resultCount).to.equal(6);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.most(5));
    });

    it('with fromTimestamp and toTimestamp returns only events between selected timestamps', async () => {
      const fromTimestamp = 2;
      const toTimestamp = 10;
      const response = await apparatus.request()
        .get(`/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(9);
      expect(body.resultCount).to.equal(9);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 10));
    });

    it('with fromTimestamp, toTimestamp and perPage returns only events between selected timestamps, with quantity limited to perPage, from requested page', async () => {
      const fromTimestamp = 2;
      const toTimestamp = 10;
      const perPage = 4;
      const page = 1;
      const response = await apparatus.request().get(`/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}&perPage=${perPage}&page=${page}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(4);
      expect(body.resultCount).to.equal(9);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 10));
    });    
  });

  after(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    apparatus.stop();
  });
});
