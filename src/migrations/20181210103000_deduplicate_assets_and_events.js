/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const deduplicateEntities = async (db, collectionName, uniqueKey) => {
  const cursor = await db.collection(collectionName).aggregate(
    [{
      $group: {
        _id: `$${uniqueKey}`,
        dups: {$addToSet: '$_id'},
        count: {$sum: 1}
      }
    },
    {
      $match: {
        count: {$gt: 1}
      }
    }]
  );
  while (await cursor.hasNext()) {
    const document = await cursor.next();
    const toRemove = document.dups.slice(1);
    await db.collection(collectionName).deleteMany({
      _id: {$in: toRemove}
    });
  }
};

const createUniqueIndex = async (db, collectionName, uniqueKey) => {
  const collectionExists = (await db.listCollections({name: collectionName}).toArray()).length > 0;
  if (collectionExists && await db.collection(collectionName).indexExists([`${uniqueKey}_1`])) {
    await db.collection(collectionName).dropIndex(`${uniqueKey}_1`);
  }
  const indexObject = {[uniqueKey]: 1};
  await db.collection(collectionName).createIndex(indexObject, {unique: true});
};

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  await deduplicateEntities(db, 'assets', 'assetId');
  await deduplicateEntities(db, 'events', 'eventId');

  await createUniqueIndex(db, 'assets', 'assetId');
  await createUniqueIndex(db, 'events', 'eventId');

  logger.info(`Created unique indexes on assets and events`);
};
