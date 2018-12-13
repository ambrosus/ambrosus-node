/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const deduplicateBundles = async (db) => {
  const cursor = await db.collection('bundles').aggregate(
    [{
      $group: {
        _id: '$bundleId',
        dups: {$addToSet: '$_id'},
        count: {$sum: 1}
      }
    },
    {
      $match:
        {
          count: {$gt: 1}
        }
    }],
    {
      allowDiskUse: true,
      cursor: {}
    }
  );
  while (await cursor.hasNext()) {
    const document = await cursor.next();
    const toRemove = document.dups.slice(1);
    await db.collection('bundles').deleteMany({
      _id: {$in: toRemove}
    });
  }
};

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  await deduplicateBundles(db);
  await db.collection('bundle_metadata').createIndex({bundleId : 1}, {unique: true});

  if (await db.collection('bundles').indexExists(['bundleId_1'])) {
    await db.collection('bundles').dropIndex('bundleId_1');
  }
  await db.collection('bundles').createIndex({bundleId : 1}, {unique: true});

  const extractMetadata = (bundle) => {
    const {metadata, bundleId} = bundle;
    return {bundleId, ...metadata};
  };

  const performMetadataMigration = async (bundle) => {
    const metadata = extractMetadata(bundle);
    if ((await db.collection('bundle_metadata').findOne({bundleId: bundle.bundleId})) === null) {
      await db.collection('bundle_metadata').insertOne(metadata);
    }
    await db.collection('bundles').updateOne({bundleId: bundle.bundleId}, {$unset: {metadata: 1}});
  };

  const existingBundlesWithMetadata = await db.collection('bundles').find({metadata: {$exists: true}});

  const migrationsCount = await existingBundlesWithMetadata.count();

  while (await existingBundlesWithMetadata.hasNext()) {
    await performMetadataMigration(await existingBundlesWithMetadata.next());
  }

  logger.info(`Moved metadata dict for ${migrationsCount} bundles`);
};
