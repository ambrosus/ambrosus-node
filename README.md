[![Build Status](https://travis-ci.com/ambrosus/ambrosus-sdk.svg?token=xjj4U84eSFwEsYLTc5Qe&branch=master)](https://travis-ci.com/ambrosus/ambrosus-sdk)

# The Ambrosus Node
The repository for http RESTful api. Full [API documentation](https://ambrosus.docs.apiary.io/) is available [here](https://ambrosus.docs.apiary.io/).

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
    
