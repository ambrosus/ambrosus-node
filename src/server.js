/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import cors from 'cors';
import express from 'express';
import promClient from 'prom-client';
import Raven from 'raven';
import cachePreventionMiddleware from './middlewares/cache_prevention_middleware';
import errorHandling from './middlewares/error_handling';
import prometheusMiddleware from './middlewares/prometheus_middleware.js';
import accountsRouter from './routes/accounts';
import assetsRouter from './routes/assets';
import bundlesRouter from './routes/bundles';
import eventsRouter from './routes/events';
import tokenRouter from './routes/token';
import nodeInfoRouter from './routes/nodeinfo';
import healthCheckHandler from './routes/health_check';
import prometheusMetricsHandler from './routes/prometheus_metrics.js';
import asyncMiddleware from './middlewares/async_middleware';

export default class Server {
  constructor(modelEngine, config, logger) {
    this.modelEngine = modelEngine;
    this.config = config;
    this.logger = logger;
  }

  start() {
    this.collectMetricsInterval = promClient.collectDefaultMetrics({timeout: 10000});
    const app = express();

    Raven.config(this.config.sentryDSN).install();
    app.use(Raven.requestHandler());

    app.use(prometheusMiddleware(promClient));
    app.use(cors({
      origin : true,
      credentials: true
    }));

    app.use(cachePreventionMiddleware);

    app.use('/nodeinfo', nodeInfoRouter(this.modelEngine.identityManager, this.config.gitCommit));
    app.use('/accounts', accountsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine));
    app.use('/assets', assetsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine, this.config));
    app.use('/events', eventsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine));
    app.use('/token', tokenRouter(this.modelEngine.tokenAuthenticator, this.config));
    app.use('/bundle', bundlesRouter(this.modelEngine));
    app.get('/health', asyncMiddleware(healthCheckHandler(this.modelEngine.mongoClient, this.modelEngine.proofRepository.web3)));
    app.get('/metrics', prometheusMetricsHandler(promClient));

    app.use(Raven.errorHandler());

    // Should always be last
    app.use(errorHandling(this.logger));

    this.server = app.listen(this.config.serverPort);
  }

  stop() {
    clearInterval(this.collectMetricsInterval);
    promClient.register.clear();
    this.server.close();
  }
}
