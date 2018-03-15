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

## Bundle contract routines
Entities (assets and events) are packaged together into bundles. Proof (hash) of the bundle is then uploaded to the bundle management smart contract.
There are a couple of handy tasks to manage bundle contract.

To use those tasks you need set node environment first, i.e. to run in development mode:
```
export NODE_ENV=dev && ...
```

Available commands:

```
//deploy new instance of a contract (don't forget to update /config/{env}.json)
yarn run ops:deploy:bundleregistry

//add an address to the whitelist 
yarn run ops:bundle:whitelist --add -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466" -u "node.ambrosus.com"

//check if address is on a whitelist
yarn run ops:bundle:whitelist --check -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"

//remove address from whitelist
yarn run ops:bundle:whitelist --remove -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"

//get url of the node
yarn run ops:bundle:whitelist --geturl -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466"

//set node url
yarn run ops:bundle:whitelist --seturl -a "0x925ea5af075bde17811e4bcdc198dc5d3675e466" -u "node.amb.to"
```


