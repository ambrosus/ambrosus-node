/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {safeDropIndex} from './migration_helpers';

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  await safeDropIndex(db, 'assets', 'repository.bundleStubId_1');
  await safeDropIndex(db, 'events', 'repository.bundleStubId_1');

  await db.collection('assets').ensureIndex({'metadata.bundleId': 1}, {background: true});
  await db.collection('assets').ensureIndex({'repository.bundleStubId': 1, 'metadata.bundleId': 1, 'content.idData.timestamp': 1, assetId: 1}, {background: true});

  await db.collection('events').ensureIndex({'metadata.bundleId': 1}, {background: true});
  await db.collection('events').ensureIndex({'repository.bundleStubId': 1, 'metadata.bundleId': 1, 'content.idData.timestamp': 1, eventId: 1}, {background: true});

  logger.info(`Created index for effective bundling of assets and events`);
};
