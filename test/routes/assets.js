import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Aparatus from '../helpers/aparatus';
import chaiHttp from 'chai-http';

import {createAssetHandler, fetchAssetHandler} from '../../src/routes/assets';
import {put, pick} from '../../src/utils/dict_utils';
import {createAsset, addSignatureToAsset} from '../fixtures/asset_fixture_builder';
import pkPair from '../fixtures/pk_pair';

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
      getAsset: sinon.stub()
    };
    mockLinkHelper = {
      linkForAsset: sinon.stub()
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
      inputAsset = createAsset();
    });

    it('works with valid input (client signed)', async () => {
      const signedAsset = addSignatureToAsset(aparatus.identityManager, inputAsset, pkPair.secret);

      const response = await aparatus.request()
        .post('/assets')
        .send(signedAsset);
      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${response.body.assetId}`);
      expect(response.body.content).to.deep.equal(signedAsset.content);
    });

    it('works with valid input (server signed)', async () => {
      const response = await aparatus.request()
        .post('/assets')
        .set('Authorization', `AMB ${pkPair.secret}`)
        .send(inputAsset);
      expect(response.status).to.eq(201);
      expect(response.body.metadata.link).to.equal(`/assets/${response.body.assetId}`);
      expect(response.body.content.idData).to.deep.equal(inputAsset.content.idData);
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
      const signedAsset = addSignatureToAsset(aparatus.identityManager, createAsset(), pkPair.secret);
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

  after(async () => {
    aparatus.stop();
  });
});
