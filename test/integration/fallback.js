/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

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
    await expect(apparatus.request().get('/unknownpath')).to.be.eventually.rejected
      .and.have.property('status', 404);
    await expect(apparatus.request().post('/')).to.be.eventually.rejected
      .and.have.property('response')
      .and.have.deep.property('body', {reason: 'Not found: Unknown path, see API documentation at: https://dev.ambrosus.com/'});
    await expect(apparatus.request().delete('/')).to.be.eventually.rejected
      .and.have.property('response')
      .and.have.deep.property('body', {reason: 'Not found: Unknown path, see API documentation at: https://dev.ambrosus.com/'});
    await expect(apparatus.request().put('/')).to.be.eventually.rejected
      .and.have.property('response')
      .and.have.deep.property('body', {reason: 'Not found: Unknown path, see API documentation at: https://dev.ambrosus.com/'});
  });

  after(async () => {
    await apparatus.stop();
  });
});
