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
}
