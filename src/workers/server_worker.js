/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Worker from './worker';
import cors from 'cors';
import express from 'express';
import promClient from 'prom-client';
import * as Sentry from '@sentry/node';
import cachePreventionMiddleware from '../middlewares/cache_prevention_middleware';
import errorHandling from '../middlewares/error_handling';
import loggerMiddleware from '../middlewares/logger_middleware';
import prometheusMiddleware from '../middlewares/prometheus_middleware.js';
import accountsRouter from '../routes/accounts';
import assetsRouter from '../routes/assets';
import bundlesRouter from '../routes/bundles';
import eventsRouter from '../routes/events';
import tokenRouter from '../routes/token';
import nodeInfoRouter from '../routes/nodeinfo';
import healthCheckHandler from '../routes/health_check';
import prometheusMetricsHandler from '../routes/prometheus_metrics.js';
import asyncMiddleware from '../middlewares/async_middleware';
import {Role} from '../services/roles_repository';
import fallbackRouter from '../routes/fallback';

export default class ServerWorker extends Worker {
  constructor(modelEngine, web3, role, config, logger, operationalMode) {
    super(logger);
    this.modelEngine = modelEngine;
    this.role = role;
    this.web3 = web3;
    this.config = config;
    this.operationalMode = operationalMode;
  }

  async work() {
    this.logger.info({message: 'Starting server'});

    const registry = new promClient.Registry();
    this.collectMetricsInterval = promClient.collectDefaultMetrics({
      register: registry,
      timeout: 10000
    });
    const app = express();

    app.set('json spaces', 2);
    app.use(Sentry.Handlers.requestHandler());
    app.use(loggerMiddleware(this.logger));
    app.use(prometheusMiddleware(promClient, registry));
    app.use(cors({
      origin : true,
      credentials: true
    }));

    app.use(cachePreventionMiddleware);

    app.use('/nodeinfo', nodeInfoRouter(this.modelEngine, this.modelEngine.identityManager, this.config.gitCommit, this.config, this.role.is(Role.HERMES) ? null : this.operationalMode));
    app.use('/bundle', bundlesRouter(this.modelEngine));
    app.get('/health', asyncMiddleware(healthCheckHandler(this.modelEngine.mongoClient, this.web3)));
    app.get('/metrics', prometheusMetricsHandler(registry));

    if (this.role.is(Role.HERMES)) {
      app.use('/accounts', accountsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine, this.config));
      app.use('/assets', assetsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine, this.config));
      app.use('/events', eventsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine));
      app.use('/token', tokenRouter(this.modelEngine.tokenAuthenticator, this.config));
    }

    app.use('*', fallbackRouter(this.config));

    app.use(Sentry.Handlers.errorHandler());

    // Should always be last
    app.use(errorHandling(this.logger));

    this.apiServer = app.listen(this.config.serverPort);
  }

  async teardown() {
    clearInterval(this.collectMetricsInterval);
    promClient.register.clear();
    this.apiServer.close();
  }
}
