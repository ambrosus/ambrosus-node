import chai from 'chai';
import sinon from 'sinon';
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

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    await scenario.injectAccount(adminAccountWithSecret);
  });

  describe('finding events', () => {
    beforeEach(async () => {
      await scenario.addAsset(0);
      await scenario.addAsset(0);
      await scenario.generateEvents(
        120,
        (inx) => ({
          accountInx: 0,
          subjectInx: inx % 10 === 0 ? 1 : 0,
          fields: {timestamp: inx},
          data: {}
        })
      );
    });

    it('without additional parameters returns the 100 newest (by timestamp) events', async () => {
      const response = await apparatus.request().get(`/events`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(100);
      expect(body.resultCount).to.equal(120);
      expect(body.results[0]).to.deep.equal(scenario.events[119]);
      expect(body.results[99]).to.deep.equal(scenario.events[20]);
    });

    it('with assetId returns only events for target asset', async () => {
      const targetAssetId = scenario.assets[0].assetId;
      const response = await apparatus.request().get(`/events?assetId=${targetAssetId}`);
      const {body} = response;

      expect(body.results).to.have.lengthOf(100);
      expect(body.resultCount).to.equal(108);
      body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
    });

    it('filters surplus parameters our of the request', async () => {
      // sadly we can't look for side effect of the filtering so a sinon spy is used to check what gets passed into the model engine
      sinon.spy(apparatus.modelEngine, 'findEvents');

      const targetAssetId = scenario.assets[0].assetId;
      await apparatus.request().get(`/events?assetId=${targetAssetId}&additional=123`);

      expect(apparatus.modelEngine.findEvents).to.have.been.calledWith({assetId: targetAssetId});
      
      apparatus.modelEngine.findEvents.restore();
    });
  });

  after(async () => {
    apparatus.stop();
  });
});
