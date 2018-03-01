export default class EntityRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0, 
      'repository.bundleStubId': 0
    };
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

  async getEvent(eventId) {
    return await this.db.collection('events').findOne({eventId}, {fields: this.blacklistedFields});
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
          fields: this.blacklistedFields
        }
      );

    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }

  async startBundle() {
    return {
      bundleStubId: 0,
      assets: [],
      events: []
    };
  }

  async endBundle(bundleStubId, bundleId) {

  }

  async storeBundle(bundle) {
    await this.db.collection('bundles').insertOne({...bundle});
  }

  async getBundle(bundleId) {
    return await this.db.collection('bundles').findOne({bundleId}, {fields: this.blacklistedFields});
  }
}
