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
  let identityManager;

  before(async () => {
    ({db, client} = await connectToMongo());
    identityManager = new IdentityManager(await createWeb3());
    storage = new EntityRepository(db);
  });

  after(async () => {
    client.close();
  });

  describe('Assets', () => {
    const exampleAssetId = '0x123456';
    const exampleAsset = put(createAsset(), 'assetId', exampleAssetId);

    after(async () => {
      await cleanDatabase(db);
    });

    it('db round trip works', async () => {
      await expect(storage.storeAsset(exampleAsset)).to.be.fulfilled;
      await expect(storage.getAsset(exampleAssetId)).to.eventually.be.deep.equal(exampleAsset);
    });

    it('returns null for non-existing asset', async () => {
      const otherAssetId = '0x33333';
      await expect(storage.getAsset(otherAssetId)).to.eventually.be.equal(null);
    });
  });

  describe('Events', () => {
    const exampleEventId = '0x123456';
    const exampleEvent = put(createEvent(), 'eventId', exampleEventId);

    after(async () => {
      await cleanDatabase(db);
    });

    it('db round trip works', async () => {
      await storage.storeEvent(exampleEvent);
      await expect(storage.getEvent(exampleEventId)).to.eventually.be.deep.equal(exampleEvent);
    });

    it('returns null for non-existing event', async () => {
      const otherEventId = '0x33333';
      await expect(storage.getEvent(otherEventId)).to.eventually.be.equal(null);
    });
  });

  describe('Find events', () => {
    describe('without params', () => {
      let scenario;
      before(async () => {
        scenario = new ScenarioBuilder(identityManager);
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

      after(async () => {
        await cleanDatabase(db);
      });

      it('returns 100 newest events without page and perPage params', async () => {
        const ret = await expect(storage.findEvents({})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(100);
        expect(ret.results[0]).to.deep.equal(scenario.events[134]);
        expect(ret.results[99]).to.deep.equal(scenario.events[35]);
        expect(ret.resultCount).to.equal(135);
      });
    });

    describe('additional criteria', () => {
      let scenario;
      let eventsSet;

      before(async () => {
        scenario = new ScenarioBuilder(identityManager);
        await scenario.injectAccount(adminAccountWithSecret);
        await scenario.addAsset(0);
        await scenario.addAsset(0);

        eventsSet = [
          await scenario.addEvent(0, 0, {timestamp: 0}),
          await scenario.addEvent(0, 0, {timestamp: 1}),
          await scenario.addEvent(0, 0, {timestamp: 2}),
          await scenario.addEvent(0, 0, {timestamp: 3}),
          await scenario.addEvent(0, 0, {timestamp: 4}),
          await scenario.addEvent(0, 1, {timestamp: 5}),
          await scenario.addEvent(0, 1, {timestamp: 6}),
          await scenario.addEvent(0, 1, {timestamp: 7}),
          await scenario.addEvent(0, 1, {timestamp: 8}),
          await scenario.addEvent(0, 1, {timestamp: 9})
        ];

        for (const event of eventsSet) {
          await storage.storeEvent(event);
        }
      });

      after(async () => {
        await cleanDatabase(db);
      });

      it('with assetId param returns events for selected asset', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        const ret = await expect(storage.findEvents({assetId: targetAssetId})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(5);
        expect(ret.resultCount).to.equal(5);
        expect(ret.results[0]).to.deep.equal(eventsSet[4]);
        expect(ret.results[1]).to.deep.equal(eventsSet[3]);
        expect(ret.results[2]).to.deep.equal(eventsSet[2]);
        expect(ret.results[3]).to.deep.equal(eventsSet[1]);
        expect(ret.results[4]).to.deep.equal(eventsSet[0]);
        ret.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
      });

      it('with fromTimestamp param returns only events newer than selected timestamp', async () => {
        const ret = await expect(storage.findEvents({fromTimestamp: 4})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(6);
        expect(ret.resultCount).to.equal(6);
        expect(ret.results[5]).to.deep.equal(eventsSet[4]);
        expect(ret.results[4]).to.deep.equal(eventsSet[5]);
        expect(ret.results[3]).to.deep.equal(eventsSet[6]);
        expect(ret.results[2]).to.deep.equal(eventsSet[7]);
        expect(ret.results[1]).to.deep.equal(eventsSet[8]);
        expect(ret.results[0]).to.deep.equal(eventsSet[9]);
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.least(4));
      });

      it('with toTimestamp param returns only events older than selected timestamp', async () => {
        const ret = await expect(storage.findEvents({toTimestamp: 2})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(3);
        expect(ret.results[0]).to.deep.equal(eventsSet[2]);
        expect(ret.results[1]).to.deep.equal(eventsSet[1]);
        expect(ret.results[2]).to.deep.equal(eventsSet[0]);
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.most(2));
      });

      it('with fromTimestamp param and toTimestamp param returns events from between selected timestamps', async () => {
        const ret = await expect(storage.findEvents({fromTimestamp: 2, toTimestamp: 4})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(3);
        expect(ret.results[0]).to.deep.equal(eventsSet[4]);
        expect(ret.results[1]).to.deep.equal(eventsSet[3]);
        expect(ret.results[2]).to.deep.equal(eventsSet[2]);
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 4));
      });

      it('with perPage returns requested number of events', async () => {
        const ret = await expect(storage.findEvents({perPage : 3})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(10);
        expect(ret.results[0]).to.deep.equal(eventsSet[9]);
        expect(ret.results[1]).to.deep.equal(eventsSet[8]);
        expect(ret.results[2]).to.deep.equal(eventsSet[7]);
      });

      it('with page and perPage returns limited requested of events from requested page', async () => {
        const ret = await expect(storage.findEvents({page : 2, perPage : 3})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(10);
        expect(ret.results[0]).to.deep.equal(eventsSet[3]);
        expect(ret.results[1]).to.deep.equal(eventsSet[2]);
        expect(ret.results[2]).to.deep.equal(eventsSet[1]);
      });

      it('with all params provided returns events for selected asset, from between selected timestamps and with requested paging', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        const ret = await expect(storage.findEvents({fromTimestamp: 1, toTimestamp: 4, assetId: targetAssetId, perPage : 2, page: 1})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(2);
        expect(ret.resultCount).to.equal(4);
        expect(ret.results[0]).to.deep.equal(eventsSet[2]);
        expect(ret.results[1]).to.deep.equal(eventsSet[1]);
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(1, 4));
      });
    });
  });

  describe('Bundles', () => {
    after(async () => {
      await cleanDatabase(db);
    });

    it('db round trip works', async () => {
      const exampleBundleId = '0xabcdef';
      const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);
      await storage.storeBundle(exampleBundle);
      await expect(storage.getBundle(exampleBundleId)).to.eventually.be.deep.equal(exampleBundle);
    });

    it('returns null for non-existing bundle', async () => {
      const otherBundleId = '0x33333';
      await expect(storage.getBundle(otherBundleId)).to.eventually.be.equal(null);
    });
  });

  describe('Bundle process', () => {
    let scenario;

    const bundleStubId = '123';
    const bundleId = 'xyz';
    let alreadyBundledAssets;
    let alreadyBundledEvents;
    let nonBundledAssets;
    let nonBundledEvents;

    let ret;

    before(async () => {
      scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
      await scenario.injectAccount(adminAccountWithSecret);

      alreadyBundledAssets = [
        await scenario.addAsset(0),
        await scenario.addAsset(0)
      ].map((asset) => put(asset, 'metadata.bundleId', 1));

      alreadyBundledEvents = [
        await scenario.addEvent(0, 0),
        await scenario.addEvent(0, 1)
      ].map((event) => put(event, 'metadata.bundleId', 1));

      nonBundledAssets = [
        await scenario.addAsset(0),
        await scenario.addAsset(0)
      ].map((asset) => put(asset, 'metadata.bundleId', null));

      nonBundledEvents = [
        await scenario.addEvent(0, 2),
        await scenario.addEvent(0, 3)
      ].map((event) => put(event, 'metadata.bundleId', null));

      await Promise.all([...alreadyBundledAssets, ...nonBundledAssets].map((asset) => storage.storeAsset(asset)));
      await Promise.all([...alreadyBundledEvents, ...nonBundledEvents].map((event) => storage.storeEvent(event)));

      ret = await expect(storage.beginBundle(bundleStubId)).to.be.fulfilled;
      await expect(storage.endBundle(bundleStubId, bundleId)).to.be.fulfilled;
    });

    after(async () => {
      await cleanDatabase(db);
    });

    it('returns only assets and events without a bundle', () => {
      expect(ret.assets).to.deep.include.members(nonBundledAssets);
      expect(ret.assets).to.have.lengthOf(nonBundledAssets.length);
      expect(ret.events).to.deep.include.members(nonBundledEvents);
      expect(ret.events).to.have.lengthOf(nonBundledEvents.length);
    });

    it('the assets and events included in the bundle should have the metadata.bundleId set after the call to endBundle', async () => {
      for (const asset of nonBundledAssets) {
        const storedAsset = await storage.getAsset(asset.assetId);
        expect(storedAsset.metadata.bundleId).to.equal(bundleId);
      }

      for (const event of nonBundledEvents) {
        const storedEvent = await storage.getEvent(event.eventId);
        expect(storedEvent.metadata.bundleId).to.equal(bundleId);
      }
    });

    it('other assets and events that are not included in the bundle should be left untouched', async () => {
      for (const asset of alreadyBundledAssets) {
        const storedAsset = await storage.getAsset(asset.assetId);
        expect(storedAsset).to.deep.equal(asset);
      }

      for (const event of alreadyBundledEvents) {
        const storedEvent = await storage.getEvent(event.eventId);
        expect(storedEvent).to.deep.equal(event);
      }
    });

    it('second call to beginBundle should also ignore assets and events currently being bundled', async () => {
      const ret2 = await expect(storage.beginBundle('otherId')).to.be.fulfilled;
      expect(ret2.assets).to.be.empty;
      expect(ret2.events).to.be.empty;
    });
  });
});
