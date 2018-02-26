import Server from './server';
import build from './build';
import TokenAuthenticator from './utils/token_authenticator';

async function start() {
  const {dataModelEngine} = await build();
  const tokenAuthentificator = new TokenAuthenticator(dataModelEngine.identityManager);
  const server = new Server(dataModelEngine, tokenAuthentificator);
  server.start();
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
