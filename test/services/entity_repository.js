/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import {pick, put} from '../../src/utils/dict_utils';
import {createAsset, createBundle, createEvent} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';
import config from '../../config/config';

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


  describe('Bundles', () => {
    const txHash = '0xc9087b7510e98183f705fe99ddb6964f3b845878d8a801cf6b110975599b6009';
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
      const exampleBundleWithMetadata = put(exampleBundle, {
        'metadata.proofBlock': 10,
        'metadata.bundleTransactionHash': txHash,
        'metadata.bundleUploadTimestamp': 5
      });
      await storage.storeBundle(exampleBundle);
      await storage.storeBundleProofMetadata(exampleBundleId, 10, txHash);
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
    const bundleTxHash = '0x123';
    const bundleSizeLimit = 3;
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

      ret = await expect(storage.beginBundle(bundleStubId)).to.be.fulfilled;
      await expect(storage.endBundle(bundleStubId, bundleId, bundleSizeLimit)).to.be.fulfilled;
      await expect(storage.storeBundleProofMetadata(bundleId, 10, bundleTxHash)).to.be.fulfilled;
    });

    after(async () => {
      await cleanDatabase(db);
      clock.restore();
    });

    it('returns only assets and events without a bundle', () => {
      expect(ret.assets).to.deep.include.members(nonBundledAssets);
      expect(ret.assets).to.have.lengthOf(nonBundledAssets.length);
      expect(ret.events).to.deep.include.members(nonBundledEvents);
      expect(ret.events).to.have.lengthOf(nonBundledEvents.length);
    });

    it('both assets and earliest event included in the bundle should have the metadata.bundleId set after the call to endBundle', async () => {
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

    it('both assets and earliest event included in the bundle should have the metadata.bundleTransactionHash and metadata.bundleUploadTimestamp set after the call to storeBundleProofBlock', async () => {
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

    it('second call to beginBundle should include latest events and the leftovers from the previous bundling', async () => {
      const ret2 = await expect(storage.beginBundle('otherId')).to.be.fulfilled;
      expect(ret2.assets).to.be.empty;
      expect(ret2.events).to.deep.equal([nonBundledEvents[0]]);
    });

    it('orderedEntityIds sorts correctly (by timestamp, then by type)', () => {
      const assetStubs = [
        {assetId: 'asset1', content: {idData: {timestamp: 4}}},
        {assetId: 'asset2', content: {idData: {timestamp: 1}}}];
      const eventStubs = [
        {eventId: 'event1', content: {idData: {timestamp: 4}}},
        {eventId: 'event2', content: {idData: {timestamp: 1}}},
        {eventId: 'event3', content: {idData: {timestamp: 10}}}];
      const entities = storage.orderedEntityIds(assetStubs, eventStubs);
      expect(entities.map((ent) => ent.id))
        .to.deep.equal(['asset2', 'event2', 'asset1', 'event1', 'event3']);
    });
  });
});
