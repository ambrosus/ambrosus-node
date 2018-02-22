import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Aparatus, {aparatusScenarioProcessor} from '../helpers/aparatus';
import chaiHttp from 'chai-http';

import {adminAccountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Events - Integrations', () => {
  let aparatus;
  let scenario;

  before(async () => {
    aparatus = new Aparatus();
    await aparatus.start();
    scenario = new ScenarioBuilder(aparatus.identityManager, aparatusScenarioProcessor(aparatus));
  });

  beforeEach(async () => {
    await aparatus.cleanDB();
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

    describe('without additional parameters', () => {
      it('returns the 100 newest (by timestamp) events', async () => {
        const response = await aparatus.request().get(`/events`);
        const {body} = response;

        expect(body.results).to.have.lengthOf(100);
        expect(body.resultCount).to.equal(120);
        expect(body.results[0]).to.deep.equal(scenario.events[119]);
        expect(body.results[99]).to.deep.equal(scenario.events[20]);
      });

      it('with assetId returns only events for target asset', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        const response = await aparatus.request().get(`/events?assetId=${targetAssetId}`);
        const {body} = response;

        expect(body.results).to.have.lengthOf(100);
        expect(body.resultCount).to.equal(108);
        body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
      });
    });
  });

  after(async () => {
    aparatus.stop();
  });
});
