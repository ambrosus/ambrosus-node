export default class AccountRepository {
  constructor(db) {
    this.db = db;
  }

  /* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^secret$" }]*/
  async store(account) {
    const {secret, ...accountWithoutSecret} = account;
    await this.db.collection('accounts').insertOne(accountWithoutSecret);
  }

  async update(account) {
    const {address} = account;
    await this.db.collection('accounts').updateOne({address}, {$set : {permissions : account.permissions}});
  }

  async get(address) {
    return this.db.collection('accounts').findOne({address}, {fields: {_id: 0}});
  }

  async count() {
    return this.db.collection('accounts').count();
  }  
}
