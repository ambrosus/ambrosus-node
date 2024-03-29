/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import {properAddress, properSecret} from '../helpers/web3chai';
import ServerApparatus, {apparatusScenarioProcessor} from '../helpers/server_apparatus';
import {adminAccountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {Role} from '../../src/services/roles_repository';

chai.use(chaiHttp);
chai.use(chaiAsPromised);
chai.use(properAddress);
chai.use(properSecret);

const {expect} = chai;

describe('Atlas node endpoints availability - Integrations', async () => {
  let apparatus;
  let scenario;

  before(async () => {
    apparatus = new ServerApparatus({}, Role.ATLAS);
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    await scenario.addAdminAccount(adminAccountWithSecret);
  });

  describe('Available routes', () => {
    it('nodeinfo', async () => {
      const pendingRequest = apparatus.request()
        .get('/nodeinfo')
        .send();
      await expect(pendingRequest)
        .to.eventually.be.fulfilled;
    });

    it('health', async () => {
      const pendingRequest = apparatus.request()
        .get('/health')
        .send();
      await expect(pendingRequest)
        .to.eventually.be.fulfilled;
    });

    it('metrics', async () => {
      const pendingRequest = apparatus.request()
        .get('/metrics')
        .send();
      await expect(pendingRequest)
        .to.eventually.be.fulfilled;
    });

    it('assets', async () => {
      await apparatus.request()
        .get('/assets/0x123abcde')
        .then((res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.deep.equal({reason: 'Not found: No asset with id = 0x123abcde found'});
        });
    });

    it('events', async () => {
      await apparatus.request()
        .get('/events/0x123defe')
        .then((res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.deep.equal({reason: 'Not found: No event with id = 0x123defe found'});
        });
    });

    it('bundle', async () => {
      await apparatus.request()
        .get('/bundle/0x123')
        .then((res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.deep.equal({reason: 'Not found: No bundle with id = 0x123 found'});
        });
    });
  });

  describe('Unavailable routes', () => {
    it('accounts', async () => {
      await apparatus.request()
        .get('/accounts')
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });

    it('token', async () => {
      await apparatus.request()
        .get('/token')
        .then((res) => {
          expect(res).to.have.status(404);
        });
    });
  });

  after(async () => {
    await apparatus.stop();
  });
});
