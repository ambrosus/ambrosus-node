import chai from 'chai';
import AccountStore from '../../src/services/account_repository';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {account} from '../fixtures/account.js';
import {put, pick} from '../../src/utils/dict_utils';
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
    const additionalFields = {registeredBy : '0x123', permissions : ['perm1', 'perm2']};
    let accountToStore = put(account, additionalFields);

    await accountStore.store(accountToStore);
    accountToStore = pick(accountToStore, '_id');
    const result = await accountStore.get(account.address);
    expect(result).to.deep.equal(accountToStore);
  });

  it('account modification in database', async () => {
    const someParams = {registeredBy : '0x123', permissions : ['perm1', 'perm2']};
    const accountToStore = put(account, someParams);

    const changedParams = {permissions : ['perm100', 'perm200']};
    const accountToReceive = put(accountToStore, changedParams);

    await accountStore.store(accountToStore);
    const result = await accountStore.update(accountToStore.address, changedParams);
    expect(result).to.deep.equal(accountToReceive);
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    await client.close();
  });
});
