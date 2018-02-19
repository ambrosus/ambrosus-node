import {NotFoundError} from '../errors/errors';

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

  async setPermissions(address, permissions) {
    const result = await this.db.collection('accounts')
      .findOneAndUpdate({address}, {$set: {permissions}});
    if (!result.value) {
      throw new NotFoundError(`User with address ${address} not found`);
    }
  }

  async getPermissions(address) {
    const record = await this.get(address);
    if (!record) {
      throw new NotFoundError(`User with address ${address} not found`);
    }
    if (!record.permissions) {
      return [];
    }
    return record.permissions;
  }
}
