import Server from './server';

async function start() {
  const server = new Server();

  server.start();
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
