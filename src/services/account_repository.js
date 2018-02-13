export default class AccountRepository {
  constructor(db) {
    this.db = db;
  }
  
  async store(account) {
    await this.db.collection('accounts').insertOne({...account});
  }

  async get(address) {
    return await this.db.collection('accounts').findOne({address}, {fields: {_id: 0}});
  }
}
