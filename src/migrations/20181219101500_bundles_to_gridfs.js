/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {GridFSBucket} from 'mongodb';
import {isFileInGridFSBucket, uploadJSONToGridFSBucket} from '../utils/db_utils';

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  const bundlesBucket = new GridFSBucket(db, {bucketName: 'bundles'});

  const bundleMetadataCursor = await db.collection('bundle_metadata').find({});

  const totalCount = await bundleMetadataCursor.count();
  let movedCount = 0;
  let skippedCount = 0;
  let inx = 0;

  logger.info(`Will attempt to move ${totalCount} bundles to gridfs`);

  while (await bundleMetadataCursor.hasNext()) {
    const metadata = await bundleMetadataCursor.next();
    const {bundleId} = metadata;

    const inGridFS = await isFileInGridFSBucket(bundleId, bundlesBucket);

    const bundleProjectionSettings = {
      _id: 0,
      repository: 0,
      metadata: 0
    };

    const bundle = await db.collection('bundles').findOne({bundleId}, {projection: bundleProjectionSettings});
    if (bundle === null) {
      if (inGridFS) {
        logger.info(`[${inx}/${totalCount}]: ${bundleId} is missing in the collection but is present in GridFS bucket. Skipping`);
      } else {
        logger.info(`[${inx}/${totalCount}]: ${bundleId} is missing in both the collection and GridFS bucket. Skipping`);
      }
      ++skippedCount;
    } else {
      if (!inGridFS) {
        await uploadJSONToGridFSBucket(bundleId, bundle, bundlesBucket);
      }

      await db.collection('bundles').deleteOne({bundleId});
      if (!inGridFS) {
        logger.info(`[${inx}/${totalCount}]: ${bundleId} was uploaded to GridFS and removed from the collection`);
      } else {
        logger.info(`[${inx}/${totalCount}]: ${bundleId} was already in GridFS. It was removed from the collection`);
      }
      ++movedCount;
    }
    ++inx;
  }

  logger.info(`Moved ${movedCount} bundles to GridFS. Skipped ${skippedCount} bundles.`);

  await db.collection('bundles').drop();
  logger.info(`Dropped bundles collection`);
};
