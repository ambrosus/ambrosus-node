/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import QueryBuilder from './query_builder';
import {pick} from '../utils/dict_utils';

export default class EventQueryObject {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  addDefaultPart(key, value) {
    this.queryBuilder.add({'content.data': {$elemMatch: {[key]: value}}});
  }

  addGeoPart(value) {
    this.queryBuilder.add({'content.data.geoJson': {$near: {
      $geometry: {
        type: 'Point',
        coordinates: [value.locationLongitude , value.locationLatitude]
      },
      $maxDistance: value.locationMaxDistance
    }}});
  }

  addDataAccessLevelLimitationIfNeeded(accessLevel) {
    if (!this.queryBuilder.queryParts.some((queryPart) => queryPart['content.idData.accessLevel'] !== undefined)) {
      const part = {'content.idData.accessLevel': {$lte: accessLevel}};
      this.queryBuilder.add(part);
    } else {
      this.queryBuilder.queryParts.forEach((queryPart) => {
        if (queryPart['content.idData.accessLevel'] !== undefined &&
          queryPart['content.idData.accessLevel'].$lte > accessLevel) {
          queryPart['content.idData.accessLevel'].$lte = accessLevel;
        }
      });
    }
  }

  hideEventDataIfNecessary(event, accessLevel) {
    if (!event) {
      return null;
    }
    return event.content.idData.accessLevel <= accessLevel ? event : pick(event, 'content.data');
  }

  assembleConfigurationForFindEventsQuery(params, accessLevel = 0) {
    this.queryBuilder = new QueryBuilder();

    if (params.data) {
      this.addDataAccessLevelLimitationIfNeeded(accessLevel);
    }
    for (const key in params.data) {
      switch (key) {
        case 'geoJson':
          this.addGeoPart(params.data[key]);
          break;
        default:
          this.addDefaultPart(key, params.data[key]);
          break;
      }
    }
    if (params.assetId) {
      this.queryBuilder.add({'content.idData.assetId': params.assetId});
    }
    if (params.createdBy) {
      this.queryBuilder.add({'content.idData.createdBy': params.createdBy});
    }
    if (params.fromTimestamp) {
      this.queryBuilder.add({'content.idData.timestamp': {$gte: params.fromTimestamp}});
    }
    if (params.toTimestamp) {
      this.queryBuilder.add({'content.idData.timestamp': {$lte: params.toTimestamp}});
    }

    return this.queryBuilder.compose();
  }

  assembleOptionsForEventsQuery(params) {
    const pageSize = params.perPage || 100;
    const pageNumber = params.page || 0;
    const resultsToSkip = pageNumber * pageSize;

    const options = {
      skip: resultsToSkip,
      limit: pageSize,
      sort: [['content.idData.timestamp', 'descending']],
      fields: this.blacklistedFields
    };
    return options;
  }

  async find(params, accessLevel = 0) {
    const query = this.assembleConfigurationForFindEventsQuery(params, accessLevel);
    const options = this.assembleOptionsForEventsQuery(params);

    const cursor = this.db
      .collection('events')
      .find(query, options)
      .map((event) => this.hideEventDataIfNecessary(event, accessLevel));
      
    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }
}
