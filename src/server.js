import cors from 'cors';
import express from 'express';
import cachePreventionMiddleware from './middlewares/cache_prevention_middleware';
import errorHandling from './middlewares/error_handling';
import accountsRouter from './routes/accounts';
import assetsRouter from './routes/assets';
import bundlesRouter from './routes/bundles';
import eventsRouter from './routes/events';
import tokenRouter from './routes/token';

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
