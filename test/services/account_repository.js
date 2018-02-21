import chai from 'chai';
import AccountStore from '../../src/services/account_repository';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {accountWithSecret, account} from '../fixtures/account.js';
const {expect} = chai;

describe('Account Store', () => {
  let client;
  let db;
  let accountStore;

  before(async () => {
    ({client, db} = await connectToMongo());
    accountStore = new AccountStore(db);
  });

  it('account round database trip', async () => {
    await accountStore.store(accountWithSecret);
    let result = await accountStore.get(account.address);
    expect(result).to.deep.equal(account);
    
    await accountStore.update(account.address, {timestamp: 7});
    result = await accountStore.get(account.address);
    expect(result).to.deep.equal({timestamp: 7, ...account});
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    await client.close();
  });
});
