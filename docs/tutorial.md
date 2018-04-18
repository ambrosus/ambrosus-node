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
  'https://gateway-dev.ambrosus.com/assets/0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d'
```

To get a nicely formatted JSON add `| python -m json.tool` at the end of each command:
```sh
curl -X GET \
  'https://gateway-dev.ambrosus.com/assets/0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d' | python -m json.tool
```

The returned result is an asset, and it looks like this:
```json
{
    "assetId": "0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d",
    "content": {
        "data": {
            "message": "Hello World!"
        },
        "idData": {
            "createdBy": "0x5f01d1318d88868d46c77c090543f3a3224f7bf1",
            "sequenceNumber": 0,
            "timestamp": 1735726210
        },
        "signature": "0x6e6e0299a56050183c8ab5d2677a633d441994de10f24aabc30da94454735e876307d5a75e362f287b11317bd9b88b9525f063594695771d1ed26ca55ad804901b"
    },
    "metadata": {
        "bundleId": "0xf099c53ada2e22a0e02a3f1b1d9d08c81131b66f79c59802482963b67eaafb33"
    }
}
```

### 2. Get event
In a similar way to get an event you need to do a GET query on `/assets/:assetId/events/:eventId`, where `assetId` is an id of the subject (an asset that is linked to the event) and `:eventId` is the id of the event itself. See cURL example below.

```sh
curl -X GET \
  'https://gateway-dev.ambrosus.com/assets/0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d/events/0x6c8cede43cdd276465f56e8d70f99b823019fbd77fd3844150f440587896009e'
```

The returned result is an event, and it looks like this:
```json
{
    "content": {
        "idData": {
            "accessLevel": 4,
            "assetId": "0x09cafe6985329c9c706b186a7f37e3ebbec4963508ae994690cb3de30b0ef26d",
            "createdBy": "0x5f01d1318d88868d46c77c090543f3a3224f7bf1",
            "dataHash": "0xcf1560e2190e205a0955ffecc253e0138de0e19a589ea0722f08f32331193d4a",
            "timestamp": 1503424923
        },
        "signature": "0xb21b194b78fd17bea7601df3edf1e40feaf57a984df897c56abebcfb1fcc4d1956bbbec52b07de569f1673a5abe09803ab99c9d0eb05d013f25232e4b9d7dd051b"
    },
    "eventId": "0x6c8cede43cdd276465f56e8d70f99b823019fbd77fd3844150f440587896009e",
    "metadata": {
        "bundleId": "0x2a17939c7e4696313774f1a047fa50d34688a3cc7ca4a0451bb889d02ec75ec4"
    }
}
```

## Writing data
To write data, you will need to have registered account within a node. For this tutorial, you can use user publically available test account. Test account address is `0x5f01d1318d88868d46c77c090543f3a3224f7bf1` and the secret is `0x7667f9f4bac24921e5e51fff87992cb268e23355aafbfe44e3c7ef343f3e837f`. It can only be used to create new accounts.


### 3. Create an asset
To create an asset with test account use following command.

```sh
curl -X POST \
  'https://gateway-dev.ambrosus.com/assets' \
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
  'https://gateway-dev.ambrosus.com/assets/<<assetId>>/events' \
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

