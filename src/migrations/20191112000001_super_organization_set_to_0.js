/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  const updatedCount = (await db.collection('accounts').updateMany(
    {organization: {$exists: false}, permissions: 'super_account'},
    {$set : {organization: 0}}
  )).modifiedCount;

  if (updatedCount > 0) {
    logger.info(`Added 'organization' field to ${updatedCount} super accounts`);
  }
};
