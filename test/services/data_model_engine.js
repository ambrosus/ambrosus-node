import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import DataModelEngine from '../../src/services/data_model_engine';
import {NotFoundError, ValidationError, InvalidParametersError} from '../../src/errors/errors';

import {createAsset, createEvent} from '../fixtures/asset_fixture_builder';
import pkPair from '../fixtures/pk_pair';
import {createAccountRequest, adminAccount} from '../fixtures/account';

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
      createKeyPair: sinon.stub(),
      validateSignature: sinon.stub()
    };
    mockAccountRepository = {
      store: sinon.stub(),
      get: sinon.stub(),
      update: sinon.stub()
    };
    mockEntityBuilder = {
      validateAsset: sinon.stub(),
      setAssetBundle: sinon.stub(),
      validateEvent: sinon.stub(),
      setEventBundle: sinon.stub()
    };
    mockEntityRepository = {
      storeAsset: sinon.stub(),
      getAsset: sinon.stub(),
      storeEvent: sinon.stub(),
      getEvent: sinon.stub()
    };
    modelEngine = new DataModelEngine(mockIdentityManager, mockEntityBuilder, mockEntityRepository,
      mockAccountRepository);
  });

  describe('Create account', () => {
    it('validatest with mockIdentityManager and delegates to accountRepository', async () => {
      const request = createAccountRequest({createdBy: adminAccount.address});
      mockAccountRepository.get.returns(adminAccount);
      mockIdentityManager.createKeyPair.returns(pkPair);
      expect(await modelEngine.createAccount(request.content.idData, request.content.signature)).to.eq(pkPair);
      expect(mockIdentityManager.validateSignature).to.have.been.called;
      expect(mockAccountRepository.update).to.have.been.calledWith(adminAccount.address, {lastActionAt: request.content.idData.timestamp});
      expect(mockAccountRepository.store).to.have.been.calledWith({timestamp: request.content.idData.timestamp, ...pkPair});
      expect(mockAccountRepository.get).to.have.been.calledWith(request.content.idData.createdBy);
    });

    it('throws ValidationError if no timestamp', async () => {
      const request = createAccountRequest({timestamp: undefined});
      expect(modelEngine.createAccount(request.content.idData, request.content.signature))
        .to.eventually.be.rejectedWith(ValidationError);
    });

    it('throws ValidationError if reply attack', async () => {
      const request = createAccountRequest();
      mockAccountRepository.get.returns(adminAccount);      
      mockIdentityManager.createKeyPair.returns(pkPair);      
      expect(await modelEngine.createAccount(request.content.idData, request.content.signature))
        .to.eq(pkPair);
      mockAccountRepository.get.returns({...adminAccount, lastActionAt: '1'});
      expect(modelEngine.createAccount(request.content.idData, request.content.signature))
        .to.eventually.be.rejectedWith(ValidationError);      
    });

    it('throws ValidationError if signature is wrong', async () => {
      const request = createAccountRequest();
      mockIdentityManager.validateSignature.throws(new ValidationError('an error'));
      await expect(modelEngine.createAccount(request.content.idData, request.content.signature))
        .to.be.rejectedWith(ValidationError);
    });
  });

  describe('Get account', () => {
    it('delegates to accountRepository', async () => {
      mockAccountRepository.get.returns(pkPair);
      expect(await modelEngine.getAccount()).to.eq(pkPair);
      expect(mockAccountRepository.get).to.have.been.called;
    });

    it('throws NotFoundError if non-existing', async () => {
      mockAccountRepository.get.returns(null);
      await expect(modelEngine.getAccount())
        .to.eventually.be.rejectedWith(NotFoundError);
    });
  });

  describe('Creating an asset', () => {
    it('validates with Entity Builder and sends to Entity Storage', async () => {
      mockEntityBuilder.setAssetBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();

      await expect(modelEngine.createAsset(mockAsset));

      expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
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

    it('asks the respository for the asset', async () => {
      const asset = await modelEngine.getAsset(exampleAssetId);

      expect(mockEntityRepository.getAsset).to.have.been.calledWith(exampleAssetId);
      expect(asset).to.deep.equal(mockAsset);
    });

    it('throws if asset not found', async () => {
      await expect(modelEngine.getAsset('notexistingAsset')).to.be.rejectedWith(NotFoundError);

      expect(mockEntityRepository.getAsset).to.have.been.calledWith('notexistingAsset');
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

  describe('getting an event by id', () => {
    const exampleEventId = '0x123';
    beforeEach(() => {
      mockEntityRepository.getEvent.resolves(null);
      mockEntityRepository.getEvent.withArgs(exampleEventId).resolves(mockEvent);
    });

    it('asks the respository for the event', async () => {
      const asset = await modelEngine.getEvent(exampleEventId);

      expect(mockEntityRepository.getEvent).to.have.been.calledWith(exampleEventId);
      expect(asset).to.deep.equal(mockEvent);
    });

    it('throws if event not found', async () => {
      await expect(modelEngine.getEvent('notexistingEvent')).to.be.rejectedWith(NotFoundError);

      expect(mockEntityRepository.getEvent).to.have.been.calledWith('notexistingEvent');
    });
  });
});
