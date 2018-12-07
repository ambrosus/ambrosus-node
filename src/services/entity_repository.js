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
    return await this.db.collection('assets').findOne({assetId}, {projection: this.blacklistedFields});
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
    const event = await this.db.collection('events').findOne({eventId}, {projection: this.blacklistedFields});
    return this.hideEventDataIfNecessary(event, accessLevel);
  }

  selectEntityForBundling(asset, event) {
    if (asset === null) {
      return event;
    }
    if (event === null) {
      return asset;
    }

    if (asset.content.idData.timestamp > event.content.idData.timestamp) {
      return event;
    }

    return asset;
  }

  async fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit, bundleSizeInBytesLimit = MONGO_SIZE_IN_BYTES_LIMIT) {
    const notBundledQuery = {
      'metadata.bundleId': null,
      'repository.bundleStubId': null
    };

    const updateBundleStubId = {
      $set: {
        'repository.bundleStubId': bundleStubId
      }
    };

    const assetsCursor = await this.db.collection('assets').find(notBundledQuery, {
      projection: this.blacklistedFields,
      sort: {'content.idData.timestamp': 1, assetId: 1}
    });
    const eventsCursor = await this.db.collection('events').find(notBundledQuery, {
      projection: this.blacklistedFields,
      sort: {'content.idData.timestamp': 1, eventId: 1}
    });

    const selectedAssets = [];
    const selectedEvents = [];
    let usedSize = 0;

    let nextAsset = await assetsCursor.next();
    let nextEvent = await eventsCursor.next();

    const candidatesLeft = () => nextAsset !== null || nextEvent !== null;
    const itemCountLimitReached = () => selectedAssets.length + selectedEvents.length >= bundleItemsCountLimit;

    while (candidatesLeft() && !itemCountLimitReached()) {
      const next = this.selectEntityForBundling(nextAsset, nextEvent);

      const size = mongoObjectSize(next);
      if (usedSize + size < bundleSizeInBytesLimit) {
        usedSize += size;
      } else {
        break;
      }

      if (next === nextAsset) {
        await this.db.collection('assets').updateOne({assetId: nextAsset.assetId}, updateBundleStubId);
        selectedAssets.push(nextAsset);
        nextAsset = await assetsCursor.next();
      } else {
        await this.db.collection('events').updateOne({eventId: nextEvent.eventId}, updateBundleStubId);
        selectedEvents.push(nextEvent);
        nextEvent = await eventsCursor.next();
      }
    }

    return {
      assets: selectedAssets,
      events: selectedEvents
    };
  }

  async markEntitiesAsBundled(bundleStubId, bundleId) {
    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const updateStatement = {
      $set: {
        'metadata.bundleId': bundleId
      },
      $unset: {
        'repository.bundleStubId': ''
      }
    };

    await this.db.collection('assets').updateMany(
      thisBundleStubQuery,
      updateStatement
    );
    await this.db.collection('events').updateMany(
      thisBundleStubQuery,
      updateStatement
    );
  }

  async discardBundling(bundleStubId) {
    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const updateStatement = {
      $unset: {
        'repository.bundleStubId': ''
      }
    };

    await this.db.collection('assets').updateMany(
      thisBundleStubQuery,
      updateStatement
    );
    await this.db.collection('events').updateMany(
      thisBundleStubQuery,
      updateStatement
    );
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
    return await this.db.collection('bundles').findOne({bundleId}, {projection: this.blacklistedFields});
  }

  async getBundleMetadata(bundleId) {
    return await this.db.collection('bundle_metadata').findOne({bundleId}, {projection: this.blacklistedFields});
  }

  async deleteBundles(bundleIds) {
    return this.db.collection('bundles').deleteMany({bundleId: {$in: bundleIds}});
  }
}
