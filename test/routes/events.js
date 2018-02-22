import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {put} from '../../src/utils/dict_utils';

import {findEventsHandler} from '../../src/routes/events';

import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';

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

  beforeEach(() => {
    mockModelEngine = {
      findEvents: sinon.stub()
    };
    req = httpMocks.createRequest({});
    res = httpMocks.createResponse();

    scenario.reset();
    scenario.injectAccount(adminAccountWithSecret);
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

    it('parses query string, proxies result from Data Model Engine, appends metadata/resultCount', async () => {
      const validQueryParams = {
        assetId: scenario.assets[0].assetId
      };
      const extendedQueryParams = put(validQueryParams, 'surplusParam', 'some value');
      req.query = extendedQueryParams;

      await injectedHandler(req, res);

      const returnedData = JSON.parse(res._getData());

      expect(mockModelEngine.findEvents).to.have.been.calledWith(validQueryParams);
      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
      expect(returnedData.results.length).to.equal(4);
      expect(returnedData.resultCount).to.equal(165);
    });
  });
});

