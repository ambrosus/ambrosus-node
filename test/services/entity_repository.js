/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import {cleanDatabase, connectToMongo, mongoObjectSize} from '../../src/utils/db_utils';
import {pick, put} from '../../src/utils/dict_utils';
import {createAsset, createBundle, createEvent} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';
import config from '../../config/config';

import EntityRepository from '../../src/services/entity_repository';
import {getTimestamp} from '../../src/utils/time_utils';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Entity Repository', () => {
  let db;
  let client;
  let storage;

  before(async () => {
    ({db, client} = await connectToMongo(config));
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


  describe('Bundles', () => {
    const txHash = '0xc9087b7510e98183f705fe99ddb6964f3b845878d8a801cf6b110975599b6009';
    const storagePeriods = 5;
    let clock;

    before(async () => {
      clock = sinon.useFakeTimers(5000);
    });

    after(async () => {
      await cleanDatabase(db);
      clock.restore();
    });

    it('db round trip works', async () => {
      const exampleBundleId = '0xabcdef';
      const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);
      await storage.storeBundle(exampleBundle, storagePeriods);
      await expect(storage.getBundle(exampleBundleId)).to.eventually.deep.equal(exampleBundle);
      await expect(storage.getBundleMetadata(exampleBundleId)).to.eventually.deep.equal({bundleId: exampleBundleId, storagePeriods});
      await storage.storeBundleProofMetadata(exampleBundleId, 10, txHash);
      await expect(storage.getBundle(exampleBundleId), 'bundle after proof').to.eventually.deep.equal(exampleBundle);
      await expect(storage.getBundleMetadata(exampleBundleId), 'bundle metadata after proof').to.eventually.deep.equal({
        bundleId: exampleBundleId,
        proofBlock: 10,
        bundleTransactionHash: txHash,
        bundleUploadTimestamp: 5,
        storagePeriods
      });
    });

    it('returns null for non-existing bundle', async () => {
      const otherBundleId = '0x33333';
      await expect(storage.getBundle(otherBundleId)).to.eventually.be.equal(null);
      await expect(storage.getBundleMetadata(otherBundleId)).to.eventually.be.equal(null);
    });

    describe('discardEntitiesForBundling', () => {
      const exampleEntities = [...Array(10).keys()].map((inx) => ({
        id: inx,
        mongoSize: 10
      }));

      it('returns empty array if neither entities count nor their size exceed limit', async () => {
        expect(storage.discardEntitiesForBundling(exampleEntities, 100, 1000)).to.deep.equal([]);
      });

      it('returns entities (from the end) not fitting into bundleItemsCountLimit', async () => {
        expect(storage.discardEntitiesForBundling(exampleEntities, 8, 1000)).to.deep.equal([exampleEntities[8], exampleEntities[9]]);
      });

      it('returns entities (from the end) not fitting into the bundleSizeInBytesLimit', async () => {
        expect(storage.discardEntitiesForBundling(exampleEntities, 100, 50)).to.deep.equal(exampleEntities.slice(5));
      });
    });
  });

  describe('bundling entities helper functions', () => {
    let scenario;
    let assets;
    let events;

    before(async () => {
      scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
      await scenario.addAdminAccount(adminAccountWithSecret);

      assets = [
        await scenario.addAsset(0, {timestamp: 2}),
        await scenario.addAsset(0, {timestamp: 62, sequenceNumber: 0}),
        await scenario.addAsset(0, {timestamp: 62, sequenceNumber: 1})
      ];

      events = [
        await scenario.addEvent(0, 0, {timestamp: 62}),
        await scenario.addEvent(0, 1, {timestamp: 21, accessLevel: 0}),
        await scenario.addEvent(0, 1, {timestamp: 21, accessLevel: 2})
      ];
    });

    describe('assetsAndEventsToEntityIds', () => {
      let ret;

      before(() => {
        ret = storage.assetsAndEventsToEntityIds(assets, events);
      });

      it('includes an entry for every provided asset and event', () => {
        expect(ret).to.have.length(assets.length + events.length);
      });

      it('extracts ids', () => {
        expect(ret[0].id).to.equal(assets[0].assetId);
        expect(ret[1].id).to.equal(assets[1].assetId);
        expect(ret[2].id).to.equal(assets[2].assetId);
        expect(ret[3].id).to.equal(events[0].eventId);
        expect(ret[4].id).to.equal(events[1].eventId);
        expect(ret[5].id).to.equal(events[2].eventId);
      });

      it('extracts timestamps', () => {
        expect(ret[0].timestamp).to.equal(assets[0].content.idData.timestamp);
        expect(ret[1].timestamp).to.equal(assets[1].content.idData.timestamp);
        expect(ret[2].timestamp).to.equal(assets[2].content.idData.timestamp);
        expect(ret[3].timestamp).to.equal(events[0].content.idData.timestamp);
        expect(ret[4].timestamp).to.equal(events[1].content.idData.timestamp);
        expect(ret[5].timestamp).to.equal(events[2].content.idData.timestamp);
      });

      it('calculates mongoSize', () => {
        expect(ret[0].mongoSize).to.equal(mongoObjectSize(assets[0]));
        expect(ret[1].mongoSize).to.equal(mongoObjectSize(assets[1]));
        expect(ret[2].mongoSize).to.equal(mongoObjectSize(assets[2]));
        expect(ret[3].mongoSize).to.equal(mongoObjectSize(events[0]));
        expect(ret[4].mongoSize).to.equal(mongoObjectSize(events[1]));
        expect(ret[5].mongoSize).to.equal(mongoObjectSize(events[2]));
      });
    });

    describe('orderEntityIds', () => {
      let unsorted;
      let ret;

      before(() => {
        unsorted = storage.assetsAndEventsToEntityIds(assets, events);
        ret = storage.orderEntityIds(unsorted);
      });

      it(`doesn't change the number of entities`, () => {
        expect(ret).to.have.length(assets.length + events.length);
      });

      it(`orders by timestamp, then by type, and then by id`, () => {
        expect(ret[0]).to.deep.equal(unsorted[0]);
        expect(ret[1]).to.deep.equal(unsorted[4]);
        expect(ret[2]).to.deep.equal(unsorted[5]);
        expect(ret[3]).to.deep.equal(unsorted[1]);
        expect(ret[4]).to.deep.equal(unsorted[2]);
        expect(ret[5]).to.deep.equal(unsorted[3]);
      });
    });
  });

  describe('Bundle process (successful)', () => {
    let scenario;

    const bundleStubId = '123';
    const bundleId = 'xyz';
    const bundleTxHash = '0x123';
    const bundleItemsCountLimit = 3;
    let alreadyBundledAssets;
    let alreadyBundledEvents;
    let nonBundledAssets;
    let nonBundledEvents;
    let clock;

    let ret;

    beforeEach(async () => {
      scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
      await scenario.addAdminAccount(adminAccountWithSecret);

      alreadyBundledAssets = [
        await scenario.addAsset(0, {timestamp: 20}),
        await scenario.addAsset(0, {timestamp: 21})
      ].map((asset) => put(asset, {'metadata.bundleId': 1, 'metadata.bundleTransactionHash': '0x1', 'metadata.bundleUploadTimestamp': 5}));

      alreadyBundledEvents = [
        await scenario.addEvent(0, 0, {timestamp: 25}),
        await scenario.addEvent(0, 1, {timestamp: 35})
      ].map((event) => put(event, {'metadata.bundleId': 1, 'metadata.bundleTransactionHash': '0x1', 'metadata.bundleUploadTimestamp': 5}));

      nonBundledAssets = [
        await scenario.addAsset(0, {timestamp: 0}),
        await scenario.addAsset(0, {timestamp: 1})
      ].map((asset) => put(asset, 'metadata.bundleId', null));

      nonBundledEvents = [
        await scenario.addEvent(0, 2, {timestamp: 2}),
        await scenario.addEvent(0, 3, {timestamp: 1}),
        await scenario.addEvent(0, 3, {timestamp: 6})
      ].map((event) => put(event, 'metadata.bundleId', null));

      await Promise.all([...alreadyBundledAssets, ...nonBundledAssets].map((asset) => storage.storeAsset(asset)));
      await Promise.all([...alreadyBundledEvents, ...nonBundledEvents].map((event) => storage.storeEvent(event)));

      clock = sinon.useFakeTimers(5000);

      ret = await expect(storage.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit)).to.be.fulfilled;
      await expect(storage.markEntitiesAsBundled(bundleStubId, bundleId)).to.be.fulfilled;
      await expect(storage.storeBundleProofMetadata(bundleId, 10, bundleTxHash)).to.be.fulfilled;
    });

    afterEach(async () => {
      await cleanDatabase(db);
      clock.restore();
    });

    it('considers only assets and events without a bundle', () => {
      expect(ret.assets).to.have.deep.members(nonBundledAssets);
      expect(ret.events).to.deep.equal([nonBundledEvents[1]]);
    });

    it('assets and events that are not included in the bundle should be left untouched', async () => {
      for (const asset of alreadyBundledAssets) {
        const storedAsset = await storage.getAsset(asset.assetId);
        expect(storedAsset).to.deep.equal(asset);
      }

      for (const event of alreadyBundledEvents) {
        const storedEvent = await storage.getEvent(event.eventId);
        expect(storedEvent).to.deep.equal(event);
      }

      const [outOfQuotaEvent] = nonBundledEvents;
      expect(await storage.getEvent(outOfQuotaEvent.eventId)).to.deep.equal(outOfQuotaEvent);
    });
    it('assets and event included in the bundle should have the metadata.bundleId set after the call to markEntitiesAsBundled', async () => {
      for (const asset of nonBundledAssets) {
        const storedAsset = await storage.getAsset(asset.assetId);
        expect(storedAsset.metadata.bundleId).to.equal(bundleId);
        expect(storedAsset.repository).to.be.undefined;
      }

      for (const event of nonBundledEvents) {
        const storedEvent = await storage.getEvent(event.eventId);
        if (event.content.idData.timestamp === 1) {
          expect(storedEvent.metadata.bundleId).to.equal(bundleId);
        } else {
          expect(storedEvent.metadata.bundleId).to.be.null;
        }
        expect(storedEvent.repository).to.be.undefined;
      }
    });

    it('assets and event included in the bundle should have the metadata.bundleTransactionHash and metadata.bundleUploadTimestamp set after the call to storeBundleProofBlock', async () => {
      for (const asset of nonBundledAssets) {
        const storedAsset = await storage.getAsset(asset.assetId);
        expect(storedAsset.metadata.bundleTransactionHash).to.equal(bundleTxHash);
        expect(storedAsset.metadata.bundleUploadTimestamp).to.be.equal(5);
      }

      for (const event of nonBundledEvents) {
        const storedEvent = await storage.getEvent(event.eventId);
        if (event.content.idData.timestamp === 1) {
          expect(storedEvent.metadata.bundleTransactionHash).to.equal(bundleTxHash);
          expect(storedEvent.metadata.bundleUploadTimestamp).to.be.equal(5);
        } else {
          expect(storedEvent.metadata.bundleTransactionHash).to.be.undefined;
          expect(storedEvent.metadata.bundleUploadTimestamp).to.be.undefined;
        }
      }
    });

    it('second call to fetchEntitiesForBundling should include latest events and the leftovers from the previous bundling', async () => {
      const ret2 = await expect(storage.fetchEntitiesForBundling('otherId', bundleItemsCountLimit)).to.be.fulfilled;
      expect(ret2.assets).to.be.empty;
      expect(ret2.events).to.have.deep.members([nonBundledEvents[0], nonBundledEvents[2]]);
    });

    it('should take the size limit into consideration', async () => {
      const mongoSizeOfFirstEvent = mongoObjectSize(nonBundledEvents[0]);
      const ret2 = await expect(storage.fetchEntitiesForBundling('otherId', bundleItemsCountLimit, mongoSizeOfFirstEvent + 1)).to.be.fulfilled;
      expect(ret2.assets).to.be.empty;
      expect(ret2.events).to.have.deep.members([nonBundledEvents[0]]);
    });
  });

  describe('Bundle process (aborted)', () => {
    let scenario;

    const bundleStubId = '123';
    const bundleItemsCountLimit = 3;
    let alreadyBundledAssets;
    let alreadyBundledEvents;
    let nonBundledAssets;
    let nonBundledEvents;
    let clock;

    let ret;

    before(async () => {
      scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
      await scenario.addAdminAccount(adminAccountWithSecret);

      alreadyBundledAssets = [
        await scenario.addAsset(0),
        await scenario.addAsset(0)
      ].map((asset) => put(asset, {'metadata.bundleId': 1, 'metadata.bundleTransactionHash': '0x1', 'metadata.bundleUploadTimestamp': 5}));

      alreadyBundledEvents = [
        await scenario.addEvent(0, 0),
        await scenario.addEvent(0, 1)
      ].map((event) => put(event, {'metadata.bundleId': 1, 'metadata.bundleTransactionHash': '0x1', 'metadata.bundleUploadTimestamp': 5}));

      nonBundledAssets = [
        await scenario.addAsset(0, {timestamp: 0}),
        await scenario.addAsset(0, {timestamp: 1})
      ].map((asset) => put(asset, 'metadata.bundleId', null));

      nonBundledEvents = [
        await scenario.addEvent(0, 2, {timestamp: 2}),
        await scenario.addEvent(0, 3, {timestamp: 1})
      ].map((event) => put(event, 'metadata.bundleId', null));

      await Promise.all([...alreadyBundledAssets, ...nonBundledAssets].map((asset) => storage.storeAsset(asset)));
      await Promise.all([...alreadyBundledEvents, ...nonBundledEvents].map((event) => storage.storeEvent(event)));

      clock = sinon.useFakeTimers(5000);

      ret = await expect(storage.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit)).to.be.fulfilled;
      await expect(storage.discardBundling(bundleStubId)).to.be.fulfilled;
    });

    after(async () => {
      await cleanDatabase(db);
      clock.restore();
    });

    it('should return to state from before bundling initialisation', async () => {
      expect(await storage.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit)).to.be.deep.equal(ret);
    });
  });

  describe('Bundle cleanup process', () => {
    describe('Set bundle expiration date', () => {
      const bundleId = 'bundle';
      const expirationDate = 10;

      beforeEach(async () => {
        await storage.storeBundle(put(createBundle(), 'bundleId', bundleId));
      });

      afterEach(async () => {
        await cleanDatabase(db);
      });

      it('storeBundleShelteringExpirationDate sets holdUntil field in repository dict', async () => {
        await storage.storeBundleShelteringExpirationDate(bundleId, expirationDate);
        const bundle = await storage.db.collection('bundles').findOne({bundleId});
        expect(bundle.repository.holdUntil).to.equal(expirationDate);
      });
    });

    describe('Finding bundles waiting for upload', () => {
      beforeEach(async () => {
        await storage.storeBundle({...createBundle(), bundleId: 'bundle1'});
        await storage.storeBundle({...createBundle(), bundleId: 'bundle2'});
        await storage.storeBundle({...createBundle(), bundleId: 'bundle3'});
        await storage.storeBundleProofMetadata('bundle2', '0', '0');
      });

      afterEach(async () => {
        await cleanDatabase(db);
      });

      it('returns bundles without a upload proof', async () => {
        const notRegisteredBundles = await storage.findBundlesWaitingForUpload();
        expect(notRegisteredBundles).to.have.length(2);
        expect(notRegisteredBundles[0].bundleId).to.equal('bundle1');
        expect(notRegisteredBundles[1].bundleId).to.equal('bundle3');
      });
    });

    describe('Get expired bundles ', () => {
      const now = 10;
      let clock;
      let expiredBundles;

      before(async () => {
        clock = sinon.useFakeTimers(now);

        for (let ind = 0; ind < 10; ind++) {
          await storage.storeBundle(put({...createBundle(), repository: {holdUntil: getTimestamp() + ind - 5}}, 'bundleId', `bundle${ind}`));
        }
        await storage.storeBundle(put({...createBundle(), repository: {holdUntil: null}}, 'bundleId', `noHoldUntil`));
        await storage.storeBundle(put({...createBundle()}, 'bundleId', `noMetadata`));
        expiredBundles = await storage.getExpiredBundleIds();
      });

      it('getExpiredBundleIds returns all bundles with holdUntil < now', async () => {
        expect(expiredBundles).to.include.members(['bundle0', 'bundle1', 'bundle2', 'bundle3', 'bundle4']);
      });

      it('getExpiredBundleIds returns bundles with no holdUntil set', async () => {
        expect(expiredBundles).to.include.members(['noHoldUntil', 'noMetadata']);
      });


      after(async () => {
        await cleanDatabase(db);
        clock.restore();
      });
    });

    describe('Deleting bundles', () => {
      const bundleIds = ['bundle1', 'bundle2', 'bundle3'];

      beforeEach(async () => {
        await storage.storeBundle(put(createBundle(), 'bundleId', bundleIds[0]));
        await storage.storeBundle(put(createBundle(), 'bundleId', bundleIds[1]));
        await storage.storeBundle(put(createBundle(), 'bundleId', bundleIds[2]));
      });

      afterEach(async () => {
        await cleanDatabase(db);
      });

      it('deletes all bundles with given ids from db', async () => {
        await storage.deleteBundles(['bundle1', 'bundle3']);
        expect(await storage.getBundle('bundle1')).to.be.null;
        expect(await storage.getBundle('bundle3')).to.be.null;
      });
    });
  });
});
