/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {uploadJSONToGridFSBucket, downloadJSONFromGridFSBucket, isFileInGridFSBucket} from '../utils/db_utils';
import {GridFSBucket} from 'mongodb';

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
    if (!await isFileInGridFSBucket(bundle.bundleId, this.bundlesBucket)) {
      await uploadJSONToGridFSBucket(bundle.bundleId, bundle, this.bundlesBucket);
    }
    if (await this.db.collection('bundle_metadata').findOne({bundleId: bundle.bundleId}) === null) {
      await this.db.collection('bundle_metadata').insertOne({bundleId: bundle.bundleId, storagePeriods});
    }
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

  async storeBundleShelteringExpirationDate(bundleId, expirationDate) {
    await this.db.collection('bundle_metadata').updateOne({bundleId}, {
      $set: {
        holdUntil: expirationDate
      }
    });
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

  async getBundleMetadata(bundleId) {
    return await this.db.collection('bundle_metadata').findOne({bundleId}, {projection: this.blacklistedFields});
  }
}
