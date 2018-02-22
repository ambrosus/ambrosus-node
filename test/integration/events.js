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
      await scenario.generateEvents(
        134,
        (inx) => ({
          accountInx: 0,
          subjectInx: 0,
          fields: {timestamp: inx},
          data: {}
        })
      );
    });

    describe('without additional parameters', () => {
      it('returns the 100 newest (by timestamp) events (augmented with links in metadata)', async () => {
        const response = await aparatus.request().get(`/events`);
        const {body} = response;

        expect(body.results).to.have.lengthOf(100);
        expect(body.resultCount).to.equal(134);
        expect(body.results[0]).to.deep.equal(scenario.events[133]);
        expect(body.results[99]).to.deep.equal(scenario.events[34]);

        const [specimen] = body.results;
        expect(specimen.metadata.link).to.equal(`/assets/${specimen.content.idData.assetId}/events/${specimen.eventId}`);
      });
    });
  });

  after(async () => {
    aparatus.stop();
  });
});
