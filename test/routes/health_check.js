/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import ServerApparatus from '../helpers/server_apparatus';

const {expect} = chai;

describe('Health check tests', () => {
  let apparatus;

  beforeEach(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
  });

  afterEach(async () => {
    await apparatus.stop();
  });

  it('returns 200 if both MongoDb and web3 are connected', async () => {
    const response = await apparatus.request().get('/health');
    expect(response.status).to.eql(200);
  });

  it('returns 500 if MongoDb is not connected', async () => {
    await apparatus.dataModelEngine.mongoClient.close();

    await apparatus.request()
      .get('/health')
      .then((res) => {
        expect(res.body).to.eql({
          mongo: {connected: false},
          web3: {connected: true}
        });
        expect(res).to.have.status(500);
      });
  });

  it('returns 500 if web3 is not connected', async () => {
    // We can't close the connection to web3 because we're using ganache,
    // mocking is the second best option.
    const stub = sinon.stub(apparatus.web3.eth, 'getNodeInfo');
    stub.rejects('Error: Invalid JSON RPC response: ""');

    await apparatus.request()
      .get('/health')
      .then((res) => {
        expect(res.body).to.eql({
          mongo: {connected: true},
          web3: {connected: false}
        });
        expect(res).to.have.status(500);
      });
  });

  it('returns 500 if web3 or mongo are not connected', async () => {
    await apparatus.dataModelEngine.mongoClient.close();

    const stub = sinon.stub(apparatus.web3.eth, 'getNodeInfo');
    stub.rejects('Error: Invalid JSON RPC response: ""');

    await apparatus.request()
      .get('/health')
      .then((res) => {
        expect(res.body).to.eql({
          mongo: {connected: false},
          web3: {connected: false}
        });
        expect(res).to.have.status(500);
      });
  });
});
