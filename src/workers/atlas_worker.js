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

export default class AtlasWorker extends PeriodicWorker {
  constructor(
    web3,
    dataModelEngine,
    workerLogRepository,
    workerTaskTrackingRepository,
    logger,
    mongoClient,
    serverPort,
    requiredFreeDiskSpace,
    workerInterval,
    resolvers,
    resolveByOne
  ) {
    super(workerInterval, logger);
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.workerLogRepository = workerLogRepository;
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.mongoClient = mongoClient;
    this.requiredFreeDiskSpace = requiredFreeDiskSpace;
    this.resolvers = resolvers;
    this.resolveByOne = resolveByOne;
    this.isOutOfFunds = false;
    this.isOutOfSpace = false;
    this.expressApp = express();
    this.serverPort = serverPort;
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

  async isEnoughFundsToPayForGas() {
    if (!await checkIfEnoughFundsToPayForGas(this.web3, getDefaultAddress(this.web3))) {
      if (!this.isOutOfFunds) {
        await this.addLog('Not enough funds to pay for gas');
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
        await this.addLog('Not enough free disk space');
        this.isOutOfSpace = true;
      }
      return false;
    }
    this.isOutOfSpace = false;
    return true;
  }

  async addLog(message, additionalFields, stacktrace) {
    const log = {
      message,
      ...additionalFields
    };
    this.logger.info({...log, stacktrace});
    await this.workerLogRepository.storeLog({timestamp: new Date(), ...log});
  }

  beforeWorkLoop() {
    this.server = this.expressApp.listen(this.serverPort);
  }

  async afterWorkLoop() {
    await this.server.close();
    await this.mongoClient.close();
  }
}
