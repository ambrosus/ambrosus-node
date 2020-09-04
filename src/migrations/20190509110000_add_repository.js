/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BundleStatuses from '../utils/bundle_statuses';

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  const modifiedCount = (await db.collection('bundle_metadata').updateMany({repository: {$exists: false}},
    {$set: {repository: {status: BundleStatuses.unknown}}})).result.nModified;

  logger.info(`Added status field to ${modifiedCount} bundles`);
};
