/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {safeCreateUniqueIndex, deduplicateDocuments} from './migration_helpers';

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  await deduplicateDocuments(db, 'assets', 'assetId');
  await deduplicateDocuments(db, 'events', 'eventId');

  await safeCreateUniqueIndex(db, 'assets', 'assetId');
  await safeCreateUniqueIndex(db, 'events', 'eventId');

  logger.info(`Created unique indexes on assets and events`);
};
