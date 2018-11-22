/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import HermesUploadStrategy from './hermes_strategies/upload_strategy';
import {getTimestamp} from '../utils/time_utils';


export default class HermesWorker extends PeriodicWorker {
  constructor(dataModelEngine, workerLogRepository, strategy, logger) {
    super(strategy.workerInterval, logger);
    this.dataModelEngine = dataModelEngine;
    this.bundleSequenceNumber = 0;
    this.strategy = strategy;
    this.workerLogRepository = workerLogRepository;
    if (!(this.strategy instanceof HermesUploadStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async periodicWork() {
    await this.bundleCandidates();
    await this.uploadWaitingCandidates();
  }

  async bundleCandidates() {
    const storagePeriods = this.strategy.storagePeriods();

    const sequenceNumber = this.bundleSequenceNumber++;
    const bundle = await this.dataModelEngine.prepareBundleCandidate(sequenceNumber);

    if (await this.strategy.shouldBundle(bundle)) {
      await this.dataModelEngine.acceptBundleCandidate(bundle, sequenceNumber, storagePeriods);
      await this.strategy.bundlingSucceeded();
      await this.addLog('Bundle candidate accepted');
    } else {
      await this.dataModelEngine.rejectBundleCandidate(sequenceNumber);
      await this.addLog('Bundle candidate discarded');
    }
  }

  async uploadWaitingCandidates() {
    const results = await this.dataModelEngine.uploadAcceptedBundleCandidates();
    for (const bundleId of results.ok) {
      await this.addLog(`Bundle was uploaded`, {bundleId});
    }
    for (const [bundleId, error] of Object.entries(results.failed)) {
      await this.addLog(`Bundle failed to upload`, {bundleId, errorMsg: error.message || error}, error.stack);
    }
  }

  async addLog(message, additionalFields, stacktrace) {
    const log = {
      message,
      ...additionalFields
    };
    this.logger.info({...log, stacktrace});
    await this.workerLogRepository.storeLog({timestamp: getTimestamp(), ...log});
  }

  async beforeWorkLoop() {
    await this.dataModelEngine.rejectAllBundleCandidate();
  }
}
