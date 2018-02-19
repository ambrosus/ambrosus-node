import chai from 'chai';
import AccountStore from '../../src/services/account_repository';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {accountWithSecret, account} from '../fixtures/account.js';
import {NotFoundError} from '../../src/errors/errors';
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
    const result = await accountStore.get(account.address);
    expect(result).to.deep.equal(account);
  });

  describe('permissions', () => {
    let address;
    let permissions;

    beforeEach(async () => {
      ([address, permissions] = ['0x1231', ['perm1', 'perm2']]);
      await db.collection('accounts').insertOne({address});
    });

    it('db round trip works', async () => {
      await accountStore.setPermissions(address, permissions);
      const result = await accountStore.getPermissions(address);
      expect(result).to.deep.eq(permissions);
    });

    it('setPermissions throws NotFoundError if add permission to unknown address', async () => {
      await expect(accountStore.setPermissions('0xabcde', permissions)).to.eventually.be.rejectedWith(NotFoundError);
    });

    it('getPermissions throws NotFoundError when remove permission from unknown address', async () => {
      await expect(accountStore.getPermissions('0xabcde')).to.eventually.be.rejectedWith(NotFoundError);
    });

    it('getPermission returns empty array if account has no permissions', async () => {
      const result = await accountStore.getPermissions(address);
      expect(result).to.deep.eq([]);
    });
  });

  afterEach(async () => {
    await cleanDatabase(db);
  });

  after(async () => {
    await client.close();
  });
});
