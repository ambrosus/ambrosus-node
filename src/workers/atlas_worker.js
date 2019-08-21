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
import {checkIfEnoughFundsToPayForGas, getDefaultAddress} from '../utils/web3_tools';
import availableDiskSpace from '../utils/disk_usage';

const ATLAS_RESOLUTION_WORK_TYPE = 'AtlasResolutions';
const RELEASE_BUNDLES_WORK_TYPE = 'ReleaseBundles';

export default class AtlasWorker extends PeriodicWorker {
  constructor(
    web3,
    dataModelEngine,
    workerLogger,
    workerTaskTrackingRepository,
    mongoClient,
    resolvers,
    operationalMode,
    config,
    releaseBundlesService
  ) {
    super(config.atlasWorkerInterval, workerLogger.logger);
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.workerLogger = workerLogger;
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.mongoClient = mongoClient;
    this.requiredFreeDiskSpace = config.requiredFreeDiskSpace;
    this.resolvers = resolvers;
    this.resolveByOne = config.atlasProcessActiveResolviesByOne;
    this.operationalMode = operationalMode;
    this.releaseBundlesService = releaseBundlesService;

    this.isOutOfFunds = false;
    this.isOutOfSpace = false;

    this.expressApp = express();
    this.serverPort = config.serverPort;
    this.expressApp.get('/health', asyncMiddleware(
      healthCheckHandler(mongoClient, web3)
    ));
    const registry = new promClient.Registry();
    this.expressApp.get('/metrics', prometheusMetricsHandler(registry));
    for (const resolver of this.resolvers) {
      resolver.addMetrics(registry);
    }
  }

  async periodicWork() {
    if (await this.operationalMode.isRetire()) {
      await this.retireOperation();
    } else {
      this.releaseBundlesService.reset();
      await this.normalOperation();
    }
  }

  async normalOperation() {
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(ATLAS_RESOLUTION_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      if (!await this.isEnoughFundsToPayForGas()) {
        return;
      }
      if (!await this.isEnoughAvailableDiskSpace()) {
        return;
      }
      if (this.resolveByOne) {
        for (const resolver of this.resolvers) {
          await resolver.resolveOne();
        }
      } else {
        for (const resolver of this.resolvers) {
          await resolver.resolveAll();
        }
      }
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  async retireOperation() {
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(RELEASE_BUNDLES_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      this.releaseBundlesService.process();
    } catch (err) {
      this.workerLogger.logger.error(err);
      throw err;
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  async isEnoughFundsToPayForGas() {
    if (!await checkIfEnoughFundsToPayForGas(this.web3, getDefaultAddress(this.web3))) {
      if (!this.isOutOfFunds) {
        await this.workerLogger.addLog('Not enough funds to pay for gas');
        this.isOutOfFunds = true;
      }
      return false;
    }
    this.isOutOfFunds = false;
    return true;
  }

  async isEnoughAvailableDiskSpace() {
    if (await availableDiskSpace() < this.requiredFreeDiskSpace) {
      if (!this.isOutOfSpace) {
        await this.workerLogger.addLog('Not enough free disk space');
        this.isOutOfSpace = true;
      }
      return false;
    }
    this.isOutOfSpace = false;
    return true;
  }

  beforeWorkLoop() {
    this.server = this.expressApp.listen(this.serverPort);
  }

  async afterWorkLoop() {
    await this.server.close();
    await this.mongoClient.close();
  }
}
