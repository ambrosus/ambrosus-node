import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Aparatus from '../helpers/aparatus';
import chaiHttp from 'chai-http';

import {createAssetHandler, fetchAssetHandler, createEventHandler} from '../../src/routes/assets';
import {put, pick, get} from '../../src/utils/dict_utils';
import {createFullAsset, createFullEvent, createAsset, createEvent} from '../fixtures/asset_fixture_builder';
import pkPair from '../fixtures/pk_pair';

import {ValidationError} from '../../src/errors/errors';

chai.use(chaiHttp);
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
      createEvent: sinon.stub()
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

    it('fetching asset', async () => {
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
});

describe('Assets - Integrations', () => {
  let aparatus;

  before(async () => {
    aparatus = new Aparatus();
    await aparatus.start();
  });

  describe('creating asset', () => {
    let inputAsset = null;

    beforeEach(() => {
      inputAsset = createFullAsset(aparatus.identityManager);
    });

    it('works with valid input (client signed)', async () => {
      const response = await aparatus.request()
        .post('/assets')
        .send(inputAsset);
      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${response.body.assetId}`);
      expect(response.body.content).to.deep.equal(inputAsset.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedAsset = pick(inputAsset, ['content.signature', 'assetId']);

      const response = await aparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(unsignedAsset);
      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${response.body.assetId}`);
      expect(response.body.content.idData).to.deep.equal(unsignedAsset.content.idData);
    });

    it('fails for invalid input', async () => {
      const brokenAsset = pick(inputAsset, 'content.idData.timestamp');
      const request = aparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenAsset);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });
  });

  describe('fetching asset', () => {
    let asset;

    beforeEach(async () => {
      const signedAsset = createFullAsset(aparatus.identityManager);
      const response = await aparatus.request()
        .post('/assets')
        .send(signedAsset);
      asset = response.body;
    });

    it('should get asset by id', async () => {
      const response = await aparatus.request()
        .get(`/assets/${asset.assetId}`);
      expect(response.body).to.deep.equal(asset);
    });

    it('should return 404 if asset with that id doesn\'t exist', async () => {
      const request = aparatus.request()
        .get(`/assets/nonexistingAsset`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('creating event', () => {
    let baseAsset = null;
    let inputEvent = null;

    beforeEach(async () => {
      baseAsset = createFullAsset(aparatus.identityManager);
      await aparatus.request()
        .post('/assets')
        .send(baseAsset);
      inputEvent = createFullEvent(aparatus.identityManager, {assetId: baseAsset.assetId}, {});
    });

    it('works with valid input (client signed)', async () => {
      const response = await aparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .send(inputEvent);

      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${baseAsset.assetId}/events/${response.body.eventId}`);
      expect(response.body.content).to.deep.equal(inputEvent.content);
    });

    it('works with valid input (server signed)', async () => {
      const unsignedEvent = pick(inputEvent, ['content.signature', 'eventId', 'content.idData.dataHash']);

      const response = await aparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(unsignedEvent);

      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${baseAsset.assetId}/events/${response.body.eventId}`);
      // the idData should include all values taken from the input + dataHash
      for (const key of ['timestamp', 'accessLevel', 'assetId', 'createdBy']) {
        expect(get(response.body.content.idData, key)).to.equal(get(unsignedEvent.content.idData, key));
      }
      expect(response.body.content.idData.dataHash).to.exist;
      expect(response.body.content.data).to.deep.equal(unsignedEvent.content.data);
    });

    it('fails for invalid input', async () => {
      const brokenEvent = pick(inputEvent, 'content.data');
      const request = aparatus.request()
        .post(`/assets/${baseAsset.assetId}/events`)
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(brokenEvent);
      await expect(request)
        .to.eventually.be.rejected
        .and.have.property('status', 400);
    });
  });

  after(async () => {
    aparatus.stop();
  });
});
