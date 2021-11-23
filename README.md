[![Build Status](https://travis-ci.com/ambrosus/ambrosus-node.svg?branch=master)](https://travis-ci.com/ambrosus/ambrosus-node)

# The Ambrosus Node
### The source code of Hermes and Atlas nodes. Part of the [ambrosus project](https://ambrosus.io/).

## Table of contents
- [Introduction](#introduction)
- [Running tests](#running-tests)
- [Building project](#building)
- [Running locally](#running-in-development-mode)
- [Running your own node](#running-your-own-node)
- [Running in production](#running-in-production-mode)
- [Contributing](#contribution)

## Introduction
Contains source code of Hermes and Atlas nodes that are part of ambrosus blockchain network.
Read more about [ambrosus](https://github.com/ambrosus/ambrosus-node/blob/master/docs/introduction.md).

## Running tests

Start the MongoDB container
```sh
yarn dev:docker:db
```

Run data migrations
```sh
yarn dev:migrate
```

Install the dependencies
```sh
yarn install
```

Run the tests
```sh
yarn test
```

Run linter:
```sh
yarn dev:lint
```

### Postman collections

Additionally we provide the postman collection to make it easier to test REST queries. To use them you need to run the server, create the admin account and:

1. Import the environment from `postman/AMB-template.postman_environment.json`, rename it if you want, and select it.
2. If needed, change `url` variable (by default url=localhost:9876) to your gateway instance
3. In the environment set `adminSecret` and `adminAddress` variables with a existing admins private and public keys respectively. If you don't have access to an admin account, but rather a normal user account, you can set the `userSecret` and `userAddress`. Note: functionality will be limited.
4. Import collection from `Ambrosus.postman_collection.json`
5. [admin only] Add or modify accounts with the `Add account` and `Modify account` requests
6. Create tokens by calling the `Generate Token` request

## Building
Building consists of transpiling the source code. It is performed by running:
```sh
yarn build
```

If for some reason you want to perform a clean-up:
```sh
yarn dev:clean
```

## Running in development mode

Start the MongoDB container
```sh
yarn dev:docker:db
```

Run data migration
```sh
yarn dev:migrate
```

Start an ethereum client of your choice. For example, the provided parity container (in dev mode).
```sh
yarn dev:docker:parity
```

Set `WEB3_NODEPRIVATEKEY` and `WEB3_DEPLOYER_PRIVATEKEY`a in `dev.env` to a private key with 
a positive balance. 

If you're using provided parity from container, the private key in `dev.env` should already match a dev account.

Run the contract deployment task:
```sh
yarn dev:deploy
```

Update `HEAD_CONTRACT_ADDRESS` in `dev.env` to match the address returned from `yarn dev:deploy`.

Run the system pre-run task:
```sh
yarn dev:prerun:hermes
```
or
```sh
yarn dev:prerun:atlas
```
to match your desired type of node: hermes or atlas.

Finally, run one of the workers you are interested in:
```sh
yarn dev:start:server
```
or 
```sh
yarn dev:start:hermes
```
or
```sh
yarn dev:start:atlas
```

## Running your own node
To run your own node in ambrosus network see [ambrosus-nop](https://github.com/ambrosus/ambrosus-nop).

## Running in production mode
This project shouldn't be running on it own. See [ambrosus-nop](https://github.com/ambrosus/ambrosus-nop) to find 
start scripts. For additional information about running in test mode contact ambrosus development team.

Below are instructions to run this particular project. \
Your should have an ethereum client instance and a mongoDB instance.

Build the whole suit:
```sh
yarn build
```

Configure environment variables for `WEB3_RPC`, `WEB3_NODEPRIVATEKEY`, `MONGODB_URI`, `HEAD_CONTRACT_ADDRESS` (provided by the Ambrosus developer team).

Run database migration
```sh
yarn migrate
```

Finally, start desired server: \
Api
```sh
yarn start:server
```

Or Hermes
```sh
yarn start:hermes
```

Or Atlas
```sh
yarn start:atlas
```

## Utils

getToken - utility for manual AMB_TOKEN generation, usage: 
```sh
node getToken.js <privKey>
```


## Contribution
We will accept contributions of good code that we can use from anyone.  
Please see [CONTRIBUTION.md](CONTRIBUTION.md)

Before you issue pull request:
* Make sure all tests pass.
* Make sure you have test coverage for any new features.
