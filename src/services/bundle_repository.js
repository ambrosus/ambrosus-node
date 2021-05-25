/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {downloadJSONFromGridFSBucket, isFileInGridFSBucket, uploadJSONToGridFSBucket} from '../utils/db_utils';
import {GridFSBucket} from 'mongodb';
import BundleStatuses from '../utils/bundle_statuses';
import {pick} from '../utils/dict_utils';
import {pipe} from '../utils/higher_order_functions';

export default class BundleRepository {
  constructor(db) {
    this.db = db;
    this.bundlesBucket = new GridFSBucket(this.db, {bucketName: 'bundles'});
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  async storeBundle(bundle, storagePeriods) {
    const {bundleId} = bundle;
    if (!await isFileInGridFSBucket(bundleId, this.bundlesBucket)) {
      await uploadJSONToGridFSBucket(bundleId, bundle, this.bundlesBucket);
    }
    if (await this.db.collection('bundle_metadata').findOne({bundleId}) === null) {
      await this.db.collection('bundle_metadata').insertOne({bundleId, storagePeriods});
    }
  }

  async openBundleWriteStream(bundleId) {
    const uploadStream = this.bundlesBucket.openUploadStream(
      bundleId,
      {
        contentType: 'application/json'
      }
    );
    return uploadStream;
  }

  async storeBundleProofMetadata(bundleId, proofBlock, timestamp, txHash) {
    await this.db.collection('bundle_metadata').updateOne({bundleId}, {
      $set: {
        bundleTransactionHash: txHash,
        bundleProofBlock: proofBlock,
        bundleUploadTimestamp: timestamp
      }
    });
  }

  async findBundlesWaitingForUpload() {
    return await this.db.collection('bundle_metadata')
      .find({bundleProofBlock: {$exists: false}})
      .toArray();
  }

  async getBundleStream(bundleId) {
    if (!await isFileInGridFSBucket(bundleId, this.bundlesBucket)) {
      return null;
    }
    return this.bundlesBucket.openDownloadStreamByName(bundleId);
  }

  async getBundle(bundleId) {
    if (!await isFileInGridFSBucket(bundleId, this.bundlesBucket)) {
      return null;
    }
    return await downloadJSONFromGridFSBucket(bundleId, this.bundlesBucket);
  }

  async isBundleStored(bundleId) {
    return ((await this.getBundle(bundleId)) !== null);
  }

  async createBundleMetadata(bundleId, storagePeriods, status = BundleStatuses.unknown, additionalFields = {}) {
    if (await this.db.collection('bundle_metadata').findOne({bundleId}) === null) {
      await this.db.collection('bundle_metadata').insertOne({
        bundleId, storagePeriods, repository: {status, ...additionalFields}
      });
    }
  }

  additionalMetadataFields(initialMetadata, complementaryMetadata) {
    const originalFields = Object.keys(initialMetadata);
    return pipe(...originalFields.map((fieldName) =>
      (dict) => pick(dict, fieldName)))(complementaryMetadata);
  }

  async updateBundleMetadata(bundleId, additionalMetadataFields) {
    if (!additionalMetadataFields || Object.values(additionalMetadataFields).length === 0) {
      return;
    }
    await this.db.collection('bundle_metadata').updateOne({bundleId}, {
      $set: additionalMetadataFields
    });
  }

  async getBundleMetadata(bundleId) {
    return await this.db.collection('bundle_metadata').findOne({bundleId}, {projection: this.blacklistedFields});
  }

  async setBundleRepository(bundleId, status, additionalFields = {}) {
    return this.db.collection('bundle_metadata').updateOne({bundleId}, {
      $set: {
        repository: {
          status,
          ...additionalFields
        }
      }
    });
  }

  async getBundleRepository(bundleId) {
    const metadata = await this.db.collection('bundle_metadata').findOne({bundleId}, {projection: {repository: 1}});
    if (!metadata) {
      return null;
    }
    return metadata.repository;
  }

  async isBundleSheltered(bundleId) {
    const repository = await this.getBundleRepository(bundleId);
    return repository ? repository.status === BundleStatuses.sheltered : false;
  }

  async getAssetsByBundleId (bundleId) {
    const assetIDs = [];
    for await (const asset of this.db.collection('assets').find({'metadata.bundleId': bundleId})) {
      assetIDs.push(asset.assetId);
    }
    return assetIDs;
  }

  async getEventsByBundleId (bundleId) {
    const eventIDs = [];
    for await (const event of this.db.collection('events').find({'metadata.bundleId': bundleId})) {
      eventIDs.push(event.eventId);
    }
    return eventIDs;
  }

  async removeAsset(assetId) {
    await this.db.collection('assets').removeOne({assetId});
  }

  async removeEvent(eventId) {
    await this.db.collection('events').removeOne({eventId});
  }

  async removeBundle(bundleId) {
    const cursor = await this.bundlesBucket.find({filename: bundleId});
    while (await cursor.hasNext()) {
      const {_id: id} = await cursor.next();
      await this.bundlesBucket.delete(id).then(async () => {
        for (const assetId of await this.getAssetsByBundleId(bundleId)) {
          await this.removeAsset(assetId);
        }
        for (const eventId of await this.getEventsByBundleId(bundleId)) {
          await this.removeEvent(eventId);
        }
      });
    }
    await this.setBundleRepository(bundleId, BundleStatuses.expendable);
  }

  async findOutdatedBundles() {
    await this.db.collection('bundle_metadata').updateMany({
      $or: [
        {repository: {$exists: false}},
        {'repository.holdUntil': {$lt: new Date()}}
      ]
    }, {$set: {repository: {status: BundleStatuses.cleanup}}});
  }

  async cleanupBundles() {
    const cursor = await this.db.collection('bundle_metadata').find({'repository.status': BundleStatuses.cleanup}, {projection: {bundleId: 1, _id: 0}});
    const removedBundles = [];

    while (await cursor.hasNext()) {
      const {bundleId} = await cursor.next();
      await this.removeBundle(bundleId);
      removedBundles.push(bundleId);
    }

    return removedBundles;
  }

  async getShelteredBundles(bundlesCount) {
    const cursor = await this.db.collection('bundle_metadata').find({'repository.status': BundleStatuses.sheltered}, {projection: {bundleId: 1, _id: 0}})
      .limit(bundlesCount);
    return await cursor.toArray();
  }

  async getShelteredBundlesCount() {
    return await this.db.collection('bundle_metadata').find({'repository.status': BundleStatuses.sheltered}, {projection: {bundleId: 1, _id: 0}})
      .count();
  }

  async getHermesBundles(bundlesCount) {
    const cursor = await this.db.collection('bundle_metadata').find({}, {projection: {_id: 0}})
      .limit(bundlesCount);
    return await cursor.toArray();
  }
}
