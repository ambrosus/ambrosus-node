/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  await db.collection('bundles').ensureIndex({bundleId : 1}, {unique: true});
  await db.collection('bundle_metadata').ensureIndex({bundleId : 1}, {unique: true});

  const extractMetadata = (bundle) => {
    const {metadata, bundleId} = bundle;
    return {bundleId, ...metadata};
  };

  const performMetadataMigration = async (bundle) => {
    const metadata = extractMetadata(bundle);
    try {
      await db.collection('bundle_metadata').insertOne(metadata);
    } finally {
      await db.collection('bundles').updateOne({bundleId: bundle.bundleId}, {$unset: {metadata: 1}});
    }
  };

  const existingBundlesWithMetadata = await db.collection('bundles').find({metadata: {$exists: true}});

  const migrationsCount = await existingBundlesWithMetadata.count();

  await existingBundlesWithMetadata.forEach(performMetadataMigration);

  logger.info(`Moved metadata of ${migrationsCount} bundles`);
};
