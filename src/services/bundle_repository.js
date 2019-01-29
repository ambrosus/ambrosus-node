/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {uploadJSONToGridFSBucket, downloadJSONFromGridFSBucket, isFileInGridFSBucket} from '../utils/db_utils';
import {GridFSBucket} from 'mongodb';

const BUNDLE_VERSION = 2;

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
      await this.db.collection('bundle_metadata').insertOne({bundleId, storagePeriods, version: BUNDLE_VERSION});
    }
  }

  async openBundleWriteStream(bundleId, storagePeriods) {
    const uploadStream = this.bundlesBucket.openUploadStream(
      bundleId,
      {
        contentType: 'application/json'
      }
    );
    uploadStream.on('finish', async () => {
      if (await this.db.collection('bundle_metadata').findOne({bundleId}) === null) {
        await this.db.collection('bundle_metadata').insertOne({bundleId, storagePeriods});
      }
    });
    return uploadStream;
  }

  async storeBundleProofMetadata(bundleId, proofBlock, timestamp, txHash, version) {
    await this.db.collection('bundle_metadata').updateOne({bundleId}, {
      $set: {
        bundleTransactionHash: txHash,
        bundleProofBlock: proofBlock,
        bundleUploadTimestamp: timestamp,
        version
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

  async removeBundle(bundleId) {
    await this.db.collection('bundle_metadata').deleteMany({bundleId});
    const cursor = await this.bundlesBucket.find({filename: bundleId});
    while (await cursor.hasNext()) {
      const {_id: id} = await cursor.next();
      await this.bundlesBucket.delete(id);
    }
  }
}
