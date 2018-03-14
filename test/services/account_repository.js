import chai from 'chai';
import AccountStore from '../../src/services/account_repository';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {accountWithSecret, account} from '../fixtures/account.js';
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
    const additionalFields = {createdBy : '0x123', permissions : ['perm1', 'perm2']};
    const accountToStore = put(accountWithSecret, additionalFields);
    const accountToReceive = put(account, additionalFields);

    await accountStore.store(accountToStore);
    const result = await accountStore.get(accountToStore.address);
    expect(result).to.deep.equal(accountToReceive);
  });

  it('account modification in database', async () => {
    const additionalFields = {createdBy : '0x123', permissions : ['perm1', 'perm2']};
    const accountToStore = put(accountWithSecret, additionalFields);

    const changedParams = {permissions : ['perm100', 'perm200']};

    const accountToReceive = pick(put(accountToStore, changedParams), 'secret');

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
