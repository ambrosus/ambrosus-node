/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ServerApparatus, {apparatusScenarioProcessor} from '../helpers/server_apparatus';
import chaiHttp from 'chai-http';
import {pick, put} from '../../src/utils/dict_utils';
import {createFullAsset} from '../fixtures/assets_events';
import pkPair from '../fixtures/pk_pair';
import {adminAccountWithSecret, notRegisteredAccount, accountWithSecret} from '../fixtures/account';
import ScenarioBuilder from '../fixtures/scenario_builder';
import allPermissions from '../../src/utils/all_permissions';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Assets - Integrations', () => {
  let apparatus;
  let scenario;
  let adminAccount;
  let otherAccount;
  let otherAccountWithPermissions;

  before(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    adminAccount = await scenario.addAdminAccount(adminAccountWithSecret);
    otherAccountWithPermissions = await scenario.addAccount(0, accountWithSecret, {permissions: [allPermissions.createAsset]});
    otherAccount = await scenario.addAccount(0, notRegisteredAccount);
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

    it('returns 400 for invalid input (unexpected field)', async () => {
      const brokenAsset = put(asset, 'content.idData.foo', 'bar');
      const request = apparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenAsset);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });

    it('returns 400 for invalid input (timestamp not integer)', async () => {
      const brokenAsset = put(asset, 'content.idData.timestamp', 3.14);
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

    it('returns 403 for permission error (no `create_asset` permission)', async () => {
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
    let assetSet;
    beforeEach(async () => {
      assetSet = [
        await scenario.addAsset(0, {timestamp : 1}),
        await scenario.addAsset(1, {timestamp : 2}),
        await scenario.addAsset(0, {timestamp : 3}),
        await scenario.addAsset(1, {timestamp : 4}),
        await scenario.addAsset(0, {timestamp : 5}),
        await scenario.addAsset(1, {timestamp : 6})
      ];
    });

    it('find works', async () => {
      const response = await apparatus.request()
        .get('/assets')
        .send();
      expect(response.body.resultCount).to.equal(6);
      expect(response.body.results).to.deep.equal([...assetSet].reverse());
    });

    it('filters by createdBy', async () => {
      const response = await apparatus.request()
        .get(`/assets?createdBy=${otherAccountWithPermissions.address}`)
        .send();
      expect(response.body.resultCount).to.equal(3);
      expect(response.body.results).to.deep.equal([assetSet[5], assetSet[3], assetSet[1]]);
    });

    it('should apply paging', async () => {
      const page0Response = await apparatus.request()
        .get(`/assets?page=0&perPage=2`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      expect(page0Response.body.resultCount).to.equal(6);
      expect(page0Response.body.results).to.deep.equal([assetSet[5], assetSet[4]]);

      const page1Response = await apparatus.request()
        .get(`/assets?page=1&perPage=2`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
        .send();
      expect(page1Response.body.resultCount).to.equal(6);
      expect(page1Response.body.results).to.deep.equal([assetSet[3], assetSet[2]]);
    });

    it('should filter by timestamps', async () => {
      const response = await apparatus.request()
        .get(`/assets?fromTimestamp=2&toTimestamp=4`)
        .send();
      expect(response.body.resultCount).to.equal(3);
      expect(response.body.results).to.deep.equal([assetSet[3], assetSet[2], assetSet[1]]);
    });

    it('returns none if no assets in timestamp scope', async () => {
      const response = await apparatus.request()
        .get(`/assets?fromTimestamp=200`)
        .send();
      expect(response.body.resultCount).to.equal(0);
      expect(response.body.results).to.deep.equal([]);
    });

    describe('Find by identifiers', () => {
      beforeEach(async () => {
        await scenario.generateEvents(
          10,
          (inx) => ({
            accountInx: 0,
            subjectInx: inx % 6,
            fields: {
              timestamp: inx
            },
            data: [{
              type: 'ambrosus.event.identifiers',
              identifiers: {
                isbn: [(inx % 2).toString()],
                gs1: [(inx % 3).toString(), 'abcdef'.substring(0, inx % 6)]
              }
            }]
          })
        );
      });

      it('should find assets with identifiers', async () => {
        const response = await apparatus.request()
          .get(`/assets?identifier[isbn]=0`)
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send();
        expect(response.body.resultCount).to.equal(3);
        expect(response.body.results).to.deep.equal([assetSet[4], assetSet[2], assetSet[0]]);
      });

      it('should find with several identifiers', async () => {
        const response = await apparatus.request()
          .get(`/assets?identifier[isbn]=0&identifier[gs1]=2`)
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send();
        expect(response.body.resultCount).to.equal(1);
        expect(response.body.results).to.deep.equal([assetSet[2]]);
      });

      it('returns none if identifier not found', async () => {
        const response = await apparatus.request()
          .get(`/assets?identifier[foo]=0&identifier[gs1]=2`)
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send();
        expect(response.body.resultCount).to.equal(0);
        expect(response.body.results).to.deep.equal([]);
      });

      it('works with other queries', async () => {
        const response = await apparatus.request()
          .get(`/assets?identifier[isbn]=0&page=1&perPage=2`)
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send();
        expect(response.body.resultCount).to.equal(3);
        expect(response.body.results).to.deep.equal([assetSet[0]]);
      });

      it('can search by pattern', async () => {
        const response = await apparatus.request()
          .get(`/assets?identifier[gs1]=pattern(a?cd*)`)
          .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`)
          .send();
        expect(response.body.resultCount).to.equal(2);
        expect(response.body.results).to.deep.equal([assetSet[5], assetSet[4]]);
      });
    });
  });

  after(async () => {
    await apparatus.stop();
  });
});
