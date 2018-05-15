/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class Query {
  constructor() {
    this.queryParts = [];
  }

  add(part) {
    this.queryParts = [...this.queryParts, part];
  }

  compose() {
    if (this.queryParts.length === 0) {
      return {};
    }
    if (this.queryParts.length === 1) {
      return this.queryParts[0];
    }
    return {
      $and: this.queryParts
    };
  }
}

export class EventQuery extends Query {
  addDefaultPart(key, value) {
    this.add({'content.data': {$elemMatch: {[key]: value}}});
  }

  addGeoPart(value) {
    this.add({'content.data.geoJson': {$near: {
      $geometry: {
        type: 'Point',
        coordinates: [value.locationLongitude , value.locationLatitude]
      },
      $maxDistance: value.locationMaxDistance
    }}});
  }

  addDataAccessLevelLimitationIfNeeded(accessLevel) {
    if (!this.queryParts.some((queryPart) => queryPart['content.idData.accessLevel'] !== undefined)) {
      const part = {'content.idData.accessLevel': {$lte: accessLevel}};
      this.add(part);
    } else {
      this.queryParts.forEach((queryPart) => {
        if (queryPart['content.idData.accessLevel'] !== undefined &&
          queryPart['content.idData.accessLevel'].$lte > accessLevel) {
          queryPart['content.idData.accessLevel'].$lte = accessLevel;
        }
      });
    }
  }
}
