/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {encrypt, decrypt} from '../utils/crypto.util';

export default class HermesBackup {
  constructor(db, store, identityManager, dataModelEngine, logger) {
    this.db = db;
    this.store = store;
    this.identityManager = identityManager;
    this.dataModelEngine = dataModelEngine;
    this.logger = logger;

    this.allCollectionsForBackup = [
      'accounts',
      'accountDetail',
      'identityCounter',
      'organization',
      'organizationInvite',
      'organizationKeys',
      'organizationRequest'
    ];
    this.requiredCollections = [
      'accounts',
      'organization',
      'organizationKeys'
    ];
  }

  async save() {
    try {
      this.logInfo(`save()`);

      const state = await this.store.readFile();

      const db = {};
      for (const colName of this.allCollectionsForBackup) {
        db[colName] = await this.db.collection(colName).find({}, {projection: {_id: 0}})
          .toArray();
      }

      const backup = {db, state};

      const secret = await this.store.safeRead('builtInPrivateKey');
      const address = this.identityManager.addressFromSecret(state.builtInPrivateKey);

      let assetId;
      const latestBackupEvent = await this.getLatestBackupEvent();
      if (null !== latestBackupEvent) {
        // eslint-disable-next-line prefer-destructuring
        assetId = latestBackupEvent.content.idData.assetId;

        // check asset expired?

        this.logInfo(`found backup asset ${assetId}`);
      } else {
        const asset = await this.generateAsset(address, secret);
        await this.dataModelEngine.createAsset(asset);
        // eslint-disable-next-line prefer-destructuring
        assetId = asset.assetId;
        this.logInfo(`created backup asset ${assetId}`);
      }

      const data = {
        type: 'ambrosus.backup',
        rawData: await this.encryptBackup(backup)
      };

      const event = await this.generateEvent(assetId, data, address, secret);
      await this.dataModelEngine.createEvent(event);

      this.logInfo(`created backup event ${event.eventId}`);
    } catch (err) {
      this.logError(`unhandled error - ${err.message || err}`);
    }
  }

  async restore() {
    try {
      this.logInfo(`restore()`);

      if (! await this.isRestoreRequired()) {
        this.logInfo(`restore not required`);
        //
        return;
      }

      const latestBackupEvent = await this.getLatestBackupEvent();
      if (null === latestBackupEvent) {
        this.logInfo('no backup event found');
        return null;
      }

      //
      // console.log(latestBackupEvent);

      const latestBackup = await this.decryptBackup(latestBackupEvent.content.data[0].rawData);

      //
      // console.log(latestBackup);

      // validate backup?

      // restore collections
      for (const colName in latestBackup.db) {
        // console.log('restore', colName);
        const oldColName = `${colName}_old`;

        try {
          try {
            await this.db.collection(oldColName).drop();
          } catch (err) {
            //
          }

          try {
            await this.db.collection(colName).rename(oldColName);
          } catch (err) {
            //
          }

          await this.db.collection(colName).insertMany(latestBackup.db[colName]);

          this.logInfo(`restored ${colName}`);
        } catch (err) {
          this.logError(`error restoring ${colName} - ${err.message || err}`);
        }
      }

      // restore state.json?
    } catch (err) {
      this.logError(`unhandled error - ${err.message || err}`);
      //
      // console.error(err);
    }
  }

  async generateAsset(address, secret) {
    const idData = {
      createdBy: address,
      sequenceNumber: 0,
      timestamp: Math.floor(new Date().getTime() / 1000)
    };

    const content = {
      idData,
      signature: this.identityManager.sign(secret, idData)
    };

    const asset = {
      assetId: this.identityManager.calculateHash(content),
      content
    };

    return asset;
  }

  async generateEvent(_assetId, _data, address, secret) {
    const data = [_data];

    const idData = {
      assetId: _assetId,
      timestamp: Math.floor(new Date().getTime() / 1000),
      accessLevel: 0,
      createdBy: address,
      dataHash: this.identityManager.calculateHash(data)
    };

    const content = {
      idData,
      signature: this.identityManager.sign(secret, idData),
      data
    };

    const event = {
      eventId: this.identityManager.calculateHash(content),
      content
    };

    return event;
  }

  async getLatestBackupEvent() {
    return this.db.collection('events')
      .find({'content.data.0.type':'ambrosus.backup'}, {projection: {_id: 0, metadata: 0, repository: 0}})
      .sort({'content.idData.timestamp': -1})
      .next();
  }

  async isRestoreRequired() {
    for (const colName of this.requiredCollections) {
      const colArray = await this.db.collection(colName).find({}, {projection: {_id: 1}})
        .toArray();
      if (0 === colArray.length) {
        return true;
      }
    }
    return false;
  }

  async encryptBackup(backupObj) {
    const encryptionKey = await this.identityManager.nodePrivateKey();
    return encrypt(JSON.stringify(backupObj), encryptionKey);
  }

  async decryptBackup(encryptedString) {
    const encryptionKey = await this.identityManager.nodePrivateKey();
    return JSON.parse(decrypt(encryptedString, encryptionKey));
  }

  logInfo(str) {
    this.logger.info(`HermesBackup: ${str}`);
  }

  logError(str) {
    this.logger.error(`HermesBackup: ${str}`);
  }
}
