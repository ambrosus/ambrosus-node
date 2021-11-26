/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {pick} from '../utils/dict_utils';

export default class EntityRepository {
  /**
   * @param {MongoClient.prototype.db} db - the mongo database
   */
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  /**
   * Saves assets to db. Rewrites if asset with this id already exists in the db
   * @param {Object} asset - the asset
   * @returns {Promise<void>}
   */
  async storeAsset(asset) {
    if (await this.db.collection('assets').findOne({assetId: asset.assetId}) === null) {
      await this.db.collection('assets').insertOne({...asset});
    }
  }

  /**
   * Retrieves asset from db
   * @param {number} assetId - id of the asset
   * @returns {Promise<*>}
   */
  async getAsset(assetId) {
    return await this.db.collection('assets').findOne({assetId}, {projection: this.blacklistedFields});
  }

  /**
   * Saves event to the db. Rewrites event if this id already exists in the db
   * @param {Object} event
   * @returns {Promise<void>}
   */
  async storeEvent(event) {
    if (await this.db.collection('events').findOne({eventId: event.eventId}) === null) {
      await this.db.collection('events').insertOne({...event});
    }
  }

  /**
   * @param {Object} event
   * @param {number?} accessLevel - //TODO: Find out about access levels. Is it a number?
   * @returns {null|unknown}
   */
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

  async fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit) {
    const notBundledQuery = {
      'repository.bundleStubId': null,
      'metadata.bundleId': null
    };

    const updateBundleStubId = {
      $set: {
        'repository.bundleStubId': bundleStubId
      }
    };

    const assetsCursor = await this.db.collection('assets').find(
      notBundledQuery,
      {
        projection: this.blacklistedFields,
        sort: {'content.idData.timestamp': 1, assetId: 1}
      }
    );
    const eventsCursor = await this.db.collection('events').find(
      notBundledQuery,
      {
        projection: this.blacklistedFields,
        sort: {'content.idData.timestamp': 1, eventId: 1}
      }
    );
    const selectedAssets = [];
    const selectedEvents = [];

    let nextAsset = await assetsCursor.next();
    let nextEvent = await eventsCursor.next();

    const candidatesLeft = () => nextAsset !== null || nextEvent !== null;
    const itemCountLimitReached = () => selectedAssets.length + selectedEvents.length >= bundleItemsCountLimit;

    while (candidatesLeft() && !itemCountLimitReached()) {
      const next = this.selectEntityForBundling(nextAsset, nextEvent);

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

  async storeBundleProofMetadata(bundleId, proofBlock, timestamp, txHash) {
    const thisBundleQuery = {
      'metadata.bundleId': bundleId
    };

    const update = {
      $set: {
        'metadata.bundleTransactionHash': txHash,
        'metadata.bundleProofBlock': proofBlock,
        'metadata.bundleUploadTimestamp': timestamp
      }
    };

    await this.db.collection('assets').updateMany(thisBundleQuery, update);
    await this.db.collection('events').updateMany(thisBundleQuery, update);
  }
}
