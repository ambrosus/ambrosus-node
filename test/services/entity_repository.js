import chai from 'chai';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {put} from '../../src/utils/dict_utils';

import {createAsset, createEvent, createBundle} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';

import EntityRepository from '../../src/services/entity_repository';

const {expect} = chai;

describe('Entity Repository', () => {
  let db;
  let client;
  let storage;

  before(async () => {
    ({db, client} = await connectToMongo());
    storage = new EntityRepository(db);
  });

  describe('Assets', () => {
    const exampleAssetId = '0x123456';
    const exampleAsset = put(createAsset(), 'assetId', exampleAssetId);

    it('db round trip works', async () => {
      await expect(storage.storeAsset(exampleAsset)).to.be.fulfilled;
      await expect(storage.getAsset(exampleAssetId)).to.eventually.be.deep.equal(exampleAsset);
    });

    it('returns null for non-existing asset', async () => {
      const otherAssetId = '0x33333';
      await expect(storage.getAsset(otherAssetId)).to.eventually.be.equal(null);
    });

    after(async () => {
      await cleanDatabase(db);
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

    after(async () => {
      await cleanDatabase(db);
    });
  });

  describe('Find Events', () => {
    let scenario;

    before(async () => {
      scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
      await scenario.injectAccount(adminAccountWithSecret);
      await scenario.addAsset(0);
      await scenario.addAsset(0);
      const eventsSet = await scenario.generateEvents(
        135,
        (inx) => ({
          accountInx: 0,
          subjectInx: (inx % 3 === 0 ? 1 : 0),
          fields: {timestamp: inx},
          data: {}
        })
      );
      for (const event of eventsSet) {
        await storage.storeEvent(event);
      }
    });

    it('without params returns 100 newest events', async () => {
      const ret = await expect(storage.findEvents({})).to.be.fulfilled;
      expect(ret.results).have.lengthOf(100);
      expect(ret.results[0]).to.deep.equal(scenario.events[134]);
      expect(ret.results[99]).to.deep.equal(scenario.events[35]);
      expect(ret.resultCount).to.equal(135);
    });

    it('with assetId param returns events for selected asset', async () => {
      const targetAssetId = scenario.assets[0].assetId;
      const ret = await expect(storage.findEvents({assetId: targetAssetId})).to.be.fulfilled;
      expect(ret.results).have.lengthOf(90);
      expect(ret.resultCount).to.equal(90);
      ret.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
    });

    after(async () => {
      await cleanDatabase(db);
    });
  });

  describe('Bundles', () => {
    it('db round trip works', async () => {
      const exampleBundleId = '0xabcdef';
      const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);
      await storage.storeBundle(exampleBundle);
      await expect(storage.getBundle(exampleBundleId)).to.eventually.be.deep.equal(exampleBundle);
    });

    it('returns null for non-existing event', async () => {
      const otherBundleId = '0x33333';
      await expect(storage.getBundle(otherBundleId)).to.eventually.be.equal(null);
    });

    after(async () => {
      await cleanDatabase(db);
    });
  });

  describe('Bundle process', () => {
    let scenario;

    before(async () => {
      scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
      await scenario.injectAccount(adminAccountWithSecret);
    });

    after(async () => {
      await cleanDatabase(db);
    });
  });

  after(() => {
    client.close();
  });
});
