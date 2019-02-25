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

describe('Nodeinfo - Integrations', async () => {
  const gitCommit = 'aaaaaaa';
  let apparatus;

  before(async () => {
    apparatus = new ServerApparatus({gitCommit});
    await apparatus.start(null);
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
  });

  it('should return npm version, git commit and address', async () => {
    const nodeinfo = await apparatus.request().get('/nodeinfo');
    expect(nodeinfo.body.commit).to.eql(gitCommit);
    expect(nodeinfo.body.version).to.match(/^\d+\.\d+\.\d+$/);
    expect(nodeinfo.body.nodeAddress).to.be.properAddress;
  });

  after(async () => {
    await apparatus.stop();
  });
});
