import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import chaiHttp from 'chai-http';

import {adminAccountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';

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


  describe('finding events', () => {
    before(async () => {
      await scenario.injectAccount(adminAccountWithSecret);
      await scenario.addAsset(0);
      await scenario.addAsset(0);
      await scenario.generateEvents(
        12,
        (inx) => ({
          accountInx: 0,
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

    it('with assetId returns only events for target asset', async () => {
      const targetAssetId = scenario.assets[0].assetId;
      const response = await apparatus.request().get(`/events?assetId=${targetAssetId}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(8);
      expect(body.resultCount).to.equal(8);
      body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
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
      const response = await apparatus.request().get(`/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}`);
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
