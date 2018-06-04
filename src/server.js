/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import cors from 'cors';
import express from 'express';
import cachePreventionMiddleware from './middlewares/cache_prevention_middleware';
import errorHandling from './middlewares/error_handling';
import accountsRouter from './routes/accounts';
import assetsRouter from './routes/assets';
import bundlesRouter from './routes/bundles';
import eventsRouter from './routes/events';
import tokenRouter from './routes/token';
import nodeInfoRouter from './routes/nodeinfo';

export default class Server {
  constructor(modelEngine, config) {
    this.modelEngine = modelEngine;
    this.config = config;
  }

  start() {
    const app = express();

    app.use(cors({
      origin : true,
      credentials: true
    }));

    app.use(cachePreventionMiddleware);

    app.use('/nodeinfo', nodeInfoRouter(this.modelEngine.identityManager));
    app.use('/accounts', accountsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine));
    app.use('/assets', assetsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine, this.config));
    app.use('/events', eventsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine));
    app.use('/token', tokenRouter(this.modelEngine.tokenAuthenticator, this.config));
    app.use('/bundle', bundlesRouter(this.modelEngine));

    // Should always be last
    app.use(errorHandling);

    this.server = app.listen(this.config.serverPort());
  }

  stop() {
    this.server.close();
  }
}
