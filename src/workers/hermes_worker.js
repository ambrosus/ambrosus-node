/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import promClient from 'prom-client';
import prometheusMetricsHandler from '../routes/prometheus_metrics.js';
import asyncMiddleware from '../middlewares/async_middleware';
import healthCheckHandler from '../routes/health_check';
import PeriodicWorker from './periodic_worker';
import HermesUploadStrategy from './hermes_strategies/upload_strategy';

const HERMES_BUNDLING_WORK_TYPE = 'HermesBundling';

export default class HermesWorker extends PeriodicWorker {
  constructor(
    dataModelEngine,
    workerLogger,
    workerTaskTrackingRepository,
    strategy,
    mongoClient,
    serverPort
  ) {
    super(strategy.workerInterval, workerLogger.logger);
    this.dataModelEngine = dataModelEngine;
    this.bundleSequenceNumber = 0;
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.strategy = strategy;
    this.workerLogger = workerLogger;
    this.mongoClient = mongoClient;
    this.expressApp = express();
    this.serverPort = serverPort;
    this.expressApp.get('/health', asyncMiddleware(
      healthCheckHandler(mongoClient, dataModelEngine.identityManager.web3)
    ));
    const registry = new promClient.Registry();
    this.expressApp.get('/metrics', prometheusMetricsHandler(registry));
    this.totalBundlesUploaded = new promClient.Counter({
      name: 'hermes_bundle_uploads_total',
      help: 'Total number of successfully uploaded bundles',
      registers: [registry]
    });
    this.totalBundleUploadFailures = new promClient.Counter({
      name: 'hermes_bundle_upload_failures_total',
      help: 'Total number of failed bundle upload attempts',
      registers: [registry]
    });

    if (!(this.strategy instanceof HermesUploadStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async periodicWork() {
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(HERMES_BUNDLING_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      await this.bundleCandidates();
      await this.uploadWaitingCandidates();
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  async bundleCandidates() {
    const storagePeriods = this.strategy.storagePeriods();

    const sequenceNumber = this.bundleSequenceNumber++;
    const bundle = await this.dataModelEngine.prepareBundleCandidate(sequenceNumber);
    const bundlingDecision = await this.strategy.shouldBundle(bundle);
    if (bundlingDecision.result) {
      await this.dataModelEngine.acceptBundleCandidate(bundle, sequenceNumber, storagePeriods);
      await this.strategy.bundlingSucceeded();
      await this.workerLogger.addLog('Bundle candidate accepted', {bundleId: bundle.bundleId});
    } else {
      await this.dataModelEngine.rejectBundleCandidate(sequenceNumber);
      await this.workerLogger.addLog(`Bundle candidate discarded. ${bundlingDecision.reason}`);
    }
  }

  async uploadWaitingCandidates() {
    await this.dataModelEngine.uploadAcceptedBundleCandidates({
      success: async (bundleId, uploadResult) => {
        this.totalBundlesUploaded.inc();
        await this.workerLogger.addLog(uploadResult, {bundleId});
      },
      fail: async (bundleId, error) => {
        this.totalBundleUploadFailures.inc();
        await this.workerLogger.addLog(`Bundle failed to upload`, {bundleId, errorMsg: error.message || error}, error.stack);
      }
    });
  }

  async beforeWorkLoop() {
    this.server = this.expressApp.listen(this.serverPort);
  }

  async afterWorkLoop() {
    await this.server.close();
    await this.mongoClient.close();
  }
}
