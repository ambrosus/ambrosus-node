/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import {findEventsHandler, fetchEventHandler} from '../../src/routes/events';

import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';
import {put} from '../../src/utils/dict_utils';
import {createEvent} from '../fixtures/assets_events';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Events', () => {
  let mockModelEngine;
  let req;
  let res;
  let scenario;

  before(async () => {
    scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
  });

  beforeEach(async () => {
    mockModelEngine = {
      findEvents: sinon.stub(),
      getEvent: sinon.stub()
    };
    req = httpMocks.createRequest({});
    res = httpMocks.createResponse();

    scenario.reset();
    await scenario.addAdminAccount(adminAccountWithSecret);
  });

  describe('finding events', () => {
    let injectedHandler;

    beforeEach(async () => {
      injectedHandler = findEventsHandler(mockModelEngine);
      await scenario.addAsset(0);
      const eventSet = await scenario.generateEvents(
        4,
        (inx) => ({
          accountInx: 0,
          subjectInx: 0,
          fields: {timestamp: inx},
          data: {}
        })
      );
      mockModelEngine.findEvents.resolves({results: eventSet, resultCount: 165});
    });

    it('passes query parameters to Data Model Engine, proxies result, appends metadata/resultCount', async () => {
      const queryParams = {
        assetId: scenario.assets[0].assetId
      };
      req.query = queryParams;

      await injectedHandler(req, res);

      const returnedData = JSON.parse(res._getData());

      expect(mockModelEngine.findEvents).to.have.been.calledWith(queryParams);
      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
      expect(returnedData.results.length).to.equal(4);
      expect(returnedData.resultCount).to.equal(165);
    });
  });

  describe('fetching event', () => {
    const eventId = 'eventid';
    let mockEvent;
    let injectedHandler;

    beforeEach(() => {
      mockEvent = createEvent();
      mockModelEngine.getEvent.resolves(put(mockEvent, 'eventId', eventId));
      injectedHandler = fetchEventHandler(mockModelEngine);
    });

    it('asks the model engine for the event', async () => {
      req.params.assetId = mockEvent.content.idData.assetId;
      req.params.eventId = eventId;
      await injectedHandler(req, res);

      expect(mockModelEngine.getEvent).to.have.been.calledWith(eventId);

      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
    });
  });
});

