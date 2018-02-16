import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import DataModelEngine from '../../src/services/data_model_engine';
import {NotFoundError, ValidationError, InvalidParametersError} from '../../src/errors/errors';

import {createAsset, createEvent} from '../fixtures/asset_fixture_builder';
import pkPair from '../fixtures/pk_pair';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Data Model Engine', () => {
  let modelEngine = null;
  let mockIdentityManager = null;
  let mockEntityBuilder = null;
  let mockEntityRepository = null;
  let mockAccountRepository = null;

  let mockAsset;
  let mockEvent;

  beforeEach(() => {
    mockAsset = createAsset();
    mockEvent = createEvent();

    mockIdentityManager = {
      createKeyPair: sinon.stub()
    };
    mockAccountRepository = {
      store: sinon.stub(),
      get: sinon.stub()
    };
    mockEntityBuilder = {
      validateAsset: sinon.stub(),
      setAssetBundle: sinon.stub(),
      regenerateAssetId: sinon.stub(),
      validateEvent: sinon.stub(),
      setEventBundle: sinon.stub()
    };
    mockEntityRepository = {
      storeAsset: sinon.stub(),
      getAsset: sinon.stub(),
      storeEvent: sinon.stub()
    };
    modelEngine = new DataModelEngine(mockIdentityManager, mockEntityBuilder, mockEntityRepository,
      mockAccountRepository);
  });

  describe('creating an account', () => {
    it('creates key pair with identityManager and stores with accountRepository', async () => {
      mockIdentityManager.createKeyPair.returns(pkPair);
      expect(await modelEngine.createAccount()).to.eq(pkPair);
      expect(mockIdentityManager.createKeyPair).to.have.been.called;
      expect(mockAccountRepository.store).to.have.been.calledWith(pkPair);
    });

    it('gets a account data from accountRepository', async () => {      
      mockAccountRepository.get.returns(pkPair);
      expect(await modelEngine.getAccount()).to.eq(pkPair);
      expect(mockAccountRepository.get).to.have.been.called;
    });    
  });

  describe('creating an asset', () => {
    it('validates with Entity Builder and sends to Entity Storage', async () => {
      mockEntityBuilder.regenerateAssetId.returns(mockAsset);
      mockEntityBuilder.setAssetBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();

      await expect(modelEngine.createAsset(mockAsset));

      expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
      expect(mockEntityBuilder.regenerateAssetId).to.have.been.calledWith(mockAsset);
      expect(mockEntityBuilder.setAssetBundle).to.have.been.calledWith(mockAsset, null);
      expect(mockEntityRepository.storeAsset).to.have.been.calledWith(mockAsset);
    });

    it('validate with the Entity Builder and proxies the ValidationError', async () => {
      mockEntityBuilder.validateAsset.throws(new ValidationError('an error'));

      await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(ValidationError);
    });
  });

  describe('getting an asset by id', () => {
    const exampleAssetId = '0x123';
    beforeEach(() => {
      mockEntityRepository.getAsset.resolves(null);
      mockEntityRepository.getAsset.withArgs(exampleAssetId).resolves(mockAsset);
    });

    it('gets asset by assetId', async () => {
      const asset = await modelEngine.getAsset(exampleAssetId);
      expect(asset).to.deep.equal(mockAsset);
    });

    it('throws if asset not found', async () => {
      await expect(modelEngine.getAsset('notexistingAsset')).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('creating an event', () => {
    beforeEach(() => {
      mockEntityBuilder.setEventBundle.returns(mockEvent);
      mockEntityRepository.storeEvent.resolves();
      mockEntityRepository.getAsset.resolves(mockAsset);
    });

    it('coordinates all services', async () => {
      await expect(modelEngine.createEvent(mockEvent));

      // validates
      expect(mockEntityBuilder.validateEvent).to.have.been.calledWith(mockEvent);
      // checks if target asset exists
      expect(mockEntityRepository.getAsset).to.have.been.calledWith(mockEvent.content.idData.assetId);
      // marks the event bundle as null -> not yet bundled
      expect(mockEntityBuilder.setEventBundle).to.have.been.calledWith(mockEvent, null);
      // stores in entity repository
      expect(mockEntityRepository.storeEvent).to.have.been.calledWith(mockEvent);
    });

    it('validates with the Entity Builder and proxies the ValidationError', async () => {
      mockEntityBuilder.validateEvent.throws(new ValidationError('an error'));

      await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(ValidationError);
    });

    it('checks if target asset exists in Entity Repository', async () => {
      mockEntityRepository.getAsset.resolves(null);

      await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(InvalidParametersError);
    });
  });
});
