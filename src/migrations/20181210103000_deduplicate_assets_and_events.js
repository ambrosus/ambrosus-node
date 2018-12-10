/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const deduplicateAssets = async (db) => {
  const cursor = await db.collection('assets').aggregate(
    [{
      $group: {
        _id: '$assetId',
        dups: {$addToSet: '$_id'},
        count: {$sum: 1}
      }
    },
    {
      $match:
        {
          count: {$gt: 1}
        }
    }]
  );
  while (await cursor.hasNext()) {
    const document = await cursor.next();
    const toRemove = document.dups.slice(1);
    await db.collection('assets').deleteMany({
      _id: {$in: toRemove}
    });
  }
};

const deduplicateEvents = async (db) => {
  const cursor = await db.collection('events').aggregate(
    [{
      $group: {
        _id: '$eventId',
        dups: {$addToSet: '$_id'},
        count: {$sum: 1}
      }
    },
    {
      $match:
        {
          count: {$gt: 1}
        }
    }]
  );
  while (await cursor.hasNext()) {
    const document = await cursor.next();
    const toRemove = document.dups.slice(1);
    await db.collection('events').deleteMany({
      _id: {$in: toRemove}
    });
  }
};

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  await deduplicateAssets(db);
  await deduplicateEvents(db);

  if (await db.collection('assets').indexExists(['assetId_1'])) {
    await db.collection('assets').dropIndex('assetId_1');
  }
  await db.collection('assets').createIndex({assetId : 1}, {unique: true});

  if (await db.collection('events').indexExists(['eventId_1'])) {
    await db.collection('events').dropIndex('eventId_1');
  }
  await db.collection('events').createIndex({eventId : 1}, {unique: true});

  logger.info(`Created unique indexes on assets and events`);
};
