# Ambrosus tutorial

Welcome to Ambrosus tutorial. Follow the steps below to retrieve and create your first assets and events on the Ambrosus Network. 

## Before you start

We recommended you read [Introduction to Ambrosus](https://github.com/ambrosus/ambrosus-node/blob/master/docs/introduction.md) before you proceed.

### Test server and test account
For this tutorial, we will use publicly available development ambrosus node, available under [http://gateway-dev.ambrosus.com](http://gateway-dev.ambrosus.com).

## Reading data

### 1. Get asset
To get an asset you need to do a GET query on `/assets/:assetId`, where `assetId` is id of an asset. See cURL example below.

```sh
curl -X GET \
  'http://gateway-dev.ambrosus.com/assets/0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d'
```

To get a nicely formatted JSON add `| python -m json.tool` at the end of each command:
```sh
curl -X GET \
  'http://gateway-dev.ambrosus.com/assets/0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d' | python -m json.tool
```

### 2. Get event
In a similar way to get an event you need to do a GET query on `/assets/:assetId/events/:eventId`, where `assetId` is an id of the subject (an asset that is linked to the event) and `:eventId` is the id of the event itself. See cURL example below.

```sh
curl -X GET \
  'http://gateway-dev.ambrosus.com/assets/0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d/events/0x6c8cede43cdd276465f56e8d70f99b823019fbd77fd3844150f440587896009e'
```

## Writing data
To write data, you will need to have registered account within a node. For this tutorial, you can use user publically available test account. Test account address is `0x5f01d1318d88868d46c77c090543f3a3224f7bf1` and the secret is `0x7667f9f4bac24921e5e51fff87992cb268e23355aafbfe44e3c7ef343f3e837f`. It can only be used to create new accounts.


### 3. To create an asset
To create an asset with test account use following command.

```sh
curl -X POST \
  'http://gateway-dev.ambrosus.com/assets' \
  -H 'Accept: application/json' \
  -H 'Authorization: AMB 0x7667f9f4bac24921e5e51fff87992cb268e23355aafbfe44e3c7ef343f3e837f' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": {
        "idData": {
            "createdBy": "0x5f01d1318d88868d46c77c090543f3a3224f7bf1",
            "timestamp": 1735726210,
            "sequenceNumber": 0
        }
    }
}'
```

As a result, it will return JSON, containing among others `assetId`. You will need assetId to create events.

### 4. Create an event

Substitute `<<assetId>>` in following command to create an asset.

```sh
curl -X POST \
  'http://gateway-dev.ambrosus.com/assets/<<assetId>>/events' \
  -H 'Accept: application/json' \
  -H 'Authorization: AMB 0x7667f9f4bac24921e5e51fff87992cb268e23355aafbfe44e3c7ef343f3e837f' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": {
        "idData": {
            "assetId": "<<assetId>>",
            "createdBy": "0x5f01d1318d88868d46c77c090543f3a3224f7bf1",
            "accessLevel": 0,
            "timestamp": 1503424923
        },
        "data": {
          "entries": [
            {
              "type": "custom",
              "message": "This is the first event!"
            }
          ]
        }
    }
}'
```

## What is next?
Visit [ambrosus.docs.apiary.io](https://ambrosus.docs.apiary.io/) for full API documentation.

You can use [Ambrosus Postman collections](https://github.com/ambrosus/ambrosus-node/tree/master/postman) to play with Ambrosus API. You can read the [instructions](https://github.com/ambrosus/ambrosus-node#postman-collections) on how to import them in README.

