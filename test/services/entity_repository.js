/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import {pick, put} from '../../src/utils/dict_utils';
import {createAsset, createEvent} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';
import config from '../../src/config/config';

import EntityRepository from '../../src/services/entity_repository';

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

  describe('selectEntityForBundling', () => {
    const asset = {
      content: {
        idData: {
          timestamp: 123
        }
      }
    };

    const event = {
      content: {
        idData: {
          timestamp: 123
        }
      }
    };

    it('returns event, if asset is null', () => {
      expect(storage.selectEntityForBundling(null, event)).to.equal(event);
    });

    it('return asset, if event is null', () => {
      expect(storage.selectEntityForBundling(asset, null)).to.equal(asset);
    });

    it('return the entity with the earlier timestamp', () => {
      const smallerAsset = put(asset, 'content.idData.timestamp', 2);
      const smallerEvent = put(event, 'content.idData.timestamp', 15);
      expect(storage.selectEntityForBundling(smallerAsset, event)).to.equal(smallerAsset);
      expect(storage.selectEntityForBundling(asset, smallerEvent)).to.equal(smallerEvent);
    });

    it('prefer assets over events when timestamp is the same', () => {
      expect(storage.selectEntityForBundling(asset, event)).to.equal(asset);
    });
  });

  describe('Bundle creation', () => {
    let scenario;

    let alreadyBundledAssets;
    let alreadyBundledEvents;
    let nonBundledAssets;
    let nonBundledEvents;

    const bundleStubId = '123';
    const bundleId = 'xyz';
    const bundleItemsCountLimit = 3;

    before(async () => {
      scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
    });

    beforeEach(async () => {
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
        await scenario.addEvent(0, 2, {timestamp: 1}),
        await scenario.addEvent(0, 3, {timestamp: 6})
      ].map((event) => put(event, 'metadata.bundleId', null));

      expect(nonBundledEvents[1].eventId.localeCompare(nonBundledEvents[2].eventId)).to.equal(1);

      await Promise.all([...alreadyBundledAssets, ...nonBundledAssets].map((asset) => storage.storeAsset(asset)));
      await Promise.all([...alreadyBundledEvents, ...nonBundledEvents].map((event) => storage.storeEvent(event)));
    });

    afterEach(async () => {
      await cleanDatabase(db);
    });

    describe('fetchEntitiesForBundling', () => {
      const bundleTxHash = '0x123';

      let ret;

      beforeEach(async () => {
        ret = await expect(storage.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit)).to.be.fulfilled;
        await expect(storage.markEntitiesAsBundled(bundleStubId, bundleId)).to.be.fulfilled;
        await expect(storage.storeBundleProofMetadata(bundleId, 10, 5000, bundleTxHash)).to.be.fulfilled;
      });

      it('considers only assets and events without a bundle', () => {
        expect(ret.assets).to.have.deep.members(nonBundledAssets);
        expect(ret.events).to.deep.equal([nonBundledEvents[2]]);
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
          if (event === nonBundledEvents[2]) {
            expect(storedEvent.metadata.bundleId).to.equal(bundleId);
          } else {
            expect(storedEvent.metadata.bundleId).to.be.null;
          }
          expect(storedEvent.repository).to.be.undefined;
        }
      });

      it('assets and event included in the bundle should have the metadata.bundleTransactionHash and metadata.bundleUploadTimestamp set after the call to storeBundleProofMetadata', async () => {
        for (const asset of nonBundledAssets) {
          const storedAsset = await storage.getAsset(asset.assetId);
          expect(storedAsset.metadata.bundleTransactionHash).to.equal(bundleTxHash);
          expect(storedAsset.metadata.bundleUploadTimestamp).to.be.equal(5000);
        }

        for (const event of nonBundledEvents) {
          const storedEvent = await storage.getEvent(event.eventId);
          if (event === nonBundledEvents[2]) {
            expect(storedEvent.metadata.bundleTransactionHash).to.equal(bundleTxHash);
            expect(storedEvent.metadata.bundleUploadTimestamp).to.be.equal(5000);
          } else {
            expect(storedEvent.metadata.bundleTransactionHash).to.be.undefined;
            expect(storedEvent.metadata.bundleUploadTimestamp).to.be.undefined;
          }
        }
      });

      it('second call to fetchEntitiesForBundling should include latest events and the leftovers from the previous bundling', async () => {
        const ret2 = await expect(storage.fetchEntitiesForBundling('otherId', bundleItemsCountLimit)).to.be.fulfilled;
        expect(ret2.assets).to.be.empty;
        expect(ret2.events).to.have.deep.members([nonBundledEvents[1], nonBundledEvents[0], nonBundledEvents[3]]);
      });
    });

    describe('discardBundling', () => {
      let ret;

      beforeEach(async () => {
        ret = await expect(storage.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit)).to.be.fulfilled;
        await expect(storage.discardBundling(bundleStubId)).to.be.fulfilled;
      });

      it('should return to state from before bundling initialisation', async () => {
        expect(await storage.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit)).to.be.deep.equal(ret);
      });
    });
  });
});
