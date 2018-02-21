import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import {findEventsHandler} from '../../src/routes/events';

import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Events', () => {
  let mockModelEngine;
  let mockLinkHelper;
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
    mockLinkHelper = {
      linkForEvent: sinon.stub()
    };
    req = httpMocks.createRequest({});
    res = httpMocks.createResponse();
  });

  describe('finding events', () => {
    let injectedHandler;

    beforeEach(() => {
      injectedHandler = findEventsHandler(mockModelEngine, mockLinkHelper);
    });

    it('queries Data Model Engine, proxies result, appends metadata, and resultCount', async () => {
      await scenario.addAsset();
      const eventSet = await scenario.addEventsSerial(
        105, 
        (inx) => ({
          subject: 0, 
          fields: {timestamp: inx}, 
          data: {}
        })
      );
      
      mockModelEngine.findEvents.resolves({results: eventSet, resultCount: 165});
      mockLinkHelper.linkForEvent.returns('123');

      await injectedHandler(req, res);

      const returnedData = JSON.parse(res._getData());

      expect(mockModelEngine.findEvents).to.have.been.called;
      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
      expect(returnedData.resultCount).to.equal(165);
      expect(returnedData.results.length).to.equal(105);

      expect(mockLinkHelper.linkForEvent).to.have.callCount(105);
      for (const event of returnedData.results) {
        expect(event.metadata.link).to.equal('123');
      }
    });
  });
});

