import Application from './application';

async function start() {
  const application = new Application();
  await application.build();
  await application.ensureAdminAccountExist();
  await application.startServer();
  await application.startBackground();
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
