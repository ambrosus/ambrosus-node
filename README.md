[![Build Status](https://travis-ci.com/ambrosus/ambrosus-sdk.svg?token=xjj4U84eSFwEsYLTc5Qe&branch=master)](https://travis-ci.com/ambrosus/ambrosus-sdk)

# The Ambrosus Node
The repository for Ambrosus Node. 

The best way to learn Ambrosus is to:
1. First go to [General introduction](https://github.com/ambrosus/ambrosus-node/blob/master/docs/introduction.md)
2. Follow up with [tutorial](https://github.com/ambrosus/ambrosus-node/blob/master/docs/tutorial.md).
3. Detailed RESTful API documentation is available at [ambrosus.docs.apiary.io](https://ambrosus.docs.apiary.io/).

Read below to learn about ambrosus node development.

## Install, setup, tests and linter
To install dependencies:
```
yarn
```

Before you can start the server or run tests, you need to have MongoDB up & running.
You can start a local instance using this handy command:
```
yarn dev:db
```

To run test:
```
yarn test
```

To run linter:
```
yarn dev:lint
```

## Building an clean-up
Building consists of compiling the Smart Contracts and transpiling the source code. It is performed by running:
```
yarn build
```

If for some reason you want to perform a clean-up:
```
yarn dev:clean
```

To run node on production use:
```
yarn start
```

## Running in dev environment:
To work with dev environment you need to have parity(version 1.10+) node running on a development chain:
```sh
parity --chain dev --force-ui
```

as well as mongo database:

```sh
yarn run dev:db
```

the contracts also need to be compiled:
```sh
yarn build:contracts
```

contracts must be deployed and a private key for the node generated:
```sh
yarn dev:setup
```

Note: You might need to confirm transactions in the Parity Wallet UI due to a bug in the Parity software.

```sh
yarn dev:start
```

## Running in production mode

Build the whole suit:
```sh
yarn build
```

Generate a private key for the node:
```sh
yarn ops:generate_private_key
```
Note: you can also place a previously generated one into the `config/nodePrivateKey.json` file

Place the contract deployment address into `config/registryContractAddress.json`. You should have received this value from the Ambrosus development team.

Configure the mongoDB access data inside of `config/production.js`

Finally, start the server:
```sh
yarn start
```

## Running using Docker

There is a docker-compose file prepared. It declares two services, one for the server and second one for a mongoDB instance. 

Start by following the procedure for generating the node private key and contract deployment address. It is described under 'Running in production mode'   

Then start just run:

```
docker-compose up -d
```

## Bundle smart contract related  tasks
Entities (assets and events) are packaged together into bundles. Proof (hash) of the bundle is then uploaded to the bundle management smart contract.
There are a couple of handy tasks to manage bundle contract.

To use those tasks you need select the node environment first, i.e. to run in development mode:
```
export NODE_ENV=dev && ...
```

Available commands:

```
//deploy new instance of a contract (don't forget to update /config/{env}.json)
yarn ops:deploy:bundleregistry

//add an address to the whitelist 
yarn ops:bundle:whitelist --add -a "0x00a329c0648769A73afAc7F9381E08FB43dBEA72" -u "node.ambrosus.com"

//check if address is on a whitelist
yarn  ops:bundle:whitelist --check -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"

//remove address from whitelist
yarn ops:bundle:whitelist --remove -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"

//get url of the node
yarn ops:bundle:whitelist --geturl -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"

//set node url
yarn ops:bundle:whitelist --seturl -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466" -u "node.amb.to"
```

## Postman collections

Additionally we provide the postman collection to make it easier to test REST queries. To use them you need to run the server, create the admin account and:

1. Import the environment from `postman/AMB-template.postman_environment.json`, rename it if you want, and select it.
2. If needed, change `url` variable (by default url=localhost:9876) to your gateway instance
3. In the environment set `adminSecret` and `adminAddress` variables with a existing admins private and public keys respectively. If you don't have access to an admin account, but rather a normal user account, you can set the `userSecret` and `userAddress`. Note: functionality will be limited.
4. Import collection from `Ambrosus.postman_collection.json`
5. [admin only] Add or modify accounts with the `Add account` and `Modify account` requests
6. Create tokens by calling the `Generate Token` request

