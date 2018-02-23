import Server from './server';
import build from './build';

async function start() {
  const {dataModelEngine} = await build();
  const server = new Server(dataModelEngine);
  server.start();
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
