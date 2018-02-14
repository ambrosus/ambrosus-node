import Server from './server';
import build from './build';
import LinkHelper from './services/link_helper';

async function start() {
  const modelEngine = build();
  const linkHelper = new LinkHelper();
  const server = new Server(modelEngine, linkHelper);
  server.start();
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
