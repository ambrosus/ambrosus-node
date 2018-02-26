import express from 'express';
import config from 'config';
import errorHandling from './middlewares/error_handling';

import accountsRouter from './routes/accounts';
import assetsRouter from './routes/assets';
import eventsRouter from './routes/events';


export default class Server {
  constructor(modelEngine) {
    this.modelEngine = modelEngine;
  }

  start() {
    const app = express();

    app.use('/accounts', accountsRouter(this.modelEngine.tokenAuthenticator, this.modelEngine));  
    app.use('/assets', assetsRouter(this.modelEngine.identityManager, this.modelEngine));
    app.use('/events', eventsRouter(this.modelEngine.identityManager, this.modelEngine));

    // Should always be last
    app.use(errorHandling);

    const port = process.env.PORT || config.get('server.port');
    this.server = app.listen(port);
  }

  stop() {
    this.server.close();
  }
}
