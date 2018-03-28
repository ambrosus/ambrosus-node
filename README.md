[![Build Status](https://travis-ci.com/ambrosus/ambrosus-sdk.svg?token=xjj4U84eSFwEsYLTc5Qe&branch=master)](https://travis-ci.com/ambrosus/ambrosus-sdk)

# The Ambrosus Node
The repository for Ambrosus Node. Detailed RESTful API documentation is available at [ambrosus.docs.apiary.io](https://ambrosus.docs.apiary.io/).

## Install, run & test
To install dependencies:
```
yarn
```

Before you can start dev server, you need to have MongoDB up & running.
To do that you can use the handy command:
```
yarn dev:db
```

And to run dev server:
```
yarn dev:start
```

Type following to run test:
```
yarn test
```

To run litnter:
```
yarn dev:lint
```

## Building an clean-up
If you want to just build, you can use:
```
yarn build
```

To do a clean-up:
```
yarn dev:clean
```

To run node on production use:
```
yarn start
```

## Running using Docker

There is a docker-compose file prepared. It declares two services for our app and a mongod instance. To start:

```
docker-compose up -d
```

You will also have to create yourself an admin account in the app:

```
docker-compose exec ambnode yarn ops:admin:create
```

## Setuping dev environment:
To work with dev environemnt you need to have parity(version 1.10+) node running on development chain:
```sh
parity --chain dev --force-ui
```

as well as mongo database:

```sh
yarn run dev:db
```

Before start make sure you compile and deploy required contracts:
```sh
yarn build:contracts
```

and setup dev environment:
```sh
yarn dev:setup
```

Note: You might need to confirm transactions in parity due to bug in parity.

## Workers
Following workers are required for Ambrosus node to work.

### Bundle finalization Workers
Bundle finalization worker gathers entities, packs them in bundles and stores the proofs on the blockchain. To launch the worker type:

```sh
yarn ops:bundle:finalisation
```

Note that NODE_ENV environment varibale needs to be set.

You can run the worker in dev mode with:

```sh
yarn dev:bundle:finalisation
```


### Bundle downloader Worker
To run bundle downloader worker type in your shell in dev mode:
```
yarn dev:bundle:downloader
```

and to run in production mode:

```
yarn ops:bundle:downloader
```


## Bundle smart contract related  tasks
Entities (assets and events) are packaged together into bundles. Proof (hash) of the bundle is then uploaded to the bundle management smart contract.
There are a couple of handy tasks to manage bundle contract.

To use those tasks you need set node environment first, i.e. to run in development mode:
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

1. Import the environment from `postman/AMB.postman_environment.json` and select it.
2. Import collection from `Ambrosus.postman_collection.json`
3. In the environment set `adminSecret` and `adminAddress` variables with admin's private and public keys respectively.
4. If needed, change `url` variable (by default url=localhost:9876)
5. Create token with calling the `Create Token` request

