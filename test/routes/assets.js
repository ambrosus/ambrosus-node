import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import {createAssetHandler, fetchAssetHandler, createEventHandler} from '../../src/routes/assets';
import {put} from '../../src/utils/dict_utils';
import {createAsset, createEvent} from '../fixtures/assets_events';

import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Assets', () => {
  let mockModelEngine = null;
  let req = null;
  let res = null;

  beforeEach(() => {
    mockModelEngine = {
      createAsset: sinon.stub(),
      getAsset: sinon.stub(),
      createEvent: sinon.stub(),
      getEvent: sinon.stub()
    };
    req = httpMocks.createRequest({});
    res = httpMocks.createResponse();
  });

  describe('creating an asset', () => {
    let inputAsset = null;
    const resultAssetId = '1234';
    let injectedHandler;

    beforeEach(() => {
      inputAsset = createAsset();
      mockModelEngine.createAsset.resolves(put(inputAsset, 'assetId', resultAssetId));
      req.body = inputAsset;
      injectedHandler = createAssetHandler(mockModelEngine);
    });

    it('pushes json body into Data Model Engine, proxies result', async () => {
      await injectedHandler(req, res);

      expect(mockModelEngine.createAsset).to.have.been.calledWith(inputAsset);

      expect(res._getStatusCode()).to.eq(201);
      expect(res._isJSON()).to.be.true;
    });
  });

  describe('fetching asset', () => {
    const assetId = 'assetid';
    let mockAsset;
    let injectedHandler;

    beforeEach(() => {
      mockAsset = createAsset();
      mockModelEngine.getAsset.resolves(put(mockAsset, 'assetId', assetId));
      injectedHandler = fetchAssetHandler(mockModelEngine);
    });

    it('asks the model engine for the asset', async () => {
      req.params.assetId = assetId;
      await injectedHandler(req, res);

      expect(mockModelEngine.getAsset).to.have.been.calledWith(assetId);

      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
    });
  });

  describe('creating an event', () => {
    let inputEvent = null;
    const mockAssetId = '4321';
    let injectedHandler;

    beforeEach(() => {
      inputEvent = createEvent({assetId: mockAssetId}, {});
      mockModelEngine.createEvent.returns(put(inputEvent, 'eventId', mockAssetId));
      req.body = inputEvent;
      req.params.assetId = inputEvent.content.idData.assetId;
      injectedHandler = createEventHandler(mockModelEngine);
    });

    it('pushes json body into Data Model Engine, proxies result', async () => {
      await injectedHandler(req, res);

      expect(mockModelEngine.createEvent).to.have.been.calledWith(inputEvent);

      expect(res._getStatusCode()).to.eq(201);
      expect(res._isJSON()).to.be.true;
    });

    it('fails if the path assetId differs from the one in content.idData.assetId', async () => {
      req.params.assetId = '0x3333';
      await expect(injectedHandler(req, res)).to.eventually.be.rejectedWith(ValidationError);
    });
  });
});

