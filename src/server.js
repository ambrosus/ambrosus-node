import express from 'express';
import config from 'config';

import accountsRouter from './routes/accounts';

export default class Server {
  constructor(db, identityManager, objectBuilder, modelEngine) {
    this.db = db;
    this.identityManager = identityManager;
    this.objectBuilder = objectBuilder;
    this.modelEngine = modelEngine;
  }
  
  start() {
    const app = express();

    app.use('/accounts', accountsRouter);

    const port = process.env.PORT || config.get('server.port');
    this.server = app.listen(port, () => console.log(`Listening in port ${port}`));
  }

  stop() {
    this.server.close();
  }
}
