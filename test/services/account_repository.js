import chai from 'chai';
import AccountStore from '../../src/services/account_repository';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {accountWithSecret, account} from '../fixtures/account.js';
import {put} from '../../src/utils/dict_utils';
const {expect} = chai;

describe('Account Repository', () => {
  let client;
  let db;
  let accountStore;

  before(async () => {
    ({client, db} = await connectToMongo());
    accountStore = new AccountStore(db);
  });

  it('account round database trip', async () => {
    let accountToStore = accountWithSecret;
    accountToStore = put(accountToStore, {createdBy : '0x123', permissions : ['perm1', 'perm2']});

    let accountToReceive = account;
    accountToReceive = put(accountToReceive, {createdBy : '0x123', permissions : ['perm1', 'perm2']});

    await accountStore.store(accountToStore);
    const result = await accountStore.get(accountToStore.address);
    expect(result).to.deep.equal(accountToReceive);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    await client.close();
  });
});
