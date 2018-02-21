import express from 'express';
import config from 'config';
import errorHandling from './middlewares/error_handling';

import accountsRouter from './routes/accounts';
import assetsRouter from './routes/assets';


export default class Server {
  constructor(modelEngine, linkHelper) {
    this.modelEngine = modelEngine;
    this.linkHelper = linkHelper;
  }

  start() {
    const app = express();

    app.use('/accounts', accountsRouter(this.modelEngine.identityManager, this.modelEngine));  
    app.use('/assets', assetsRouter(this.modelEngine.identityManager, this.modelEngine, this.linkHelper));

    // Should always be last
    app.use(errorHandling);

    const port = process.env.PORT || config.get('server.port');
    this.server = app.listen(port, () => console.log(`Listening in port ${port}`));
  }

  stop() {
    this.server.close();
  }
}
