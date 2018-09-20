/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {pick} from '../utils/dict_utils';
import {getTimestamp} from '../utils/time_utils';

export default class EntityRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  async initializeIndexes() {
    // assets
    await this.db.collection('assets').ensureIndex({assetId : 1});
    await this.db.collection('assets').ensureIndex({'content.idData.timestamp' : 1});
    await this.db.collection('assets').ensureIndex({'content.idData.createdBy' : 1});

    // events
    await this.db.collection('events').ensureIndex({eventId : 1});
    await this.db.collection('events').ensureIndex({'content.idData.timestamp' : 1});
    await this.db.collection('events').ensureIndex({'content.idData.createdBy' : 1});
    await this.db.collection('events').ensureIndex({'content.idData.accessLevel' : 1});
    await this.db.collection('events').ensureIndex({'content.idData.assetId' : 1});
    await this.db.collection('events').ensureIndex({'content.data.type' : 1});
    await this.db.collection('events').ensureIndex({'content.data.geoJson' : '2dsphere'});

    // bundles
    await this.db.collection('bundles').ensureIndex({bundleId : 1});
    await this.db.collection('bundles').ensureIndex({'content.idData.timestamp' : 1});
    await this.db.collection('bundles').ensureIndex({'content.idData.createdBy' : 1});

    // for internal use by repository
    await this.db.collection('assets').ensureIndex({'repository.bundleStubId' : 1});
    await this.db.collection('events').ensureIndex({'repository.bundleStubId' : 1});
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
      ...assets.map((asset) => ({type: 'asset', id: asset.assetId, timestamp: asset.content.idData.timestamp})),
      ...events.map((event) => ({type: 'event', id: event.eventId, timestamp: event.content.idData.timestamp}))
    ];
  }

  orderEntityIds(entities) {
    return entities.sort((first, second) =>
      first.timestamp - second.timestamp ||
      first.type.localeCompare(second.type) || // asset < event
      first.id.localeCompare(second.id));
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

  async fetchEntitiesForBundling(bundleStubId, bundleSizeLimit) {
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

    let assets = await this.db
      .collection('assets')
      .find(thisBundleStubQuery, {fields: this.blacklistedFields})
      .toArray();
    let events = await this.db
      .collection('events')
      .find(thisBundleStubQuery, {fields: this.blacklistedFields})
      .toArray();


    const entities = this.assetsAndEventsToEntityIds(assets, events);
    const orderedEntities = this.orderEntityIds(entities);
    const discardedEntities = orderedEntities.slice(bundleSizeLimit);
    await this.unsetEntitiesBundlesStubs(discardedEntities);

    assets = assets.filter((asset) => !discardedEntities.some((id) => asset.assetId === id));
    events = events.filter((event) => !discardedEntities.some((id) => event.eventId === id));
    return {
      assets,
      events
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
    await this.db.collection('bundles').insertOne({...bundle, metadata: {storagePeriods}});
  }

  async storeBundleProofMetadata(bundleId, proofBlock, txHash) {
    const currentTimestamp = getTimestamp();

    await this.db.collection('bundles').updateOne({bundleId}, {
      $set: {
        'metadata.bundleTransactionHash': txHash,
        'metadata.proofBlock': proofBlock,
        'metadata.bundleUploadTimestamp': currentTimestamp
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

  async findNotRegisteredBundles() {
    return this.db.collection('bundles')
      .find({'metadata.proofBlock': {$exists: false}})
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

  async deleteBundles(bundleIds) {
    return this.db.collection('bundles').deleteMany({bundleId: {$in: bundleIds}});
  }
}
