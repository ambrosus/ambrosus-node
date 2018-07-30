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

  async beginBundle(bundleStubId) {
    const notBundledQuery = {
      'metadata.bundleId': null,
      'repository.bundleStubId': null
    };

    const setBundleStubIdUpdate = {
      $set: {
        'repository.bundleStubId': bundleStubId
      }
    };

    await this.db.collection('assets').update(notBundledQuery, setBundleStubIdUpdate, {multi: true});
    await this.db.collection('events').update(notBundledQuery, setBundleStubIdUpdate, {multi: true});

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
    return {
      assets,
      events
    };
  }

  orderedEntityIds(assets, events) {
    return [
      ...assets.map((asset) => ({type: 'asset', id: asset.assetId, timestamp: asset.content.idData.timestamp})),
      ...events.map((event) => ({type: 'event', id: event.eventId, timestamp: event.content.idData.timestamp}))
    ].sort((first, second) =>
      first.timestamp - second.timestamp ||
      first.type.localeCompare(second.type) || // asset < event
      first.id.localeCompare(second.id));
  }

  async updateEntities(entities, updateQuery) {
    const assetIds = entities.filter((ent) => ent.type === 'asset').map((asset) => asset.id);
    const eventIds = entities.filter((ent) => ent.type === 'event').map((event) => event.id);
    await this.db.collection('assets').update({
      assetId: {
        $in: assetIds
      }
    }, updateQuery, {multi: true});
    await this.db.collection('events').update({
      eventId: {
        $in: eventIds
      }
    }, updateQuery, {multi: true});
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

  async endBundle(bundleStubId, bundleId, bundleSizeLimit) {
    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const assets = await this.db.collection('assets').find(thisBundleStubQuery)
      .toArray();
    const events = await this.db.collection('events').find(thisBundleStubQuery)
      .toArray();
    const entities = this.orderedEntityIds(assets, events);
    await this.setEntitiesBundles(entities.slice(0, bundleSizeLimit), bundleId);
    await this.unsetEntitiesBundlesStubs(entities.slice(bundleSizeLimit), bundleId);
  }

  async storeBundle(bundle) {
    await this.db.collection('bundles').insertOne({...bundle});
  }

  async storeBundleProofMetadata(bundleId, proofBlock, txHash) {
    const currentTimestamp = getTimestamp();

    await this.db.collection('bundles').update({bundleId}, {
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

    await this.db.collection('assets').update(thisBundleQuery, update, {multi: true});
    await this.db.collection('events').update(thisBundleQuery, update, {multi: true});
  }

  async getBundle(bundleId) {
    return await this.db.collection('bundles').findOne({bundleId}, {fields: this.blacklistedFields});
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
}
