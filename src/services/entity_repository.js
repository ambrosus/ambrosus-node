/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {pick} from '../utils/dict_utils';
import {getTimestamp} from '../utils/time_utils';
import {mongoObjectSize} from '../utils/db_utils';

const MONGO_SIZE_IN_BYTES_LIMIT = 15000000; // 15 Mb

export default class EntityRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  async storeAsset(asset) {
    await this.db.collection('assets').insertOne({...asset});
  }

  async getAsset(assetId) {
    return await this.db.collection('assets').findOne({assetId}, {fields: this.blacklistedFields});
  }

  async storeEvent(event) {
    await this.db.collection('events').insertOne({...event});
  }

  hideEventDataIfNecessary(event, accessLevel) {
    if (!event) {
      return null;
    }
    return event.content.idData.accessLevel <= accessLevel ? event : pick(event, 'content.data');
  }

  async getEvent(eventId, accessLevel = 0) {
    const event = await this.db.collection('events').findOne({eventId}, {fields: this.blacklistedFields});
    return this.hideEventDataIfNecessary(event, accessLevel);
  }

  assetsAndEventsToEntityIds(assets, events) {
    return [
      ...assets.map((asset) => ({type: 'asset', id: asset.assetId, timestamp: asset.content.idData.timestamp, mongoSize: mongoObjectSize(asset)})),
      ...events.map((event) => ({type: 'event', id: event.eventId, timestamp: event.content.idData.timestamp, mongoSize: mongoObjectSize(event)}))
    ];
  }

  orderEntityIds(entities) {
    return [...entities].sort((first, second) =>
      first.timestamp - second.timestamp ||
      first.type.localeCompare(second.type) || // asset < event
      first.id.localeCompare(second.id));
  }

  discardEntitiesForBundling(orderedEntities, bundleItemsCountLimit, bundleSizeInBytesLimit) {
    let lastIndex = 0;
    let sizeAccum = 0;
    while (lastIndex < orderedEntities.length && lastIndex < bundleItemsCountLimit) {
      sizeAccum += orderedEntities[lastIndex].mongoSize;
      if (sizeAccum > bundleSizeInBytesLimit) {
        break;
      }
      lastIndex++;
    }
    return orderedEntities.slice(lastIndex);
  }

  async updateEntities(entities, updateQuery) {
    const assetIds = entities.filter((ent) => ent.type === 'asset').map((asset) => asset.id);
    const eventIds = entities.filter((ent) => ent.type === 'event').map((event) => event.id);
    await this.db.collection('assets').updateMany({
      assetId: {
        $in: assetIds
      }
    }, updateQuery);
    await this.db.collection('events').updateMany({
      eventId: {
        $in: eventIds
      }
    }, updateQuery);
  }

  async setEntitiesBundles(entities, bundleId) {
    const update = {
      $set: {
        'metadata.bundleId': bundleId
      },
      $unset: {
        'repository.bundleStubId': ''
      }
    };
    await this.updateEntities(entities, update);
  }

  async unsetEntitiesBundlesStubs(entities) {
    const update = {
      $unset: {
        'repository.bundleStubId': ''
      }
    };
    await this.updateEntities(entities, update);
  }

  async fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit, bundleSizeInBytesLimit = MONGO_SIZE_IN_BYTES_LIMIT) {
    const notBundledQuery = {
      'metadata.bundleId': null,
      'repository.bundleStubId': null
    };

    const setBundleStubIdUpdate = {
      $set: {
        'repository.bundleStubId': bundleStubId
      }
    };

    await this.db.collection('assets').updateMany(notBundledQuery, setBundleStubIdUpdate);
    await this.db.collection('events').updateMany(notBundledQuery, setBundleStubIdUpdate);

    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const assets = await this.db
      .collection('assets')
      .find(thisBundleStubQuery, {fields: this.blacklistedFields})
      .toArray();
    const events = await this.db
      .collection('events')
      .find(thisBundleStubQuery, {fields: this.blacklistedFields})
      .toArray();

    const entities = this.assetsAndEventsToEntityIds(assets, events);
    const orderedEntities = this.orderEntityIds(entities);

    const discardedEntities = this.discardEntitiesForBundling(orderedEntities, bundleItemsCountLimit, bundleSizeInBytesLimit);
    await this.unsetEntitiesBundlesStubs(discardedEntities);

    return {
      assets: assets.filter((asset) => !discardedEntities.some(({id}) => asset.assetId === id)),
      events: events.filter((event) => !discardedEntities.some(({id}) => event.eventId === id))
    };
  }

  async markEntitiesAsBundled(bundleStubId, bundleId) {
    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const assets = await this.db.collection('assets').find(thisBundleStubQuery)
      .toArray();
    const events = await this.db.collection('events').find(thisBundleStubQuery)
      .toArray();
    const entities = this.assetsAndEventsToEntityIds(assets, events);
    await this.setEntitiesBundles(entities, bundleId);
  }

  async discardBundling(bundleStubId) {
    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const assets = await this.db.collection('assets').find(thisBundleStubQuery)
      .toArray();
    const events = await this.db.collection('events').find(thisBundleStubQuery)
      .toArray();
    const entities = this.assetsAndEventsToEntityIds(assets, events);

    await this.unsetEntitiesBundlesStubs(entities);
  }

  async storeBundle(bundle, storagePeriods) {
    if (await this.db.collection('bundles').findOne({bundleId: bundle.bundleId}) === null) {
      await this.db.collection('bundles').insertOne({...bundle});
    }
    if (await this.db.collection('bundle_metadata').findOne({bundleId: bundle.bundleId}) === null) {
      await this.db.collection('bundle_metadata').insertOne({bundleId: bundle.bundleId, storagePeriods});
    }
  }

  async storeBundleProofMetadata(bundleId, proofBlock, txHash) {
    const currentTimestamp = getTimestamp();

    await this.db.collection('bundle_metadata').updateOne({bundleId}, {
      $set: {
        bundleTransactionHash: txHash,
        proofBlock,
        bundleUploadTimestamp: currentTimestamp
      }
    });

    const thisBundleQuery = {
      'metadata.bundleId': bundleId
    };

    const update = {
      $set: {
        'metadata.bundleTransactionHash': txHash,
        'metadata.bundleUploadTimestamp': currentTimestamp
      }
    };

    await this.db.collection('assets').updateMany(thisBundleQuery, update);
    await this.db.collection('events').updateMany(thisBundleQuery, update);
  }

  async storeBundleShelteringExpirationDate(bundleId, expirationDate) {
    await this.db.collection('bundles').updateOne({bundleId}, {
      $set: {
        'repository.holdUntil': expirationDate
      }
    });
  }

  async findBundlesWaitingForUpload() {
    return await this.db.collection('bundle_metadata')
      .find({proofBlock: {$exists: false}})
      .toArray();
  }

  async getExpiredBundleIds() {
    const now = getTimestamp();
    return this.db.collection('bundles').find({
      $or: [
        {'repository.holdUntil': {$not: {$type: 'int'}}},
        {'repository.holdUntil': {$lt: now}}
      ]
    }, {projection: {bundleId: 1}})
      .map(({bundleId}) => bundleId)
      .toArray();
  }

  async getBundle(bundleId) {
    return await this.db.collection('bundles').findOne({bundleId}, {fields: this.blacklistedFields});
  }

  async getBundleMetadata(bundleId) {
    return await this.db.collection('bundle_metadata').findOne({bundleId}, {fields: this.blacklistedFields});
  }

  async deleteBundles(bundleIds) {
    return this.db.collection('bundles').deleteMany({bundleId: {$in: bundleIds}});
  }
}
