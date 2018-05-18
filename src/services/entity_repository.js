/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {pick} from '../utils/dict_utils';

export default class EntityRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  async initializeIndexes() {
    await this.db.collection('events').ensureIndex({'content.data.geoJson' : '2dsphere'});
  }

  async storeAsset(asset) {
    await this.db.collection('assets').insertOne({...asset});
  }

  async getAsset(assetId) {
    return await this.db.collection('assets').findOne({assetId}, {fields: this.blacklistedFields});
  }

  async storeEvent(event) {
    await this.db.collection('events').insertOne({...event});
  }

  async getEvent(eventId, accessLevel = 0) {
    const event = await this.db.collection('events').findOne({eventId}, {fields: this.blacklistedFields});
    return this.hideEventDataIfNecessary(event, accessLevel);
  }

  hideEventDataIfNecessary(event, accessLevel) {
    if (!event) {
      return null;
    }
    return event.content.idData.accessLevel <= accessLevel ? event : pick(event, 'content.data');
  }

  addToQuery(queryParts, part) {
    return [...queryParts, part];
  }

  composeQuery(queryParts) {
    if (queryParts.length === 0) {
      return {};
    }
    if (queryParts.length === 1) {
      return queryParts[0];
    }
    return {
      $and: queryParts
    };
  }

  assembleGeoQueryPart(value) {
    return {'content.data.geoJson': {$near: {
      $geometry: {
        type: 'Point',
        coordinates: [value.locationLongitude , value.locationLatitude]
      },
      $maxDistance: value.locationMaxDistance
    }}};
  }

  assembleDefaultQueryPart(key, value) {
    return {'content.data': {$elemMatch: {[key]: value}}};
  }

  addDataAccessLevelLimitationIfNeeded(queryParts, accessLevel) {
    const part = {'content.idData.accessLevel': {$lte: accessLevel}};
    if (queryParts.some((queryPart) => queryPart['content.idData.accessLevel'])) {
      return queryParts;
    }
    return this.addToQuery(queryParts, part);
  }

  getConfigurationForFindEventsByEntry(params, accessLevel) {
    let queryParts = [];
    let queryPart;
    if (params.data) {
      queryParts = this.addDataAccessLevelLimitationIfNeeded(queryParts, accessLevel);
    }
    for (const key in params.data) {
      switch (key) {
        case 'geoJson':
          queryPart = this.assembleGeoQueryPart(params.data[key]);
          break;
        default:
          queryPart = this.assembleDefaultQueryPart(key, params.data[key]);
          break;
      }

      queryParts = this.addToQuery(queryParts, queryPart);
    }
    return queryParts;
  }

  getConfigurationForFindEventsQuery(params, accessLevel = 0) {
    let queryParts = this.getConfigurationForFindEventsByEntry(params, accessLevel);
    if (params.assetId) {
      queryParts = this.addToQuery(queryParts, {'content.idData.assetId': params.assetId});
    }
    if (params.createdBy) {
      queryParts = this.addToQuery(queryParts, {'content.idData.createdBy': params.createdBy});
    }
    if (params.fromTimestamp) {
      queryParts = this.addToQuery(queryParts, {'content.idData.timestamp': {$gte: params.fromTimestamp}});
    }
    if (params.toTimestamp) {
      queryParts = this.addToQuery(queryParts, {'content.idData.timestamp': {$lte: params.toTimestamp}});
    }

    const pageSize = params.perPage || 100;
    const pageNumber = params.page || 0;
    const resultsToSkip = pageNumber * pageSize;

    const options = {
      skip: resultsToSkip,
      limit: pageSize,
      sort: [['content.idData.timestamp', 'descending']]
    };
    return {query: this.composeQuery(queryParts), options};
  }

  async findEvents(params, accessLevel = 0) {
    const {query, options} = this.getConfigurationForFindEventsQuery(params, accessLevel);
    const cursor = this.db
      .collection('events')
      .find(query, {
        ...options,
        fields: this.blacklistedFields
      })
      .map((event) => this.hideEventDataIfNecessary(event, accessLevel));
    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }

  async beginBundle(bundleStubId) {
    const notBundledQuery = {
      'metadata.bundleId': null,
      'repository.bundleStubId': null
    };

    const setBundleStubIdUpdate = {
      $set: {
        'repository.bundleStubId': bundleStubId
      }
    };

    await this.db.collection('assets').update(notBundledQuery, setBundleStubIdUpdate, {multi: true});
    await this.db.collection('events').update(notBundledQuery, setBundleStubIdUpdate, {multi: true});

    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const assets = await this.db
      .collection('assets')
      .find(thisBundleStubQuery, {fields: this.blacklistedFields})
      .toArray();
    const events = await this.db
      .collection('events')
      .find(thisBundleStubQuery, {fields: this.blacklistedFields})
      .toArray();
    return {
      assets,
      events
    };
  }

  orderedEntityIds(assets, events) {
    return [
      ...assets.map((asset) => ({type: 'asset', id: asset.assetId, timestamp: asset.content.idData.timestamp})),
      ...events.map((event) => ({type: 'event', id: event.eventId, timestamp: event.content.idData.timestamp}))
    ].sort((first, second) =>
      first.timestamp - second.timestamp ||
      first.type.localeCompare(second.type) || // asset < event
      first.id.localeCompare(second.id));
  }

  async updateEntities(entities, updateQuery) {
    const assetIds = entities.filter((ent) => ent.type === 'asset').map((asset) => asset.id);
    const eventIds = entities.filter((ent) => ent.type === 'event').map((event) => event.id);
    await this.db.collection('assets').update({
      assetId: {
        $in: assetIds
      }
    }, updateQuery, {multi: true});
    await this.db.collection('events').update({
      eventId: {
        $in: eventIds
      }
    }, updateQuery, {multi: true});
  }

  async setEntitiesBundles(entities, bundleId) {
    const update = {
      $set: {
        'metadata.bundleId': bundleId
      },
      $unset: {
        'repository.bundleStubId': ''
      }
    };
    await this.updateEntities(entities, update);
  }

  async unsetEntitiesBundlesStubs(entities) {
    const update = {
      $unset: {
        'repository.bundleStubId': ''
      }
    };
    await this.updateEntities(entities, update);
  }

  async endBundle(bundleStubId, bundleId, bundleSizeLimit) {
    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const assets = await this.db.collection('assets').find(thisBundleStubQuery)
      .toArray();
    const events = await this.db.collection('events').find(thisBundleStubQuery)
      .toArray();
    const entities = this.orderedEntityIds(assets, events);
    await this.setEntitiesBundles(entities.slice(0, bundleSizeLimit), bundleId);
    await this.unsetEntitiesBundlesStubs(entities.slice(bundleSizeLimit), bundleId);
  }

  async storeBundle(bundle) {
    await this.db.collection('bundles').insertOne({...bundle});
  }

  async storeBundleProofMetadata(bundleId, proofBlock, txHash) {
    await this.db.collection('bundles').update({bundleId}, {
      $set: {
        'metadata.bundleTransactionHash': txHash,
        'metadata.proofBlock': proofBlock
      }
    });

    const thisBundleQuery = {
      'metadata.bundleId': bundleId
    };

    const update = {
      $set: {
        'metadata.bundleTransactionHash': txHash
      }
    };

    await this.db.collection('assets').update(thisBundleQuery, update, {multi: true});
    await this.db.collection('events').update(thisBundleQuery, update, {multi: true});
  }

  async getBundle(bundleId) {
    return await this.db.collection('bundles').findOne({bundleId}, {fields: this.blacklistedFields});
  }
}
