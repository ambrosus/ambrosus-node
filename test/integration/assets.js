/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import chaiHttp from 'chai-http';

import {pick} from '../../src/utils/dict_utils';
import {createFullAsset} from '../fixtures/assets_events';
import pkPair from '../fixtures/pk_pair';
import {adminAccountWithSecret, notRegisteredAccount, accountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Assets - Integrations', () => {
  let apparatus;
  let scenario;
  let adminAccount;
  let otherAccount;

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    adminAccount = await scenario.addAdminAccount(adminAccountWithSecret);
    otherAccount = await scenario.addAccount(0, accountWithSecret);
  });

  describe('creating asset', () => {
    let asset = null;

    beforeEach(async () => {
      asset = createFullAsset(apparatus.identityManager, {createdBy: adminAccount.address}, adminAccount.secret);
    });

    it('works with valid input (client signed)', async () => {
      const response = await apparatus.request()
        .post('/assets')
        .send(asset);
      expect(response.status).to.eq(201);
      expect(response.body.content).to.deep.equal(asset.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedAsset = pick(asset, ['content.signature', 'assetId']);

      const response = await apparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${adminAccount.secret}`)
        .send(unsignedAsset);
      expect(response.status).to.eq(201);
      expect(response.body.content.idData).to.deep.equal(unsignedAsset.content.idData);
    });

    it('returns 400 for invalid input (missing required field)', async () => {
      const brokenAsset = pick(asset, 'content.idData.timestamp');
      const request = apparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenAsset);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('returns 400 when same asset added twice', async () => {
      await apparatus.request()
        .post('/assets')
        .send(asset);
      const request = apparatus.request()
        .post('/assets')
        .send(asset);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('returns 403 for authorisation error (user does not exist)', async () => {
      const failingAsset = createFullAsset(apparatus.identityManager, {createdBy: notRegisteredAccount.address}, notRegisteredAccount.secret);
      
      const request = apparatus.request()
        .post('/assets')
        .send(failingAsset);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });

    it('returns 403 for permission error (no `create_entity` permission)', async () => {
      const notPermittedAsset = createFullAsset(apparatus.identityManager, {createdBy: otherAccount.address},
        otherAccount.secret);

      const request = apparatus.request()
        .post('/assets')
        .send(notPermittedAsset);

      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 403);
    });
  });

  describe('fetching asset', () => {
    let asset;

    beforeEach(async () => {
      asset = await scenario.addAsset();
    });

    it('should get asset by id', async () => {
      const response = await apparatus.request()
        .get(`/assets/${asset.assetId}`);
      expect(response.body).to.deep.equal(asset);
    });

    it('should return 404 if asset with that id doesn\'t exist', async () => {
      const request = apparatus.request()
        .get(`/assets/nonexistingAsset`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('finding assets', () => {
    let asset;
    beforeEach(async () => {
      await scenario.addAsset(0, {timestamp : 1});
      await scenario.addAsset(0, {timestamp : 2});
      await scenario.addAsset(0, {timestamp : 3});
      await scenario.addAsset(0, {timestamp : 5});
      await scenario.addAsset(0, {timestamp : 6});

      asset = await scenario.addAsset(0, {timestamp : 4});
    });
    it('find works', async () => {
      const response = await apparatus.request()
        .get('/assets')
        .send();
      expect(response.body.resultCount).to.equal(6);
      expect(response.body.results[2]).to.deep.equal(asset);
    });
  });

  after(async () => {
    await apparatus.stop();
  });
});
