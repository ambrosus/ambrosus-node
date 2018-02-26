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
    const query = {};
    if (params.assetId) {
      query['content.idData.assetId'] = params.assetId;
    }
    if (params.toTimestamp && params.fromTimestamp) {
      query.$and = [{'content.idData.timestamp': {$gt : params.fromTimestamp}}, {'content.idData.timestamp': {$lt : params.toTimestamp}}];
    } else if (params.fromTimestamp) {
      query['content.idData.timestamp'] = {$gt : params.fromTimestamp};
    } else if (params.toTimestamp) {
      query['content.idData.timestamp'] = {$lt : params.toTimestamp};
    }
    const options = {
      limit: 100,
      sort: [['content.idData.timestamp', 'descending']]
    };
    return {query, options};
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
