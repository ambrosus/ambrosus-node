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
import pkPair from '../fixtures/pk_pair';

chai.use(chaiHttp);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Token - Integrations', async () => {
  const requestData = {
    validUntil: 1600000000000
  };

  const expectedToken = 'eyJpZERhdGEiOnsiY3JlYXRlZEJ5IjoiMHg3NDJFNjJDQzdBMTlFZjdEOWM0NDMwNkMwN0ZBZDU0QjViRjZkNGJFIiwidmFsaWRVbnRpbCI6MTYwMDAwMDAwMDAwMH0sInNpZ25hdHVyZSI6IjB4MDVmZDdmNGE2MDMyZTJjNmJiZGJkMTNmMTk0Mzg1NGE3NzcwODMwNTYwNDIzMTdlMjg1ZGZjZDMwNGI0MzFkZDU0OTU2OWY3MzRiYjAzNjhjNTM0YmM1YTI1MGYxYWE4OWUyYmY3Y2E0NzNjNTQ5ZDc2NmIyN2IxNjY0YWQwY2ExYyJ9';

  let apparatus;

  describe('With authorization with secret key enabled', async () => {
    before(async () => {
      apparatus = new ServerApparatus({authorizationWithSecretKeyEnabled: true});
      await apparatus.start();
    });

    beforeEach(async () => {
      await apparatus.cleanDB();
    });

    after(async () => {
      await apparatus.stop();
    });

    it('gets new token', async () => {
      await apparatus.request()
        .post('/token')
        .set('authorization', `AMB ${pkPair.secret}`)
        .send(requestData)
        .then((res) => {
          expect(res.body).to.deep.eq({
            token: expectedToken
          });
        });
    });

    it('does not allow to cache', async () => {
      const response = await apparatus.request()
        .post('/token')
        .set('authorization', `AMB ${pkPair.secret}`)
        .send(requestData);
      expect(response.headers['cache-control']).to.equal('no-store');
    });

    it('throws 401 if bad secret', async () => {
      await apparatus.request()
        .post('/token')
        .set('authorization', `AMB 0xxyz`)
        .send(requestData)
        .then((res) => {
          expect(res).to.have.status(401);
        });
    });

    it('throws 401 if no secret provided', async () => {
      await apparatus.request()
        .post('/token')
        .send(requestData)
        .then((res) => {
          expect(res).to.have.status(401);
        });
    });

    it('throws 400 if no `validUntil` provided', async () => {
      await apparatus.request()
        .post('/token')
        .set('authorization', `AMB ${pkPair.secret}`)
        .send({})
        .then((res) => {
          expect(res).to.have.status(400);
        });
    });

    it('ignores all fields other than `validUntil`', async () => {
      await apparatus.request()
        .post('/token')
        .set('authorization', `AMB ${pkPair.secret}`)
        .send({
          ...requestData,
          createdBy: '0x2331232131213123',
          one: 1
        })
        .then((res) => {
          expect(res.body).to.deep.eq({
            token: expectedToken
          });
        });
    });
  });

  describe('With authorization with secret key disabled', async () => {
    before(async () => {
      apparatus = new ServerApparatus({authorizationWithSecretKeyEnabled: false});
      await apparatus.start();
    });

    after(async () => {
      await apparatus.stop();
    });

    it('throws 403 if amb auth is disabled', async () => {
      await apparatus.request()
        .post('/token')
        .set('authorization', `AMB ${pkPair.secret}`)
        .send(requestData)
        .then((res) => {
          expect(res).to.have.status(403);
        });
    });
  });
});
