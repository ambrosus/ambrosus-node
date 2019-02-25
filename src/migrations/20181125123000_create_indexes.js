/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  // assets
  await db.collection('assets').ensureIndex({assetId: 1});
  await db.collection('assets').ensureIndex({'content.idData.timestamp': 1});
  await db.collection('assets').ensureIndex({'content.idData.createdBy': 1});

  // events
  await db.collection('events').ensureIndex({eventId: 1});
  await db.collection('events').ensureIndex({'content.idData.timestamp': 1});
  await db.collection('events').ensureIndex({'content.idData.createdBy': 1});
  await db.collection('events').ensureIndex({'content.idData.accessLevel': 1});
  await db.collection('events').ensureIndex({'content.idData.assetId': 1});
  await db.collection('events').ensureIndex({'content.data.type': 1});
  await db.collection('events').ensureIndex({'content.data.geoJson': '2dsphere'});

  // bundles
  await db.collection('bundles').ensureIndex({bundleId: 1});
  await db.collection('bundles').ensureIndex({'content.idData.timestamp': 1});
  await db.collection('bundles').ensureIndex({'content.idData.createdBy': 1});

  // for internal use by repository
  await db.collection('assets').ensureIndex({'repository.bundleStubId': 1});
  await db.collection('events').ensureIndex({'repository.bundleStubId': 1});

  // worker metadata collections
  await db.collection('workerLogs').ensureIndex({timestamp: -1});
  await db.collection('workerTasks').ensureIndex({workType : 1}, {unique: true});

  logger.info(`Created indexes`);
};
