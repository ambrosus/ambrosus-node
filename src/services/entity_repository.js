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
    await this.db.collection('events').insertOne({...event});
  }

  async getEvent(eventId) {
    return await this.db.collection('events').findOne({eventId}, {fields: {_id: 0}});
  }

  getConfigurationForFindEventsQuery(params) {
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
    const {query, options} = this.getConfigurationForFindEventsQuery(params);

    const cursor = this.db
      .collection('events')
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

  async getAssetsWithoutBundle() {
    const cursor = this.db
      .collection('assets')
      .find(
        {
          'metadata.bundleId': null
        },
        {
          fields: {_id: 0}
        });
    return cursor.toArray();
  }

  async getEventsWithoutBundle() {
    const cursor = this.db
      .collection('events')
      .find(
        {
          'metadata.bundleId': null
        },
        {
          fields: {_id: 0}
        });
    return cursor.toArray();
  }
}
