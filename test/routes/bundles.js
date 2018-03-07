import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {put} from '../../src/utils/dict_utils';

import {createBundle} from '../fixtures/assets_events';
import {getBundleHandler} from '../../src/routes/bundles';


chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Bundles', () => {
  let mockModelEngine;
  let req;
  let res;

  beforeEach(async () => {
    mockModelEngine = {
      getBundle: sinon.stub()
    };
    req = httpMocks.createRequest({});
    res = httpMocks.createResponse();
  });

  describe('getting bundles', () => {
    let injectedHandler;
    const exampleBundleId = '0xabcdef';
    const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);

    beforeEach(async () => {
      injectedHandler = getBundleHandler(mockModelEngine);


      mockModelEngine.getBundle.resolves(exampleBundle);
    });

    it('passes requested id to Data Model Engine and proxies result', async () => {
      const requestedId = '0xabcdef';
      req.params.bundleId = requestedId;

      await injectedHandler(req, res);

      const returnedData = JSON.parse(res._getData());

      expect(mockModelEngine.getBundle).to.have.been.calledWith(requestedId);
      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
      expect(returnedData).to.deep.equal(exampleBundle);
    });
  });
});

