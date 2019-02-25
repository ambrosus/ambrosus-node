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
import pkPair from '../fixtures/pk_pair';

chai.use(chaiHttp);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('CORS - Integrations', async () => {
  const requestData = {
    validUntil: 1700000000000
  };

  let apparatus;

  before(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
  });

  it('Adds the Access-Control-Allow-Origin response header matching the Origin', async () => {
    const response = await apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`)
      .set('origin', 'example.com')
      .send(requestData);
    expect(response.header).to.have.property('access-control-allow-origin');
    expect(response.header['access-control-allow-origin']).to.equal('example.com');
  });

  it('Does nothing if the Origin request header is missing', async () => {
    const response = await apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`)
      .send(requestData);
    expect(response.header).to.not.have.property('access-control-allow-origin');
  });

  afterEach(async () => {
    await apparatus.cleanDB();
  });

  after(async () => {
    await apparatus.stop();
  });
});
