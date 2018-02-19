export default class AccountRepository {
  constructor(db) {
    this.db = db;
  }

  /* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^secret$" }]*/
  async store(account) {    
    const {secret, ...accountWithoutSecret} = account;
    await this.db.collection('accounts').insertOne(accountWithoutSecret);
  }

  async get(address) {
    return this.db.collection('accounts').findOne({address}, {fields: {_id: 0}});
  }

  async count() {
    return this.db.collection('accounts').count();
  }  
}
