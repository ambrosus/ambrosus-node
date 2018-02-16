import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import {createAssetHandler, fetchAssetHandler, createEventHandler, fetchEventHandler} from '../../src/routes/assets';
import {put} from '../../src/utils/dict_utils';
import {createAsset, createEvent} from '../fixtures/asset_fixture_builder';

import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Assets', () => {
  let mockModelEngine = null;
  let mockLinkHelper = null;
  let req = null;
  let res = null;

  beforeEach(() => {
    mockModelEngine = {
      createAsset: sinon.stub(),
      getAsset: sinon.stub(),
      createEvent: sinon.stub(),
      getEvent: sinon.stub()
    };
    mockLinkHelper = {
      linkForAsset: sinon.stub(),
      linkForEvent: sinon.stub()
    };
    req = httpMocks.createRequest({});
    req.modelEngine = mockModelEngine;
    req.linkHelper = mockLinkHelper;
    res = httpMocks.createResponse();
  });

  describe('creating an asset', () => {
    let inputAsset = null;
    const resultAssetId = '1234';
    let injectedHandler;

    beforeEach(() => {
      inputAsset = createAsset();
      mockModelEngine.createAsset.resolves(put(inputAsset, 'assetId', resultAssetId));
      mockLinkHelper.linkForAsset.returns('xyz');
      req.body = inputAsset;
      injectedHandler = createAssetHandler(mockModelEngine, mockLinkHelper);
    });

    it('pushes json body into Data Model Engine, proxies result and appends metadata', async () => {
      await injectedHandler(req, res);

      expect(mockModelEngine.createAsset).to.have.been.calledWith(inputAsset);
      expect(mockLinkHelper.linkForAsset).to.have.been.calledWith(resultAssetId);

      expect(res._getStatusCode()).to.eq(201);
      expect(res._isJSON()).to.be.true;
      const returnedData = JSON.parse(res._getData());

      expect(returnedData.metadata.link).to.be.equal(`xyz`);
    });
  });

  describe('fetching asset', () => {
    const assetId = 'assetid';
    let mockAsset;
    let injectedHandler;

    beforeEach(() => {
      mockAsset = createAsset();
      mockModelEngine.getAsset.resolves(put(mockAsset, 'assetId', assetId));
      mockLinkHelper.linkForAsset.returns('xyz');
      injectedHandler = fetchAssetHandler(mockModelEngine, mockLinkHelper);
    });

    it('asks the model engine for the asset and augments metadata using link helper', async () => {
      req.params.assetId = assetId;
      await injectedHandler(req, res);

      expect(mockModelEngine.getAsset).to.have.been.calledWith(assetId);
      expect(mockLinkHelper.linkForAsset).to.have.been.calledWith(assetId);

      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
      const returnedData = JSON.parse(res._getData());

      expect(returnedData.metadata.link).to.be.equal(`xyz`);
    });
  });

  describe('creating an event', () => {
    let inputEvent = null;
    const mockAssetId = '4321';
    const mockEventId = '4321';
    let injectedHandler;

    beforeEach(() => {
      inputEvent = createEvent({assetId: mockAssetId}, {});
      mockModelEngine.createEvent.returns(put(inputEvent, 'eventId', mockAssetId));
      mockLinkHelper.linkForEvent.returns('abc');
      req.body = inputEvent;
      req.params.assetId = inputEvent.content.idData.assetId;
      injectedHandler = createEventHandler(mockModelEngine, mockLinkHelper);
    });

    it('pushes json body into Data Model Engine, proxies result and appends metadata', async () => {
      await injectedHandler(req, res);

      expect(mockModelEngine.createEvent).to.have.been.calledWith(inputEvent);
      expect(mockLinkHelper.linkForEvent).to.have.been.calledWith(mockAssetId, mockEventId);

      expect(res._getStatusCode()).to.eq(201);
      expect(res._isJSON()).to.be.true;
      const returnedData = JSON.parse(res._getData());

      expect(returnedData.metadata.link).to.be.equal(`abc`);
    });

    it('fails if the path assetId differs from the one in content.idData.assetId', async () => {
      req.params.assetId = '0x3333';
      await expect(injectedHandler(req, res)).to.eventually.be.rejectedWith(ValidationError);
    });
  });

  describe('fetching event', () => {
    const eventId = 'eventid';
    let mockEvent;
    let injectedHandler;

    beforeEach(() => {
      mockEvent = createEvent();
      mockModelEngine.getEvent.resolves(put(mockEvent, 'eventId', eventId));
      mockLinkHelper.linkForEvent.returns('qwerty');
      injectedHandler = fetchEventHandler(mockModelEngine, mockLinkHelper);
    });

    it('asks the model engine for the event and augments metadata using link helper', async () => {
      req.params.assetId = mockEvent.content.idData.assetId;
      req.params.eventId = eventId;
      await injectedHandler(req, res);

      expect(mockModelEngine.getEvent).to.have.been.calledWith(eventId);
      expect(mockLinkHelper.linkForEvent).to.have.been.calledWith(mockEvent.content.idData.assetId, eventId);

      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
      const returnedData = JSON.parse(res._getData());

      expect(returnedData.metadata.link).to.be.equal(`qwerty`);
    });
  });
});

