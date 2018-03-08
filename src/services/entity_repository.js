export default class EntityRepository {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
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
    let query = {};
    if (params.assetId) {
      query = this.addToQuery(query, {'content.idData.assetId': params.assetId});
    }
    if (params.fromTimestamp) {
      query = this.addToQuery(query, {'content.idData.timestamp': {$gte: params.fromTimestamp}});
    }
    if (params.toTimestamp) {
      query = this.addToQuery(query, {'content.idData.timestamp': {$lte: params.toTimestamp}});
    }
    
    const pageSize = params.perPage || 100;
    const pageNumber = params.page || 0;
    const resultsToSkip = pageNumber * pageSize;

    const options = {
      skip: resultsToSkip,
      limit: pageSize,
      sort: [['content.idData.timestamp', 'descending']]
    };
    return {query, options};
  }

  addToQuery(query, part) {
    const queryLength = Object.keys(query).length;
    if (queryLength === 0) {
      return part;
    }
    const conjunction = query.$and || [query];
    return {
      $and: [
        ...conjunction,
        part
      ]
    };
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

  async beginBundle(bundleStubId) {
    const notBundledQuery = {
      'metadata.bundleId': null,
      'repository.bundleStubId': null
    };

    const setBundleStubIdUpdate = {
      $set: {
        'repository.bundleStubId': bundleStubId
      }
    };

    await this.db.collection('assets').update(notBundledQuery, setBundleStubIdUpdate, {multi: true});
    await this.db.collection('events').update(notBundledQuery, setBundleStubIdUpdate, {multi: true});

    const thisBundleStubQuery = {
      'repository.bundleStubId': bundleStubId
    };

    const assets = await this.db
      .collection('assets')
      .find(
        thisBundleStubQuery,
        {fields: this.blacklistedFields})
      .toArray();
    const events = await this.db
      .collection('events')
      .find(
        thisBundleStubQuery,
        {fields: this.blacklistedFields})
      .toArray();

    return {
      assets,
      events
    };
  }

  async endBundle(bundleStubId, bundleId) {
    const thisBundleStubQuery = {      
      'repository.bundleStubId': bundleStubId
    };

    const update = {
      $set: {
        'metadata.bundleId': bundleId
      },
      $unset: {
        'repository.bundleStubId': ''
      }
    };

    await this.db.collection('assets').update(thisBundleStubQuery, update, {multi: true});
    await this.db.collection('events').update(thisBundleStubQuery, update, {multi: true});
  }

  async storeBundle(bundle) {
    await this.db.collection('bundles').insertOne({...bundle});
  }

  async getBundle(bundleId) {
    return await this.db.collection('bundles').findOne({bundleId}, {fields: this.blacklistedFields});
  }
}
