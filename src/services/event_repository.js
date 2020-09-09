/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class EventRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }

  async storeEvent(event) {
    if (await this.db.collection('events').findOne({eventId: event.eventId}) === null) {
      await this.db.collection('events').insertOne(event);

      console.log(`storeEvent(${event.eventId}): stored`);
    } else {
      console.log(`storeEvent(${event.eventId}): already stored`);
    }
  }

  async getEvent(eventId) {
    await this.db.collection('events').findOne({eventId});
  }
}
