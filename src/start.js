import Server from './server';
import build from './build';

async function start() {
  const modelEngine = build();
  const server = new Server(modelEngine);
  server.start();
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
