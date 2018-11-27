/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  // assets
  await db.collection('assets').createIndex({assetId: 1});
  await db.collection('assets').createIndex({'content.idData.timestamp': 1});
  await db.collection('assets').createIndex({'content.idData.createdBy': 1});

  // events
  await db.collection('events').createIndex({eventId: 1});
  await db.collection('events').createIndex({'content.idData.timestamp': 1});
  await db.collection('events').createIndex({'content.idData.createdBy': 1});
  await db.collection('events').createIndex({'content.idData.accessLevel': 1});
  await db.collection('events').createIndex({'content.idData.assetId': 1});
  await db.collection('events').createIndex({'content.data.type': 1});
  await db.collection('events').createIndex({'content.data.geoJson': '2dsphere'});

  // bundles
  await db.collection('bundles').createIndex({bundleId: 1});
  await db.collection('bundles').createIndex({'content.idData.timestamp': 1});
  await db.collection('bundles').createIndex({'content.idData.createdBy': 1});

  // for internal use by repository
  await db.collection('assets').createIndex({'repository.bundleStubId': 1});
  await db.collection('events').createIndex({'repository.bundleStubId': 1});

  // worker metadata collections
  await db.collection('workerLogs').createIndex({timestamp: -1});
  await db.collection('workerTasks').createIndex({workType : 1}, {unique: true});

  logger.info(`Created indexes`);
};
