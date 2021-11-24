/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

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

/**
 * Atlas node instance
 * @extends PeriodicWorker
 */
export default class AtlasWorker extends PeriodicWorker {
  /**
   * @param {Web3} web3 - the web3 library object
   * @param {DataModelEngine} dataModelEngine - the utility to safely handle data operations
   * @param {WorkerLogger} workerLogger - the logging utility
   * @param {WorkerTaskTrackingRepository} workerTaskTrackingRepository - the utility for tracking active tasks
   * @param {MongoClient} mongoClient - the MongoDB Client
   * @param {Array<AtlasResolver>} resolvers - the array of Atlas event resolvers
   * @param {OperationalMode} operationalMode - the mode of Atlas work
   * @param {Config} config - the config
   * @param {ReleaseBundlesService} releaseBundlesService - the utility to handle Bundle transfer
   */
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

  /**
   * Overwritten method of the PeriodicWorker abstract class
   * Contain work that should be done periodically. Used internally by PeriodicWorker
   * @returns {Promise<void>}
   */
  async periodicWork() {
    if (await this.operationalMode.isRetire()) {
      await this.retireOperation();
    } else {
      this.releaseBundlesService.reset();
      await this.normalOperation();
    }
  }

  /**
   * Tries to resolve challenge
   * Represents regular challenge operation
   * @returns {Promise<void>}
   */
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

  /**
   * Tries to resolve System Challenge
   * Represents System Challenge operation
   * @returns {Promise<void>}
   */
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

  /**
   * Finds out if there is enough funds to pay for Gas
   * @returns {Promise<boolean>}
   */
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

  /**
   * Finds out if there is enought funds to pay for Gas
   * @returns {Promise<boolean>}
   */
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

  /**
   * Sets express server to listen a port
   */
  beforeWorkLoop() {
    this.server = this.expressApp.listen(this.serverPort);
  }

  /**
   * Cleaning used resources
   * @returns {Promise<void>}
   */
  async afterWorkLoop() {
    await this.server.close();
    await this.mongoClient.close();
  }
}
