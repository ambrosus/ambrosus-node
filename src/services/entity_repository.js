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

  constructConfigurationForFindEventsQuery(params) {
    const query = {};
    if (params.assetId) {
      query['content.idData.assetId'] = params.assetId;
    }
    const options = {
      limit: 100,
      sort: [['content.idData.timestamp', 'descending']]
    };
    return {query, options};
  }

  async findEvents(params) {
    const {query, options} = this.constructConfigurationForFindEventsQuery(params);

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
