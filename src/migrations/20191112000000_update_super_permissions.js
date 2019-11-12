/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  const registerCount = (await db.collection('accounts').updateMany(
    {permissions: 'super_account'},
    {
      $addToSet: {
        permissions: {
          $each: ['manage_accounts', 'register_accounts']
        }
      }
    }
  )).modifiedCount;

  logger.info(`Replaced ${registerCount} 'super_account' permissions`);
};
