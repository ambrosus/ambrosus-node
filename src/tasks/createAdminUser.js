import build from '../build';

async function execute() {
  const {client, dataModelEngine} = await build();
  const account = await dataModelEngine.createAdminAccount();
  console.log('Account created');
  console.log(`Address: ${account.address}`);
  console.log(`Secret:  ${account.secret}`);
  await client.close();
}

execute()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });


