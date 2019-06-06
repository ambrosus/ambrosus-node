/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import AccountStore from '../../src/services/account_repository';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {put} from '../../src/utils/dict_utils';
import {account} from '../fixtures/account';
import config from '../../src/config/config';

const {expect} = chai;

describe('Account Repository', () => {
  let client;
  let db;
  let accountStore;

  before(async () => {
    ({client, db} = await connectToMongo(config));
    accountStore = new AccountStore(db);
  });

  it('account round database trip', async () => {
    const additionalFields = {registeredBy: '0x123', permissions: ['perm1', 'perm2']};
    const accountToStore = put(account, additionalFields);

    await accountStore.store(accountToStore);
    const result = await accountStore.get(account.address);
    expect(result).to.deep.equal(accountToStore);
  });

  it('does not allow to register the same account twice', async () => {
    const additionalFields = {registeredBy: '0x123', permissions: ['perm1', 'perm2']};
    const accountToStore = put(account, additionalFields);

    await accountStore.store(account);
    await accountStore.store(accountToStore);

    const count = await db.collection('accounts')
      .find({address: accountToStore.address})
      .count();

    expect(count).to.equal(1);
  });

  it('account modification in database', async () => {
    const someParams = {registeredBy: '0x123', permissions: ['perm1', 'perm2']};
    const accountToStore = put(account, someParams);

    const changedParams = {permissions: ['perm100', 'perm200']};
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
