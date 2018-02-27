export default class EntityRepository {
  constructor(db) {
    this.db = db;
  }

  async storeAsset(asset) {
    await this.db.collection('assets').insertOne({...asset});
  }

  async getAsset(assetId) {
    return await this.db.collection('assets').findOne({assetId}, {fields: {_id: 0}});
  }

  async storeEvent(event) {
    await this.db.collection('event').insertOne({...event});
  }

  async getEvent(eventId) {
    return await this.db.collection('event').findOne({eventId}, {fields: {_id: 0}});
  }

  getConfigurationForFindEventsQuery(params) {
    let query = {};
    if (params.assetId) {
      query = this.addToQuery(query, {'content.idData.assetId' : params.assetId});
    }
    if (params.fromTimestamp) {
      query = this.addToQuery(query, {'content.idData.timestamp' : {$gte: params.fromTimestamp}});
    }
    if (params.toTimestamp) {
      query = this.addToQuery(query, {'content.idData.timestamp' : {$lte: params.toTimestamp}});
    }
    const options = {
      limit: 100,
      sort: [['content.idData.timestamp', 'descending']]
    };
    return {query, options};
  }

  addToQuery(query, part) {
    const queryLength = Object.keys(query).length;
    if (queryLength === 0) {
      return part;
    } 
    const and = queryLength === 1 ? [query] : query.$and;
    return {
      $and: [
        ...and,
        part
      ]
    };
  }

  async findEvents(params) {
    const {query, options} = this.getConfigurationForFindEventsQuery(params);

    const cursor = this.db
      .collection('event')
      .find(
        query,
        {
          ...options,
          fields: {_id: 0}
        }
      );

    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }
}
