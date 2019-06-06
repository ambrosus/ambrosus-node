/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import FindAccountQueryObjectFactory, {FindAccountQueryObject} from '../../src/services/find_account_query_object';
import ScenarioBuilder from '../fixtures/scenario_builder';
import IdentityManager from '../../src/services/identity_manager';
import {createWeb3} from '../../src/utils/web3_tools';
import {adminAccountWithSecret} from '../fixtures/account';
import AccountRepository from '../../src/services/account_repository';
import config from '../../src/config/config';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;



describe('Find Account Query Object', () => {
  let db;
  let client;
  let findAccountQueryObjectFactory;
  let findAccountQueryObject;
  let scenario;
  let storage;

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new AccountRepository(db);
    scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
    await scenario.addAdminAccount(adminAccountWithSecret);
    await scenario.addAccount(0, null,
      {registeredBy: '0x123', registeredOn: 1, permissions: ['perm1', 'perm2'], accessLevel: 1});
    await scenario.addAccount(1, null,
      {registeredBy: '0xabc', registeredOn: 4, permissions: ['perm1', 'perm2'], accessLevel: 2});
    await scenario.addAccount(0, null, {registeredBy: '0x123', permissions: ['perm1'], accessLevel: 3});
    await Promise.all(scenario.accounts.slice(1).map((account) => storage.store(account)));
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
    expect(found.results)
      .to.deep.equal([scenario.accounts[2], scenario.accounts[1], scenario.accounts[3]]);
    expect(found.resultCount).to.equal(3);
  });

  it('when given accessLevel, returns accounts with accessLevel greater or equal then provided', async () => {
    findAccountQueryObjectFactory = new FindAccountQueryObjectFactory(db);
    findAccountQueryObject = findAccountQueryObjectFactory.create({accessLevel: 2});
    const found = await findAccountQueryObject.execute();
    expect(found.results)
      .to.deep.equal([scenario.accounts[2], scenario.accounts[3]]);
    expect(found.resultCount).to.equal(2);
  });

  it('when given registeredBy, returns accounts registered by this address', async () => {
    findAccountQueryObjectFactory = new FindAccountQueryObjectFactory(db);
    findAccountQueryObject = findAccountQueryObjectFactory.create({registeredBy: '0x123'});
    const found = await findAccountQueryObject.execute();
    expect(found.results)
      .to.deep.equal([scenario.accounts[1], scenario.accounts[3]]);
    expect(found.resultCount).to.equal(2);
  });

  it('when given page and perPage, returns requested number of accounts from requested page', async () => {
    findAccountQueryObjectFactory = new FindAccountQueryObjectFactory(db);
    findAccountQueryObject = findAccountQueryObjectFactory.create({perPage: 1, page: 1});
    const found = await findAccountQueryObject.execute();
    expect(found.results)
      .to.deep.equal([scenario.accounts[1]]);
    expect(found.resultCount).to.equal(3);
  });
});
