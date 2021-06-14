/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import ServerApparatus from '../helpers/server_apparatus';
import {properAddress} from '../helpers/web3chai';

chai.use(properAddress);
chai.use(chaiHttp);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Fallback - Integrations', async () => {
  let apparatus;

  before(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start(null);
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
  });

  it('should throw 404 with link to API docs on unknown paths', async () => {
    const notFoundBody = {reason: 'Not found: Unknown path, see API documentation at: https://dev.ambrosus.io/'};
    expect(await apparatus.request().get('/unknownpath')).to.have.status(404);
    expect((await apparatus.request().post('/')).body).to.deep.equal(notFoundBody);
    expect((await apparatus.request().delete('/')).body).to.deep.equal(notFoundBody);
    expect((await apparatus.request().put('/')).body).to.deep.equal(notFoundBody);
  });

  after(async () => {
    await apparatus.stop();
  });
});
