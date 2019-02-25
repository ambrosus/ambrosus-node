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
import allPermissions from '../../../src/utils/all_permissions';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Events Integrations: Find', () => {
  const accessLevel = 3;
  let apparatus;
  let scenario;

  before(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  before(async () => {
    await scenario.addAdminAccount(adminAccountWithSecret);
    await scenario.addAccount(0, accountWithSecret, {permissions: [allPermissions.createEvent], accessLevel: 100});
    await scenario.addAccount(0, null, {permissions: [allPermissions.createEvent], accessLevel});
    await scenario.addAsset(0, {timestamp: 0});
    await scenario.addAsset(0, {timestamp: 1});
    await scenario.generateEvents(
      12,
      (inx) => ({
        accountInx: inx % 4 === 0 ? 1 : 0,
        subjectInx: inx % 3 === 0 ? 1 : 0,
        fields: {timestamp: inx, accessLevel: inx % 10},
        data: [{type: '1'}]
      })
    );
  });

  describe('Fetch', () => {
    it('fetches an event when valid event id provided', async () => {
      const exampleEventId = scenario.events[0].eventId;
      const response = await apparatus.request().get(`/events/${exampleEventId}`)
        .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
      const {body} = response;
      expect(body).to.deep.equal(scenario.events[0]);
    });
  });

  it('with perPage returns only requested number of newest (by timestamp) events', async () => {
    const perPage = 4;
    const response = await apparatus.request().get(`/events?perPage=${perPage}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(perPage);
    expect(body.resultCount).to.equal(12);
    expect(body.results[0]).to.deep.equal(scenario.events[11]);
    expect(body.results[3]).to.deep.equal(scenario.events[8]);
  });

  it('hides data field if access level is too low', async () => {
    const response = await apparatus.request().get(`/events`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(scenario.accounts[2].secret)}`);
    const {body} = response;

    expect(body.results).to.have.length(12);
    body.results.forEach((event) => {
      if (event.content.idData.accessLevel <= accessLevel) {
        expect(event.content).to.include.key('data');
      } else {
        expect(event.content).to.not.include.key('data');
      }
    });
    expect(body.results.filter((event) => event.content.data)).to.have.length(6);
  });

  it('accessLevel = 0 when no token provided', async () => {
    const response = await apparatus.request().get(`/events`);
    const {body} = response;

    expect(body.results).to.have.length(12);
    body.results.forEach((event) => {
      if (event.content.idData.accessLevel === 0) {
        expect(event.content).to.include.key('data');
      } else {
        expect(event.content).to.not.include.key('data');
      }
    });
  });

  it('accessLevel = 0 when address not registered', async () => {
    const response = await apparatus.request().get(`/events`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken(notRegisteredAccount.secret)}`);
    const {body} = response;

    body.results.forEach((event) => {
      if (event.content.idData.accessLevel === 0) {
        expect(event.content).to.include.key('data');
      } else {
        expect(event.content).to.not.include.key('data');
      }
    });
  });

  it('with page and perPage returns events from selected page', async () => {
    const perPage = 4;
    const page = 2;
    const response = await apparatus.request().get(`/events?perPage=${perPage}&page=${page}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(perPage);
    expect(body.resultCount).to.equal(12);
    expect(body.results).to.deep.equal(scenario.events.slice(0, 4).reverse());
  });

  it('with assetId returns only events for target asset (default syntax)', async () => {
    const targetAssetId = scenario.assets[0].assetId;
    const response = await apparatus.request().get(`/events?assetId=${targetAssetId}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(8);
    expect(body.resultCount).to.equal(8);
    body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
  });


  it('alias syntax for assetId search returns only events for target asset', async () => {
    const targetAssetId = scenario.assets[0].assetId;
    const response = await apparatus.request()
      .get(`/assets/${targetAssetId}/events`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(8);
    expect(body.resultCount).to.equal(8);
    body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
  });

  it('alias syntax with other parameters filters properly', async () => {
    const targetAssetId = scenario.assets[0].assetId;
    const fromTimestamp = 2;
    const toTimestamp = 10;
    const perPage = 4;
    const page = 1;
    const response = await apparatus.request()
      .get(`/assets/${targetAssetId}/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}&perPage=${perPage}&page=${page}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(2);
    expect(body.resultCount).to.equal(6);
    body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 10));
    body.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
  });


  it('with createdBy returns only events for target creator', async () => {
    const targetCreatorAddress = scenario.accounts[1].address;
    const response = await apparatus.request()
      .get(`/events?createdBy=${targetCreatorAddress}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(3);
    expect(body.resultCount).to.equal(3);
    body.results.forEach((element) => expect(element.content.idData.createdBy).to.equal(targetCreatorAddress));
  });

  it('with fromTimestamp returns only events newer than selected timestamp', async () => {
    const fromTimestamp = 5;
    const response = await apparatus.request().get(`/events?fromTimestamp=${fromTimestamp}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(7);
    expect(body.resultCount).to.equal(7);
    body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.least(5));
  });

  it('with toTimestamp returns only events older than selected timestamp', async () => {
    const toTimestamp = 5;
    const response = await apparatus.request().get(`/events?toTimestamp=${toTimestamp}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(6);
    expect(body.resultCount).to.equal(6);
    body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.most(5));
  });

  it('with fromTimestamp and toTimestamp returns only events between selected timestamps', async () => {
    const fromTimestamp = 2;
    const toTimestamp = 10;
    const response = await apparatus.request()
      .get(`/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(9);
    expect(body.resultCount).to.equal(9);
    body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 10));
  });

  it('with fromTimestamp, toTimestamp and perPage returns only events between selected timestamps, with quantity limited to perPage, from requested page', async () => {
    const fromTimestamp = 2;
    const toTimestamp = 10;
    const perPage = 4;
    const page = 1;
    const response = await apparatus.request()
      .get(`/events?fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}&perPage=${perPage}&page=${page}`)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);
    const {body} = response;

    expect(body.results).to.have.lengthOf(4);
    expect(body.resultCount).to.equal(9);
    body.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 10));
  });

  after(async () => {
    await apparatus.cleanDB();
    scenario.reset();
    await apparatus.stop();
  });
});
