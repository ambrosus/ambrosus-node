import express from 'express';
import config from 'config';

import testRouter from './routes/test';

export default class Server {
  start() {
    const app = express();

    app.use('/', testRouter);

    const port = process.env.PORT || config.get('server.port');
    this.server = app.listen(port, () => console.log(`Listening in port ${port}`));
  }

  stop() {
    this.server.close();
  }
}
