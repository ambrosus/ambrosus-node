export default class AccountRepository {
  constructor(db) {
    this.db = db;
  }

  /* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^secret$" }]*/
  async store(account) {
    const {address} = account;
    await this.db.collection('accounts').updateOne({address}, {$set : {...account}}, {upsert : true});
  }

  async update(address, changedParams) {
    await this.db.collection('accounts').updateOne({address}, {$set : {...changedParams}});
    return await this.db.collection('accounts').findOne({address}, {fields: {_id: 0}});
  }

  async get(address) {
    return this.db.collection('accounts').findOne({address}, {fields: {_id: 0}});
  }
}
