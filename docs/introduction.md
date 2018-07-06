#  Introduction to ambrosus

## Basic constructs

Ambrosus uses two core entities to model supply chain: assets and events. There is also the notion of a bundle explained later. You will see JSON is used widely to store and transfer entities.

### Assets
An asset is primary element moving through a supply chain. It can represent an ingredient, product, package of products or any other type of container.

Example asset could look like this:
```json
{
  "assetId": "0xc5cfd04...30755ed65",
  "content": {
    "signature": "0x30755ed65396facf86c53e6...65c5cfd04be400",
    "idData": {
      "createdBy": "0x162a44701727a31f457a53801cd181cd38eb5bbd",
      "timestamp": 1503424923,
      "sequenceNumber": 0
    }
  }
}
```

`assetId` is unique asset identifier. `idData` stores all data crucial to the digital identity of the asset. In particular `timestamp` stores information about the time when it was created (as UNIX timestamp) and `createdBy` stores id of a creator of the asset. Field `signature` authenticates the identity of the creator. We dig deeper into what every single field means later in this chapter. The image below shows the basic structure of an asset.

![Asset structure](asset.png?raw=true "Asset structure")

### Events
An event describes something that happened in a supply chain. Typical events are connected to producing, verification and delivery of assets, however it is possible to define custom events. Each event is associated with exactly one asset by the subject field.

Example event could look like this:
```json
{
    "eventId": "0xc5cfd04.....30755ed65",
    "content": {
        "signature": "0x30755ed65396facf86c53e6...65c5cfd04be400",
        "idData": {
            "assetId": "0xc5cfd04.....30755ed65",
            "createdBy": "0x162a44701727a31f457a53801cd181cd38eb5bbd",
            "accessLevel": 4,
            "timestamp": 1503424923,
            "dataHash": "0x01cd181cd38eb5bbd162a44701727a31f457a538"
        },
        "data": {
          "..."
        }
    }
}
```

Meaning of the fields is analogous to those in assets. Additionally, we have the `data` object, which can hold all the descriptive details about an event (e.g., type, context, location and more). `accessLevel` is used to define permissions. `dataHash` is hash of serialized `data` field. The image below shows the basic structure of an event.

![Asset structure](event.png?raw=true "Asset structure")

### Bundles
Multiple entities (assets and events) are packed into bundles. The proof of the bundle is stored in a smart contract deployed to the blockchain.

Example bundle look like this:
```json
{
  "bundleId": "<hash (content addressable) calculated from contents field>",
  "content": {
    "signature": "<elliptic curve signature of the idData field>",
    "idData": {
      "createdBy": "<address (public key derived) of vendor holding data>",
      "timestamp": "<unix epoch timestamp>",
      "entriesHash": "<hash calculated from the entries field>"
    },
    "entries": [
      "<asset and events stubs>"
    ]
  },
  "metadata": {}
}
```

Bundles are mainly used for backward verification of entities and node syncing.

## Basic principles: 

### Immutability, permanence and persistence
All entities are immutable and are permanent. You will not find any update or delete calls.

Note that permanence is not the same thing as persistence. Permanence is related to content-addressing, meaning an object's identity (name/id/address) will always be the same. Permanent supply chain data means linking between entities with permanent ids. Ids are always the same, and thus the links won't break.

Persistence is a property we are aiming to achieve in future releases.

### Id
Ids of entities are strings with a hex value. Entities are content-addressable, meaning that their id depends on the content. There is only one valid id per content and if content changes the id changes as well. Technically id is keccak-256 hash of a serialized content object.

### Signatures
Content of the proper entity is signed by the creator. `createdBy` stores information about who creator is in form of ethereum compatible address. Signature is ethereum compatible signature with private key.

## Permissions
All `idData` of every entity is always publicly available. Entity creator can however define `accessLevel`, required to access `data` field. 
 * If access level equals `0` it means entity `data` is publicly available.
 * If access level is greater than `0` it means entity `data` is only available to users registered with given node and with adequate `accessLevel` (e.g.m you need to have permission level 3 to access data on `accessLevel` 1, 2, 3).

## What is next?

Go to step-by-step [tutorial](https://github.com/ambrosus/ambrosus-node/blob/master/docs/tutorial.md).

Alternatively, visit [ambrosus.docs.apiary.io](https://ambrosus.docs.apiary.io/) for full API documentation.
