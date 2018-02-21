import chai from 'chai';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {put} from '../../src/utils/dict_utils';

import {createAsset, createEvent} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';

import EntityRepository from '../../src/services/entity_repository';

const {expect} = chai;

describe('Entity Repository', () => {
  let db;
  let client;
  let storage;
  let scenario;

  before(async () => {
    ({db, client} = await connectToMongo());
    storage = new EntityRepository(db);

    scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
  });

  describe('Assets', () => {
    it('db round trip works', async () => {
      const exmapleAssetId = '0x123456';
      const exampleAsset = put(createAsset(), 'assetId', exmapleAssetId);
      await storage.storeAsset(exampleAsset);
      await expect(storage.getAsset(exmapleAssetId)).to.eventually.be.deep.equal(exampleAsset);
    });

    it('returns null for non-existing asset', async () => {
      const otherAssetId = '0x33333';
      await expect(storage.getAsset(otherAssetId)).to.eventually.be.equal(null);
    });
  });


  describe('Events', () => {
    it('db round trip works', async () => {
      const exampleEventId = '0x123456';
      const exampleEvent = put(createEvent(), 'eventId', exampleEventId);
      await storage.storeEvent(exampleEvent);
      await expect(storage.getEvent(exampleEventId)).to.eventually.be.deep.equal(exampleEvent);
    });

    it('returns null for non-existing event', async () => {
      const otherEventId = '0x33333';
      await expect(storage.getEvent(otherEventId)).to.eventually.be.equal(null);
    });

    describe('Find', () => {
      beforeEach(async () => {
        scenario.addAsset();
        const eventsSet = scenario.addEventsSerial(
          134, 
          (inx) => ({
            subject: 0,
            fields: {timestamp: inx},
            data: {}
          })
        ).events;
        for (const event of eventsSet) {
          await storage.storeEvent(event);
        }
      });

      it('returns 100 newest (ordered by timestamp desc) events', async () => {
        const ret = await expect(storage.findEvents()).to.be.fulfilled;
        expect(ret.results).have.lengthOf(100);
        expect(ret.results[0]).to.deep.equal(scenario.events[133]);
        expect(ret.results[99]).to.deep.equal(scenario.events[34]);
        expect(ret.resultCount).to.equal(134);
      });
    });
  });

  afterEach(async () => {
    await cleanDatabase(db);
    scenario.reset();
  });

  after(() => {
    client.close();
  });
});
