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
        200,
        (inx) => ({
          accountInx: 0,
          subjectInx: inx % 20 === 0 ? 1 : 0,
          fields: {timestamp: inx},
          data: {}
        })
      );
    });

    it('without additional parameters returns the 100 newest (by timestamp) events', async () => {
      const response = await apparatus.request().get(`/events`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(100);
      expect(body.resultCount).to.equal(200);
      expect(body.results[0]).to.deep.equal(scenario.events[199]);
      expect(body.results[99]).to.deep.equal(scenario.events[100]);
    });

    it('with assetId returns only events for target asset', async () => {
      const targetAssetId = scenario.assets[0].assetId;
      const response = await apparatus.request().get(`/events?assetId=${targetAssetId}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(100);
      expect(body.resultCount).to.equal(190);
      body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
    });


    it('with fromTimestamp returns only events newer than selected timestamp', async () => {
      const fromTimestamp = 50;
      const response = await apparatus.request().get(`/events?fromTimestamp=${fromTimestamp}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(100);
      expect(body.resultCount).to.equal(150);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.least(50));
    });

    it('with toTimestamp returns only events older than selected timestamp', async () => {
      const toTimestamp = 50;
      const response = await apparatus.request().get(`/events?toTimestamp=${toTimestamp}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(51);
      expect(body.resultCount).to.equal(51);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.most(50));
    });

    it('with fromTimestamp and toTimestamp returns only events between selected timestamps', async () => {
      const fromTimestamp = 50;
      const toTimestamp = 100;
      const response = await apparatus.request().get(`/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(51);
      expect(body.resultCount).to.equal(51);
      body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(50, 100));
    });
  });

  after(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    apparatus.stop();
  });
});
