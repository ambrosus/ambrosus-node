import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import {pick, put} from '../../src/utils/dict_utils';

import {createAsset, createBundle, createEvent} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {accountWithSecret, adminAccountWithSecret} from '../fixtures/account';

import EntityRepository from '../../src/services/entity_repository';

const {expect} = chai;
chai.use(chaiAsPromised);

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

    afterEach(async () => {
      await cleanDatabase(db);
    });

    it('db round trip works', async () => {
      await storage.storeEvent(exampleEvent);
      await expect(storage.getEvent(exampleEventId)).to.eventually.be.deep.equal(exampleEvent);
    });

    it('removes data field if access level is too low', async () => {
      const highAccessLevel = put(exampleEvent, 'content.idData.accessLevel', 5);
      await storage.storeEvent(highAccessLevel);
      await expect(storage.getEvent(exampleEventId, 2))
        .to.eventually.be.deep.equal(pick(highAccessLevel, 'content.data'));
    });

    it('returns null for non-existing event', async () => {
      const otherEventId = '0x33333';
      await expect(storage.getEvent(otherEventId)).to.eventually.be.equal(null);
    });
  });

  describe('getConfigurationForFindEventsQuery', () => {
    let repository;

    before(() => {
      repository = new EntityRepository(null);
    });

    it('returns concatenated mongodb query', async () => {
      const params = {
        assetId: 12,
        createdBy: '0x123',
        fromTimestamp: 1,
        toTimestamp: 2,
        locationAsAsset: '0x123',
        entry: {score: 10, acceleration: {valueX: 17}}
      };
      const result = repository.getConfigurationForFindEventsQuery(params);
      expect(result.query).to.deep.eq({
        $and: [
          {'content.idData.accessLevel': {$lte: 0}},
          {'content.data.entries': {$elemMatch: {score: 10}}},
          {'content.data.entries': {$elemMatch: {acceleration: {valueX: 17}}}},
          {'content.idData.assetId': 12},
          {'content.idData.createdBy': '0x123'},
          {'content.idData.timestamp': {$gte: 1}},
          {'content.idData.timestamp': {$lte: 2}},
          {'content.data.location.asset': '0x123'}          
        ]
      });
    });
  });

  describe('Find events', () => {
    describe('without params', () => {
      let scenario;
      before(async () => {
        scenario = new ScenarioBuilder(identityManager);
        await scenario.addAdminAccount(adminAccountWithSecret);
        await scenario.addAsset(0);
        await scenario.addAsset(0);
        const eventsSet = await scenario.generateEvents(
          135,
          (inx) => ({
            accountInx: 0,
            subjectInx: (inx % 3 === 0 ? 1 : 0),
            fields: {timestamp: inx, accessLevel: inx % 10},
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
        const ret = await expect(storage.findEvents({}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(100);
        expect(ret.results[0]).to.deep.equal(scenario.events[134]);
        expect(ret.results[99]).to.deep.equal(scenario.events[35]);
        expect(ret.resultCount).to.equal(135);
      });

      it('removes data field if access level is too low', async () => {
        const ret = await expect(storage.findEvents({}, 5)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(100);
        expect(ret.resultCount).to.equal(135);
        ret.results.forEach((event) => {
          if (event.content.idData.accessLevel <= 5) {
            expect(event.content).to.include.key('data');
          } else {
            expect(event.content).to.not.include.key('data');
          }
        });
      });
    });

    it('addDataAccessLevelLimitationIfNeeded adds its part just once', async () => {
      const queryWithLimitation = storage.addDataAccessLevelLimitationIfNeeded([], 2);
      expect(queryWithLimitation).to.deep.equal([{'content.idData.accessLevel': {$lte: 2}}]);
      expect(storage.addDataAccessLevelLimitationIfNeeded(queryWithLimitation, 2))
        .to.deep.equal(queryWithLimitation);
    });

    describe('additional criteria', () => {
      let scenario;
      let eventsSet;

      before(async () => {
        scenario = new ScenarioBuilder(identityManager);
        await scenario.addAdminAccount(adminAccountWithSecret);
        await scenario.addAccount(0, accountWithSecret, {permissions: ['create_entity']});
        await scenario.addAsset(0, {timestamp: 0});
        await scenario.addAsset(0, {timestamp: 1});

        eventsSet = [
          await scenario.addEvent(0, 0, {timestamp: 0, accessLevel: 0}, {location: {asset: scenario.assets[0].assetId}}),
          await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 1}, {location: {asset: scenario.assets[1].assetId}}),
          await scenario.addEvent(0, 0, {timestamp: 2, accessLevel: 2}, {location: {asset: scenario.assets[0].assetId}}),
          await scenario.addEvent(1, 0, {timestamp: 3, accessLevel: 0}, {location: {asset: scenario.assets[1].assetId}}),
          await scenario.addEvent(1, 0, {timestamp: 4, accessLevel: 1}, {location: {asset: scenario.assets[0].assetId}}),
          await scenario.addEvent(0, 1, {timestamp: 5, accessLevel: 2}, {location: {asset: scenario.assets[1].assetId}}),
          await scenario.addEvent(0, 1, {timestamp: 6, accessLevel: 0}, {location: {asset: scenario.assets[0].assetId}}),
          await scenario.addEvent(0, 1, {timestamp: 7, accessLevel: 1}, {location: {asset: scenario.assets[1].assetId}}),
          await scenario.addEvent(1, 1, {timestamp: 8, accessLevel: 2}, {location: {asset: scenario.assets[0].assetId}}),
          await scenario.addEvent(1, 1, {timestamp: 9, accessLevel: 0}, {location: {asset: scenario.assets[1].assetId}})
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
        const ret = await expect(storage.findEvents({assetId: targetAssetId}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(5);
        expect(ret.resultCount).to.equal(5);
        expect(ret.results).to.deep.equal([eventsSet[0], eventsSet[1], eventsSet[2], eventsSet[3], eventsSet[4]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
      });

      it('with createdBy param returns events for selected creator', async () => {
        const targetCreatorAddress = scenario.accounts[0].address;
        const ret = await expect(storage.findEvents({createdBy: targetCreatorAddress}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(6);
        expect(ret.resultCount).to.equal(6);
        expect(ret.results).to.deep.equal([eventsSet[0], eventsSet[1], eventsSet[2], eventsSet[5], eventsSet[6], eventsSet[7]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.createdBy).to.equal(targetCreatorAddress));
      });

      it('with fromTimestamp param returns only events newer than selected timestamp', async () => {
        const ret = await expect(storage.findEvents({fromTimestamp: 4}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(6);
        expect(ret.resultCount).to.equal(6);
        expect(ret.results).to.deep.equal([eventsSet[4], eventsSet[5], eventsSet[6], eventsSet[7], eventsSet[8], eventsSet[9]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.least(4));
      });

      it('with toTimestamp param returns only events older than selected timestamp', async () => {
        const ret = await expect(storage.findEvents({toTimestamp: 2}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(3);
        expect(ret.results).to.deep.equal([eventsSet[0], eventsSet[1], eventsSet[2]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.most(2));
      });

      it('with fromTimestamp param and toTimestamp param returns events from between selected timestamps', async () => {
        const ret = await expect(storage.findEvents({fromTimestamp: 2, toTimestamp: 4}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(3);
        expect(ret.results).to.deep.equal([eventsSet[2], eventsSet[3], eventsSet[4]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 4));
      });

      it('with perPage returns requested number of events', async () => {
        const ret = await expect(storage.findEvents({perPage: 3}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(10);
        expect(ret.results).to.deep.equal([eventsSet[7], eventsSet[8], eventsSet[9]].reverse());
      });

      it('with page and perPage returns limited requested of events from requested page', async () => {
        const ret = await expect(storage.findEvents({page: 2, perPage: 3}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(10);
        expect(ret.results).to.deep.equal([eventsSet[1], eventsSet[2], eventsSet[3]].reverse());
      });

      it('with all params provided returns events for selected asset and creator, from between selected timestamps and with requested paging', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        const targetCreatorAddress = scenario.accounts[1].address;
        const ret = await expect(storage.findEvents({fromTimestamp: 1, toTimestamp: 4, assetId: targetAssetId, perPage: 2, page: 0, createdBy: targetCreatorAddress}, 10)).to.be.fulfilled;
        expect(ret.results).have.lengthOf(2);
        expect(ret.resultCount).to.equal(2);
        expect(ret.results[0]).to.deep.equal(eventsSet[4]);
        expect(ret.results[1]).to.deep.equal(eventsSet[3]);
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(1, 4));
      });

      describe('search in data field', () => {
        it('search by location(asset)', async () => {
          const targetAssetId = scenario.assets[0].assetId;
          const ret = await expect(storage.findEvents({locationAsAsset: targetAssetId}, 1)).to.be.fulfilled;
          expect(ret.results).have.lengthOf(3);
          expect(ret.resultCount).to.equal(3);
          expect(ret.results).to.deep.equal([eventsSet[6], eventsSet[4], eventsSet[0]]);
        });
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
      const exampleBundleWithMetadata = put(exampleBundle, 'metadata.proofBlock', 10);
      await storage.storeBundle(exampleBundle);
      await storage.storeBundleProofBlock(exampleBundleId, 10);
      await expect(storage.getBundle(exampleBundleId)).to.eventually.be.deep.equal(exampleBundleWithMetadata);
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
      await scenario.addAdminAccount(adminAccountWithSecret);

      alreadyBundledAssets = [
        await scenario.addAsset(0, {timestamp: 0}),
        await scenario.addAsset(0, {timestamp: 1})
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
