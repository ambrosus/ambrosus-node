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
  constructor(db, identityManager, workerTaskTrackingRepository, logger, workerInterval) {
    super(workerInterval, logger);
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.db = db;
    this.identityManager = identityManager;
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
      let collections = [
        'accounts',
        'accountDetail',
        'identityCounter',
        'organization',
        'organizationInvite',
        'organizationKeys',
        'organizationRequest'
      ];
      const obj = {};
      for (const col of collections) {
        obj[col] = await this.db.collection(col).find({}, {projection: {_id: 0}}).toArray();
      }
      console.log(obj);
      const privateKey = await this.identityManager.nodePrivateKey();
      console.log(privateKey);
      const enc = encrypt(JSON.stringify(obj), privateKey);
      console.log(enc);
      const dec = decrypt(enc, privateKey);
      console.log(dec);
      console.log(JSON.parse(dec));


    } catch (err) {
      this.logError(`unhandled error - ${err.message || err}`);
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  logInfo(str) {
    this.logger.info(`HermesBackup: ${str}`);
  }

  logError(str) {
    this.logger.error(`HermesBackup: ${str}`);
  }
}
