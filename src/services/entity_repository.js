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

  async findEvents() {
    const cursor = this.db
      .collection('event')
      .find(
        {},
        {
          fields: {_id: 0},
          limit: 100,
          sort: [['content.idData.timestamp', 'descending']]
        });

    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }
}
