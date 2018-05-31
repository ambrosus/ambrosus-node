# Ambrosus JavaScript tutorial

Welcome to Ambrosus JavaScript tutorial. Follow the steps below to retrieve and create your first assets and events on the Ambrosus Network. This tutorial assumes you are using modern browser which supports async functions, string interpolation, fetch API and `const` keyword. You can test the commands in (jsconsole.com)[https://jsconsole.com/].

## Before you start

We recommended you read [Introduction to Ambrosus](https://github.com/ambrosus/ambrosus-node/blob/master/docs/introduction.md) before you proceed.

### Test server and test account
For this tutorial, we will use publicly available development ambrosus node, available under [https://gateway-test.ambrosus.com](https://gateway-test.ambrosus.com).

## Reading data

### 1. Get asset
To get an asset you need to do a GET query on `/assets/:assetId`, where `assetId` is id of an asset. See example below.

```js
const response = await fetch('https://gateway-test.ambrosus.com/assets/0x0633b3298b774302983527160fd2b4a869976c98b22c96503995bc3ee8a4b6cc');
const result = await response.json();
```

The returned result is an asset, and it looks something like this:
```json
{
   "content":{  
      "idData":{
         "createdBy":"0x5f0...7bf1",
         "timestamp":1524064167,
         "sequenceNumber":0
      },
      "signature":"0x77df...131c"
   },
   "assetId":"0x0633...b6cc",
   "metadata":{
      "bundleId":"0x94b6...39fb"
   }
}
```

### 2. Get event
In a similar way to get an event you need to do a GET query on `/events/:eventId`, where eventId is id of an event. See example below.

```js
const url = 'https://gateway-test.ambrosus.com/events/0x404ca30c026400cf0a24941a883343340bf15c2b3f38c3316b9c460c507d1849'
const response = await fetch(url)
const event = await response.json();
```

The returned result is an event, and it looks something like this:
```json
{
   "content":{
      "idData":{
         "assetId":"0xad76...8e29",
         "createdBy":"0x5f01...7bf1",
         "accessLevel":0,
         "timestamp":1524064390,
         "dataHash":"0x241f...685b"
      },
      "data":[
         {
            "type":"custom",
            "message":"This is the first event!"
         }
      ],
      "signature":"0x39d1...4e1c"
   },
   "eventId":"0x404c...1849",
   "metadata":{
      "bundleId":"0x5d7f...aa4f"
   }
}
```

## Writing data
To write data, you will need to have registered account within a node. For this tutorial, you can use a publicly available test account. The address of the account is `0x5f01d1318d88868d46c77c090543f3a3224f7bf1` and the secret is `0x7667f9f4bac24921e5e51fff87992cb268e23355aafbfe44e3c7ef343f3e837f`. It can only be used to create new assets and events.

### 3. Create an asset
To create an asset with test account use following code:

```js
const assetResponse = await fetch('https://gateway-test.ambrosus.com/assets', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'Authorization': 'AMB 0x7667f9f4bac24921e5e51fff87992cb268e23355aafbfe44e3c7ef343f3e837f'
  },  
  body: JSON.stringify({
    content: {
        idData: {
          createdBy: "0x5f01d1318d88868d46c77c090543f3a3224f7bf1",
          timestamp: Math.floor(Date.now() / 1000),
          sequenceNumber: 0
        }
    }
  })
});
const asset = await assetResponse.json();
```

As a result, it will return JSON, containing among others `assetId`. You will need assetId to create events.

### 4. Create an event

To create an event using assetId from the previous snippet use the following code:

```js
const eventResponse = await fetch(`https://gateway-test.ambrosus.com/assets/${asset.assetId}/events`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'Authorization': 'AMB 0x7667f9f4bac24921e5e51fff87992cb268e23355aafbfe44e3c7ef343f3e837f'
  },
  body: JSON.stringify({
    content: {
      idData: {
        assetId: asset.assetId,
        createdBy: '0x5f01d1318d88868d46c77c090543f3a3224f7bf1',
        accessLevel: 0,
        timestamp: Math.floor(Date.now() / 1000)
      },
      data:
        [
          {
            type: 'custom',
            message: 'This is the first event!'
          }
        ]
    }
  })
});
const newEvent = await eventResponse.json();
```

As a result, it will return JSON, containing the whole event.

## What is next?
Visit [dev.ambrosus.com](https://dev.ambrosus.com/) for full API documentation.

You can use [Ambrosus Postman collections](https://github.com/ambrosus/ambrosus-node/tree/master/postman) to play with Ambrosus API. You can read the [instructions](https://github.com/ambrosus/ambrosus-node#postman-collections) on how to import them in README.
