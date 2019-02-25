/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ServerApparatus, {apparatusScenarioProcessor} from '../../helpers/server_apparatus';
import chaiHttp from 'chai-http';

import {accountWithSecret, adminAccountWithSecret, notRegisteredAccount} from '../../fixtures/account';
import ScenarioBuilder from '../../fixtures/scenario_builder';
import {createFullEvent} from '../../fixtures/assets_events';
import {pick, put} from '../../../src/utils/dict_utils';
import pkPair from '../../fixtures/pk_pair';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Events Integrations: Create', () => {
  let apparatus;
  let scenario;
  let event;
  let asset;
  let adminAccount;
  let otherAccount;

  before(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    adminAccount = await scenario.addAdminAccount(adminAccountWithSecret);
    otherAccount = await scenario.addAccount(0, accountWithSecret);
    asset = await scenario.addAsset(0);
    event = createFullEvent(apparatus.identityManager, {
      createdBy: adminAccount.address,
      assetId: asset.assetId
    }, undefined, adminAccount.secret);
  });

  it('works with valid input (client signed)', async () => {
    const response = await apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .send(event);
    expect(response.status).to.eq(201);
    expect(response.body.content).to.deep.equal(event.content);
  });

  it('works with valid input (server signed)', async () => {
    const unsignedEvent = pick(event, ['content.signature', 'assetId']);
    const response = await apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .set('Authorization', `AMB ${adminAccount.secret}`)
      .send(unsignedEvent);
    expect(response.status).to.eq(201);
    expect(response.body.content.idData).to.deep.equal(unsignedEvent.content.idData);
  });

  it('returns 400 for invalid input (missing required field)', async () => {
    const brokenEvent = pick(event, 'content.idData.timestamp');
    const request = apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .set('Authorization', `AMB ${pkPair.secret}`)
      .send(brokenEvent);
    await expect(request)
      .to.eventually.be.rejected
      .and.have.property('status', 400);
  });

  it('returns 400 for invalid input (unexpected field)', async () => {
    const brokenEvent = put(event, 'content.idData.foo', 'bar');
    const request = apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .set('Authorization', `AMB ${pkPair.secret}`)
      .send(brokenEvent);
    await expect(request)
      .to.eventually.be.rejected
      .and.have.property('status', 400);
  });

  it('returns 400 when same event added twice', async () => {
    await apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .send(event);
    const request = apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .send(event);
    await expect(request)
      .to.eventually.be.rejected
      .and.have.property('status', 400);
  });

  it('returns 403 for authorisation error (user does not exist)', async () => {
    const failingEvent = createFullEvent(apparatus.identityManager,
      {createdBy: notRegisteredAccount.address, assetId: asset.assetId},
      undefined,
      notRegisteredAccount.secret);

    const request = apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .send(failingEvent);

    await expect(request)
      .to.eventually.be.rejected
      .and.have.property('status', 403);
  });

  it('returns 403 for permission error (no `create_event` permission)', async () => {
    const notPermittedEvent = createFullEvent(apparatus.identityManager,
      {
        createdBy: otherAccount.address,
        assetId: asset.assetId
      }, undefined, otherAccount.secret);

    const request = apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .send(notPermittedEvent);

    await expect(request)
      .to.eventually.be.rejected
      .and.have.property('status', 403);
  });

  it('returns 403 when trying to create an event with access level higher than own access level', async () => {
    const highAccessLevelEvent = createFullEvent(apparatus.identityManager, {
      createdBy: adminAccount.address,
      assetId: asset.assetId,
      accessLevel: 9999
    }, undefined, adminAccount.secret);

    const request = apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .send(highAccessLevelEvent);

    await expect(request)
      .to.eventually.be.rejected
      .and.have.property('status', 403);
  });

  it('returns 400 when trying to create an event that exceeds the 10KB size limit', async () => {
    const longString = new Array(10 * 1024)
      .fill('0')
      .join('');
    const largeEvent = createFullEvent(
      apparatus.identityManager,
      {
        createdBy: adminAccount.address,
        assetId: asset.assetId
      },
      [
        {
          type: 'ambrosus.event.large',
          someData: longString
        }
      ],
      adminAccount.secret
    );

    const request = apparatus.request()
      .post(`/assets/${asset.assetId}/events`)
      .send(largeEvent);

    await expect(request)
      .to.eventually.be.rejected
      .and.have.property('status', 400);
  });

  afterEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
  });

  after(async () => {
    await apparatus.stop();
  });
});
