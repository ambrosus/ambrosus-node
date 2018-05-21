/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import {put} from '../../src/utils/dict_utils';
import {account, adminAccountWithSecret, notRegisteredAccount} from '../fixtures/account';
import FindAccountQueryObjectFactory, {FindAccountQueryObject} from '../../src/services/find_account_query_object';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;



describe('Find Account Query Object', () => {
  let db;
  let client;
  let findAccountQueryObjectFactory;
  let findAccountQueryObject;
  let accounts;

  before(async () => {
    ({db, client} = await connectToMongo());
    accounts = [put(account, {registeredBy: '0x123', registeredOn: 1, permissions: ['perm1', 'perm2']}),
      put(notRegisteredAccount, {registeredBy: '0x123', registeredOn: 4, permissions: ['perm1', 'perm2']}),
      put(adminAccountWithSecret, {registeredBy: '0x123', permissions: ['perm1']})];
    await db.collection('accounts').insertOne({...accounts[0]});
    await db.collection('accounts').insertOne({...accounts[1]});
    await db.collection('accounts').insertOne({...accounts[2]});
    findAccountQueryObjectFactory = new FindAccountQueryObjectFactory(db);
    findAccountQueryObject = findAccountQueryObjectFactory.create();
  });

  after(async () => {
    await cleanDatabase(db);
    client.close();
  });

  it('is created by FindAccountQueryObjectFactory', () => {
    expect(findAccountQueryObject instanceof FindAccountQueryObject).to.be.true;
  });

  it('has default sorting key', () => {
    expect(findAccountQueryObject.getSortingKey()).to.be.deep.equal([['registeredOn', 'descending']]);
  });

  it('executed returns accounts sorted by registration time', async () => {
    const found = await findAccountQueryObject.execute();
    expect(found.results).to.deep.equal([accounts[1],accounts[0],accounts[2]]);
    expect(found.resultCount).to.equal(3);
  });
});
