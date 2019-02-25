/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const collectionExists = async(db, name) => (await db.listCollections({name}).toArray()).length > 0;

const safeDropIndex = async(db, collectionName, indexName) => {
  if (await collectionExists(db, collectionName) && await db.collection(collectionName).indexExists([indexName])) {
    await db.collection(collectionName).dropIndex(indexName);
  }
};

const safeCreateUniqueIndex = async (db, collectionName, uniqueKey) => {
  await safeDropIndex(db, collectionName, `${uniqueKey}_1`);
  await db.collection(collectionName).createIndex({[uniqueKey]: 1}, {unique: true});
};

const deduplicateDocuments = async (db, collectionName, uniqueKey) => {
  const cursor = await db.collection(collectionName).aggregate([{
    $group: {
      _id: `$${uniqueKey}`,
      dups: {$addToSet: '$_id'},
      count: {$sum: 1}
    }
  }, {
    $match: {
      count: {$gt: 1}
    }
  }], {
    allowDiskUse: true,
    cursor: {}
  });

  while (await cursor.hasNext()) {
    const document = await cursor.next();
    const toRemove = document.dups.slice(1);
    await db.collection(collectionName).deleteMany({
      _id: {$in: toRemove}
    });
  }
};

export {collectionExists, safeDropIndex, deduplicateDocuments, safeCreateUniqueIndex};
