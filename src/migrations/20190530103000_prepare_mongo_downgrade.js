/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

// eslint-disable-next-line import/prefer-default-export
export const up = async (db, config, logger) => {
  async function getDbRoles() {
    return (await db.command({connectionStatus: 1})).authInfo.authenticatedUserRoles;
  }

  function noAdminPermissions(dbRoles) {
    return dbRoles.length > 0 && dbRoles[0].role !== 'root';
  }

  async function allCollectionNames() {
    return (await db.listCollections({type: 'collection'}, {nameOnly: true}).toArray())
      .map((col) => col.name);
  }

  const dbRoles = await getDbRoles();

  if (noAdminPermissions(dbRoles)) {
    logger.info('Not enough permissions to perform migration, exiting.');
    return;
  }

  const currentFeatureVersion = (await db.admin().command({getParameter: 1, featureCompatibilityVersion: 1})).featureCompatibilityVersion.version;
  if (currentFeatureVersion === '4.0') {
    logger.info('Already at feature version 4.0');
    return;
  }

  await db.admin().command({setFeatureCompatibilityVersion: '4.0'});

  const indexesToRecreate = [];
  for (const collectionName of await allCollectionNames()) {
    const indexes = await (await (db.collection(collectionName)).indexes());
    for (const index of indexes) {
      if (index.unique) {
        indexesToRecreate.push({collectionName, index});
      }
    }
  }
  for (const indexInCollection of indexesToRecreate) {
    logger.info(`Dropping and recreating the following index:${JSON.stringify(indexInCollection.index)}`);
    try {
      await db.collection(indexInCollection.collectionName).dropIndex(indexInCollection.index.name);
      await db.collection(indexInCollection.collectionName).createIndexes([indexInCollection.index]);
    } catch (error) {
      logger.error(error);
    }
  }
};
