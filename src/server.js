import express from 'express';
import errorHandling from './middlewares/error_handling';

import accountsRouter from './routes/accounts';
import assetsRouter from './routes/assets';
import eventsRouter from './routes/events';
import tokenRouter from './routes/token';
import bundlesRouter from './routes/bundles';
import Config from './utils/config';


export default class Server {
  constructor(modelEngine) {
    this.modelEngine = modelEngine;
  }

  start() {
    const app = express();

    app.use('/accounts', accountsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine));  
    app.use('/assets', assetsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine));
    app.use('/events', eventsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine.identityManager, this.modelEngine));
    app.use('/token', tokenRouter(this.modelEngine.tokenAuthenticator));
    app.use('/bundle', bundlesRouter(this.modelEngine));

    // Should always be last
    app.use(errorHandling);

    const port = Config.serverPort();
    this.server = app.listen(port);
  }

  stop() {
    this.server.close();
  }
}
