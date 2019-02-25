/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  const bundlesWithRepositoryDict = await db.collection('bundles').find({repository: {$exists: true}});

  const migrationsCount = await bundlesWithRepositoryDict.count();

  while (await bundlesWithRepositoryDict.hasNext()) {
    const bundle = await bundlesWithRepositoryDict.next();
    const {bundleId, repository} = bundle;
    const {holdUntil} = repository;

    if (await db.collection('bundle_metadata').findOne({bundleId}) === null) {
      continue;
    }

    await db.collection('bundle_metadata').updateOne({bundleId}, {$set: {holdUntil}});
    await db.collection('bundles').updateOne({bundleId}, {$unset: {repository: 1}});
  }

  logger.info(`Moved holdUntil value for ${migrationsCount} bundles`);
};
