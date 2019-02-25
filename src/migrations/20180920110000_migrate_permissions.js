/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  const registerCount = (await db.collection('accounts').updateMany(
    {permissions: 'register_account'},
    {
      $addToSet: {
        permissions: {
          $each: ['register_accounts', 'manage_accounts']
        }
      }
    }
  )).modifiedCount;

  await db.collection('accounts').updateMany(
    {permissions: 'register_account'},
    {
      $pull: {
        permissions: 'register_account'
      }
    }

  );
  logger.info(`Replaced ${registerCount} 'register_account' permissions`);

  const createEntityCount = (await db.collection('accounts').updateMany(
    {permissions: 'create_entity'},
    {
      $addToSet: {
        permissions: {
          $each: ['create_asset', 'create_event']
        }
      }
    }
  )).modifiedCount;

  await db.collection('accounts').updateMany(
    {permissions: 'create_entity'},
    {
      $pull: {
        permissions: 'create_entity'
      }
    }
  );

  logger.info(`Replaced ${createEntityCount} 'create_entity' permissions`);
};
