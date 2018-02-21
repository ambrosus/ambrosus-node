import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Aparatus from '../helpers/aparatus';
import chaiHttp from 'chai-http';

import {pick} from '../../src/utils/dict_utils';
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
    scenario = new ScenarioBuilder(aparatus.identityManager);
  });

  beforeEach(async () => {
    scenario.reset();
    await aparatus.cleanDB();
  });

  describe('finding events', () => {
    beforeEach(async () => {
      scenario.addAsset();
      await aparatus.request()
        .post('/assets')
        .send(scenario.assets[0]);

      const eventsSet = scenario.addEventsSerial(
        134,
        (inx) => ({
          subject: 0,
          fields: {timestamp: inx},
          data: {}
        })
      ).events;
      for (const event of eventsSet) {
        await aparatus.request()
          .post(`/assets/${scenario.assets[0].assetId}/events`)
          .send(event);
      }
    });

    describe('without additional parameters', () => {
      it('returns the 100 newest (by timestamp) events (augmented with links in metadata)', async () => {
        const response = await aparatus.request().get(`/events`);
        const {body} = response;

        expect(body.results).to.have.lengthOf(100);
        expect(body.resultCount).to.equal(134);
        expect(pick(body.results[0], 'metadata')).to.deep.equal(scenario.events[133]);
        expect(pick(body.results[99], 'metadata')).to.deep.equal(scenario.events[34]);
        
        const [specimen] = body.results;
        expect(specimen.metadata.link).to.equal(`/assets/${specimen.content.idData.assetId}/events/${specimen.eventId}`);
      });
    });
  });

  after(async () => {
    aparatus.stop();
  });
});
