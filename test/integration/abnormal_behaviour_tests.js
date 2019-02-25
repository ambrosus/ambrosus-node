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
import pkPair from '../fixtures/pk_pair';

chai.use(properAddress);
chai.use(chaiHttp);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Abnormal behaviour tests', async () => {
  let apparatus;
  const requestBody =  '{"validUntil": 1700000000000}';
  const tooLargeBody = '{"validUntil": 17000000000000}';

  before(async () => {
    apparatus = new ServerApparatus({requestSizeLimit: requestBody.length});
    await apparatus.start();
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
  });

  describe('Request size limiter', () => {
    it('should not accept requests bigger than requestSizeLimit', async () => {
      const request = apparatus.request()
        .post('/token')
        .set('authorization', `AMB ${pkPair.secret}`)
        .type('json')
        .send(tooLargeBody);
      await expect(request).to.be.eventually.rejected.and.have.property('status', 413);
    });

    it('should accept requests under requestSizeLimit', async () => {
      const request = apparatus.request()
        .post('/token')
        .set('authorization', `AMB ${pkPair.secret}`)
        .type('json')
        .send(requestBody);
      await expect(request).to.be.eventually.fulfilled;
    });
  });

  it('should return 400 when invalid json format has been passed', async () => {
    const request = apparatus.request()
      .post('/token')
      .set('authorization', `AMB ${pkPair.secret}`)
      .type('json')
      .send('Definitely not JSON');
    await expect(request).to.be.eventually.rejected.and.have.property('status', 400);
  });

  after(async () => {
    await apparatus.stop();
  });
});
