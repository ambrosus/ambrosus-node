import express from 'express';
import config from 'config';
import errorHandling from './middlewares/error_handling';
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
    app.use('/accounts', accountsRouter(this.modelEngine));
    
    // Should always be last
    app.use(errorHandling);

    const port = process.env.PORT || config.get('server.port');
    this.server = app.listen(port, () => console.log(`Listening in port ${port}`));
  }

  stop() {
    this.server.close();
  }
}
