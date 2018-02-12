import chai from 'chai';
import AccountStore from '../../src/services/account_storage';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';

const {expect} = chai;


describe('Account Store', () => {
  let client;
  let db;
  let accountStore;

  before(async () => {
    ({client, db} = await connectToMongo());
    accountStore = new AccountStore(db);
  });

  it('should compute signature', async () => {
    const account = {
      address: '0xcb330742f75cceb58f585cA8DFD95a476AB5D616',
      secret: '0xcb330742f75cceb58f585cA8DFD95a476AB5D616f585cA8DFD95a476AB5D616'
    };    
    await accountStore.store(account);
    const result = await accountStore.get(account.address);
    expect(result).to.deep.equal(account);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    await client.close();
  });
});
