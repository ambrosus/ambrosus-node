/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import PeriodicWorker from './periodic_worker';
import { encrypt, decrypt } from '../utils/crypto.util';

const HERMES_BACKUP_WORK_TYPE = 'HermesBackup';

export default class HermesBackupWorker extends PeriodicWorker {
  constructor(db, identityManager, store, dataModelEngine, workerTaskTrackingRepository, logger, workerInterval) {
    super(workerInterval, logger);
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.db = db;
    this.identityManager = identityManager;
    this.store = store;
    this.dataModelEngine = dataModelEngine;
  }

  async periodicWork() {
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(HERMES_BACKUP_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      this.logInfo(`Backup start`);

      this.privateKey = await this.store.safeRead('builtInPrivateKey');
      console.log(this.privateKey);
      this.address = this.identityManager.addressFromSecret(this.privateKey);
      console.log(this.address);
      
      let collections = [
        'accounts',
        'accountDetail',
        'identityCounter',
        'organization',
        'organizationInvite',
        'organizationKeys',
        'organizationRequest'
      ];
      const db = {};
      for (const col of collections) {
        db[col] = await this.db.collection(col).find({}, {projection: {_id: 0}}).toArray();
      }

      const state = await this.store.readFile();


      const backup = {db, state};

      console.log(backup);
      const privateKey = await this.identityManager.nodePrivateKey();
      console.log(privateKey);
      const enc = encrypt(JSON.stringify(backup), privateKey);
      console.log(enc);
      /*
      const dec = decrypt(enc, privateKey);
      console.log(dec);
      console.log(JSON.parse(dec));
      console.log(backup);
      */

      const _data = {
        type: 'ambrosus.backup',
        rawData: enc
      };

      const asset = await this.generateAsset({backup: "balhblah"});
      //const event = await this.generateEvent(asset.assetId, _data);
      console.log(asset);
      //console.log(event);
      //console.log(event.content.data);
/*
      await this.dataModelEngine.createAsset(asset);
      await this.dataModelEngine.createEvent(event);
*/

    } catch (err) {
      //throw err;
      //this.logError(`unhandled error - ${err.message || err}`);
      console.error(err);
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  async generateAsset(data) {
    const address = this.address;//this.identityManager.nodeAddress();
    const secret = this.privateKey;//await this.identityManager.nodePrivateKey();

    const idData = {
      createdBy: address,
      sequenceNumber: 0,
      timestamp: Math.floor(new Date().getTime() / 1000),
      ...data,
    };

    const content = {
      idData,
      signature: this.identityManager.sign(secret, idData),
    };

    const asset = {
      assetId: this.identityManager.calculateHash(content),
      content,
    };

    return asset;
  }


  async generateEvent(_assetId /*= this.assetId*/, _data) {
    const address = this.address;//this.identityManager.nodeAddress();
    const secret = this.privateKey;//await this.identityManager.nodePrivateKey();

    const data = [_data];

    const idData = {
      assetId: _assetId,
      timestamp: Math.floor(new Date().getTime() / 1000),
      accessLevel: 0,
      createdBy: address,
      dataHash: this.identityManager.calculateHash(data),
    };

    const content = {
      idData,
      signature: this.identityManager.sign(secret, idData),
      data,
    };

    const event = {
      eventId: this.identityManager.calculateHash(content),
      content,
    };

    return event;
  }

  logInfo(str) {
    this.logger.info(`HermesBackup: ${str}`);
  }

  logError(str) {
    this.logger.error(`HermesBackup: ${str}`);
  }
}
