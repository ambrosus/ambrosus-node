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
import {accountWithSecret, adminAccountWithSecret} from '../../fixtures/account';
import ScenarioBuilder from '../../fixtures/scenario_builder';
import allPermissions from '../../../src/utils/all_permissions';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Events Integrations: Find by data entries', () => {
  const accessLevel = 3;
  let apparatus;
  let scenario;

  before(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
  });

  beforeEach(async () => {
    await scenario.addAdminAccount(adminAccountWithSecret);
    await scenario.addAccount(0, accountWithSecret, {permissions: [allPermissions.createEvent], accessLevel});
    await scenario.addAsset(0, {sequenceNumber: 0});
    await scenario.addAsset(0, {sequenceNumber: 1});

    await scenario.addEvent(0, 0, {timestamp: 0, accessLevel: 1}, [{
      type: 'ambrosus.event.illustration',
      confirmationAddress: '0xD49f20a8339FFe6471D3a32f874fC82CfDd98750',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }]);
    await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 0}, [{
      type: 'ambrosus.event.example',
      value: 'acceleration',
      acceleration: {
        valueX: '1',
        valueY: 2
      }
    }]);
  });

  const get = (url) =>
    apparatus.request()
      .get(url)
      .set('Authorization', `AMB_TOKEN ${apparatus.generateToken()}`);

  it('works with string', async () => {
    const response = await get(`/events?data[type]=ambrosus.event.illustration`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.event.illustration');
  });

  it('works with string and accessLevel=1', async () => {
    await scenario.addEvent(0, 0, {timestamp: 0, accessLevel: 0}, [{
      type: 'ambrosus.event.illustration',
      confirmationAddress: '0x33333333333333333333333333333333333333',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }]);
    const response = await apparatus.request().get(`/events?data[type]=ambrosus.event.illustration`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data[0].confirmationAddress).to.equal('0x33333333333333333333333333333333333333');
  });

  it('works with strings on nested object', async () => {
    const response = await get(`/events?data[acceleration.valueX]=1`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.event.example');
  });

  it('works with number decorator on nested object', async () => {
    const response = await get(`/events?data[acceleration.valueY]=number(2)`);
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.event.example');
  });

  it('fails when array index provided in query', async () => {
    expect(get(`/events?data[acceleration][0]=1`))
      .to.eventually.be.rejected.and.have.property('status', 400);
  });

  it('with conjunction', async () => {
    await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 0}, [{
      type: 'ambrosus.event.illustration',
      confirmationAddress: '0x2222222222222222222222222222222222222222',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }]);
    const response = await get('/events?data[type]=ambrosus.event.illustration&fromTimestamp=1');
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data[0].confirmationAddress).to.equal('0x2222222222222222222222222222222222222222');
  });

  it('with pattern matching', async () => {
    await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 0}, [{
      type: 'ambrosus.event.illustration',
      confirmationAddress: '0x2222222222222222222222222222222222222222',
      confirmationSignature: '0x39FFe6D49f20a83471D3a32f8CfDd987504fC822f8CfDd987504fC82'
    }]);
    const response = await get('/events?data[type]=pattern(ambrosus.event.*)&data[confirmationAddress]=pattern(0x?2*2)');
    expect(response.body.resultCount).to.eq(1);
    expect(response.body.results[0].content.data[0].confirmationAddress).to.equal('0x2222222222222222222222222222222222222222');
  });

  describe('geo based search', () => {
    beforeEach(async () => {
      await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 0}, [{
        type: 'ambrosus.asset.location',
        geoJson: {
          type: 'Point',
          coordinates: [0, 0]
        }
      }]);
      await scenario.addEvent(0, 0, {timestamp: 2, accessLevel: 0}, [{
        type: 'ambrosus.asset.location',
        geoJson: {
          type: 'Point',
          coordinates: [0, 0.009]
        }
      }]);
      await scenario.addEvent(0, 0, {timestamp: 3, accessLevel: 0}, [{
        type: 'ambrosus.asset.location',
        geoJson: {
          type: 'Point',
          coordinates: [1, 0]
        }
      }, {
        type: 'ambrosus.event.location',
        geoJson: {
          type: 'Point',
          coordinates: [1, 0.009]
        }
      }]);
      await scenario.addEvent(0, 0, {timestamp: 4, accessLevel: 0}, [{
        type: 'ambrosus.asset.location',
        geoJson: {
          type: 'Point',
          coordinates: [1, 0]
        }
      }]);
      await scenario.addEvent(0, 0, {timestamp: 5, accessLevel: 0}, [{
        type: 'ambrosus.event.location',
        geoJson: {
          type: 'Point',
          coordinates: [1, 0.009]
        }
      }]);
    });

    it('works for an exact point', async () => {
      const response = await get(`/events?data[geoJson]=geo(0, 0, 0)`);
      expect(response.body.resultCount).to.eq(1);
      expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.asset.location');
      expect(response.body.results[0].content.idData.timestamp).to.equal(1);
    });

    it('works with an area containing one result', async () => {
      const response = await get(`/events?data[geoJson]=geo(0, 0.017, 1000)`);
      expect(response.body.resultCount).to.eq(1);
      expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.asset.location');
      expect(response.body.results[0].content.idData.timestamp).to.equal(2);
    });
    it('works with an area containing multiple results', async () => {
      const response = await get(`/events?data[geoJson]=geo(0, 0.0045, 600)`);
      expect(response.body.resultCount).to.eq(2);
      expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.asset.location');
      expect(response.body.results[0].content.idData.timestamp).to.equal(2);
      expect(response.body.results[1].content.data[0].type).to.equal('ambrosus.asset.location');
      expect(response.body.results[1].content.idData.timestamp).to.equal(1);
    });
    it('works with events containing multiple geoJson objects', async () => {
      const response = await get(`/events?data[geoJson]=geo(1, 0.009, 0)`);
      expect(response.body.resultCount).to.eq(2);
      expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.event.location');
      expect(response.body.results[0].content.idData.timestamp).to.equal(5);
      expect(response.body.results[1].content.data[0].type).to.equal('ambrosus.asset.location');
      expect(response.body.results[1].content.idData.timestamp).to.equal(3);
    });
    it('works with events multiple geoJsons contained in queried area', async () => {
      const response = await get(`/events?data[geoJson]=geo(1, 0.0045, 600)`);
      expect(response.body.results[0].content.data[0].type).to.equal('ambrosus.event.location');
      expect(response.body.results[0].content.idData.timestamp).to.equal(5);
      expect(response.body.results[1].content.data[0].type).to.equal('ambrosus.asset.location');
      expect(response.body.results[1].content.idData.timestamp).to.equal(4);
      expect(response.body.results[2].content.data[0].type).to.equal('ambrosus.asset.location');
      expect(response.body.results[2].content.data[1].type).to.equal('ambrosus.event.location');
      expect(response.body.results[2].content.idData.timestamp).to.equal(3);
    });
  });

  afterEach(async () => {
    await apparatus.cleanDB();
    scenario.reset();
  });

  after(async () => {
    await apparatus.stop();
  });
});
