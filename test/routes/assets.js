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

import {createAssetHandler, fetchAssetHandler, createEventHandler, findAssetsHandler} from '../../src/routes/assets';
import {put} from '../../src/utils/dict_utils';
import {createAsset, createEvent} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';

import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Assets', () => {
  let mockModelEngine = null;
  let req = null;
  let res = null;
  let scenario;

  before(async () => {
    scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
  });

  beforeEach(async () => {
    mockModelEngine = {
      createAsset: sinon.stub(),
      getAsset: sinon.stub(),
      findAssets: sinon.stub(),
      createEvent: sinon.stub(),
      getEvent: sinon.stub()
    };
    req = httpMocks.createRequest({});
    res = httpMocks.createResponse();

    scenario.reset();
    await scenario.addAdminAccount(adminAccountWithSecret);
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

  describe('finding assets', () => {
    let injectedHandler;

    beforeEach(async () => {
      injectedHandler = findAssetsHandler(mockModelEngine);
      const assetSet = [
        await scenario.addAsset(0, {timestamp : 1}),
        await scenario.addAsset(0, {timestamp : 2})
      ];
      mockModelEngine.findAssets.resolves({results: assetSet, resultCount: 165});
    });

    it('calls Data Model Engine, proxies result, appends metadata/resultCount', async () => {
      await injectedHandler(req, res);

      const returnedData = JSON.parse(res._getData());

      expect(mockModelEngine.findAssets).to.have.been.called;
      expect(res._getStatusCode()).to.eq(200);
      expect(res._isJSON()).to.be.true;
      expect(returnedData.results.length).to.equal(2);
      expect(returnedData.resultCount).to.equal(165);
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

