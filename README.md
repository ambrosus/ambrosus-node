[![Build Status](https://travis-ci.com/ambrosus/ambrosus-node.svg?branch=master)](https://travis-ci.com/ambrosus/ambrosus-node)

# The Ambrosus Node
The repository for Ambrosus Node. 

The best way to learn Ambrosus is to:
1. First go to [General introduction](https://github.com/ambrosus/ambrosus-node/blob/master/docs/introduction.md)
2. Follow up with [tutorial](https://github.com/ambrosus/ambrosus-node/blob/master/docs/tutorial.md).
3. Detailed RESTful API documentation is available at [ambrosus.docs.apiary.io](https://ambrosus.docs.apiary.io/).

Scroll to the bottom to get [instructions on how to use postman collection for the API](#postman-collections).

Read below to learn about ambrosus node development.

## Running tests and linting

Start the MongoDB container
```sh
yarn dev:docker:db
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

## Building an clean-up
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

Start a ethereum client of your choice. For example the provided parity (in dev mode) container.
```sh
yarn dev:docker:parity
```

Set `WEB3_NODEPRIVATEKEY` in `dev.env` to a private key with a positive balance. 

Run the contract deployment task:
```sh
yarn dev:deploy
```

Update `HEAD_CONTRACT_ADDRESS` in `dev.env` to match the address given from `yarn dev:deploy`.

Run the system pre-run task:
```sh
yarn dev:prerun
```

Finaly run on of the workers you are interested in:
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

## Running in production mode

Currently we only allow a selected few external nodes to run and connect to the various networks.

In order to run in production mode you will need access to a ethereum client instance, and a mongoDB instance. 

Build the whole suit:
```sh
yarn build
```

Configure environment variables for `WEB3_RPC`, `WEB3_NODEPRIVATEKEY`, `MONGODB_URI`, `HEAD_CONTRACT_ADDRESS` (provided by the Ambrosus developer team).

Finally, start the server:
```sh
yarn start
```

## Updating contracts

After updating the contents of the contracts directory, you should strip away unnecessary fields from the contract files. 

```sh
yarn strip_contracts
```

## Postman collections

Additionally we provide the postman collection to make it easier to test REST queries. To use them you need to run the server, create the admin account and:

1. Import the environment from `postman/AMB-template.postman_environment.json`, rename it if you want, and select it.
2. If needed, change `url` variable (by default url=localhost:9876) to your gateway instance
3. In the environment set `adminSecret` and `adminAddress` variables with a existing admins private and public keys respectively. If you don't have access to an admin account, but rather a normal user account, you can set the `userSecret` and `userAddress`. Note: functionality will be limited.
4. Import collection from `Ambrosus.postman_collection.json`
5. [admin only] Add or modify accounts with the `Add account` and `Modify account` requests
6. Create tokens by calling the `Generate Token` request


## Contribution
We will accept contributions of good code that we can use from anyone.  
Please see [CONTRIBUTION.md](CONTRIBUTION.md)

Before you issue pull request:
* Make sure all tests pass.
* Make sure you have test coverage for any new features.
