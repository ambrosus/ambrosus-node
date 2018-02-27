import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import DataModelEngine from '../../src/services/data_model_engine';
import {InvalidParametersError, NotFoundError, PermissionError, ValidationError} from '../../src/errors/errors';

import {createAsset, createEvent} from '../fixtures/assets_events';
import {accountWithSecret, adminAccount, adminAccountWithSecret, createAccountRequest} from '../fixtures/account';
import pkPair from '../fixtures/pk_pair';

import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Data Model Engine', () => {
  let modelEngine = null;
  let mockIdentityManager = null;
  let mockEntityBuilder = null;
  let mockEntityRepository = null;
  let mockAccountRepository = null;
  let mockAccountAccessDefinitions = null;

  let mockAsset;
  let mockEvent;

  let scenario;

  let web3;
  let clock;

  before(async () => {
    web3 = await createWeb3();
    scenario = new ScenarioBuilder(new IdentityManager(web3));

    clock = sinon.useFakeTimers();
  });

  beforeEach(async () => {
    mockAsset = createAsset();
    mockEvent = createEvent();
    scenario.reset();
    await scenario.injectAccount(adminAccountWithSecret);

    mockIdentityManager = {
      createKeyPair: sinon.stub(),
      validateSignature: sinon.stub(),
      nodePrivateKey: sinon.stub()
    };
    mockAccountRepository = {
      store: sinon.stub(),
      get: sinon.stub(),
      count: sinon.stub()
    };
    mockEntityBuilder = {
      validateAsset: sinon.stub(),
      setBundle: sinon.stub(),
      validateEvent: sinon.stub(),
      assembleBundle: sinon.stub()
    };
    mockEntityRepository = {
      storeAsset: sinon.stub(),
      getAsset: sinon.stub(),
      storeEvent: sinon.stub(),
      getEvent: sinon.stub(),
      findEvents: sinon.stub(),
      getEventsWithoutBundle: sinon.stub(),
      getAssetsWithoutBundle: sinon.stub(),
      storeBundle: sinon.stub()
    };
    mockAccountAccessDefinitions = {
      ensureHasPermission: sinon.stub(),
      defaultAdminPermissions: sinon.stub(),
      validateNewAccountRequest: sinon.stub()
    };

    modelEngine = new DataModelEngine(mockIdentityManager, mockEntityBuilder, mockEntityRepository,
      mockAccountRepository, mockAccountAccessDefinitions);
  });

  after(() => {
    clock.restore();
  });

  describe('Create account', () => {
    beforeEach(() => {
      mockAccountRepository.get.returns(adminAccount);
    });

    it('validates with mockIdentityManager and delegates to accountRepository', async () => {
      const request = createAccountRequest();
      mockIdentityManager.createKeyPair.returns(pkPair);
      expect(await modelEngine.createAccount(request.content)).to.eq(pkPair);
      expect(mockAccountAccessDefinitions.validateNewAccountRequest).to.have.been.called;
      expect(mockAccountRepository.store)
        .to.have.been.calledWith({...pkPair, permissions: request.content.idData.permissions});
      expect(mockAccountRepository.get).to.have.been.calledWith(request.content.idData.createdBy);
    });

    it('throws ValidationError if wrong request format', async () => {
      const request = createAccountRequest();
      mockAccountAccessDefinitions.validateNewAccountRequest.throws(new ValidationError('an error'));
      await expect(modelEngine.createAccount(request.content))
        .to.be.rejectedWith(ValidationError);
    });

    it('throws PermissionError if account misses required permissions', async () => {
      const request = createAccountRequest();
      mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());
      await expect(modelEngine.createAccount(request.content))
        .to.eventually.be.rejectedWith(PermissionError);
    });

    it('gives needed permissions to admin account', async () => {
      const permissions = ['a', 'b'];
      mockAccountAccessDefinitions.defaultAdminPermissions.returns(permissions);
      mockAccountRepository.count.resolves(0);
      await modelEngine.createAdminAccount(accountWithSecret);
      expect(mockAccountRepository.store).to.be.calledOnce;
      expect(mockAccountRepository.store).to.be.calledWith({...accountWithSecret, permissions});
    });

    it('not possible to overwrite admin permissions', async () => {
      const permissions = ['a', 'b'];
      mockAccountAccessDefinitions.defaultAdminPermissions.returns(permissions);
      mockAccountRepository.count.resolves(0);
      await modelEngine.createAdminAccount({...accountWithSecret, permissions: ['1', '2']});
      expect(mockAccountRepository.store).to.be.calledOnce;
      expect(mockAccountRepository.store).to.be.calledWith({...accountWithSecret, permissions});
    });

    it('cannot create admin if not first account', async () => {
      const permissions = ['a', 'b'];
      mockAccountAccessDefinitions.defaultAdminPermissions.returns(permissions);
      mockAccountRepository.count.resolves(1);
      await expect(modelEngine.createAdminAccount(accountWithSecret)).to.eventually.be.rejected;
      expect(mockAccountRepository.store).to.be.not.called;
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
      mockEntityBuilder.setBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();
      mockAccountRepository.get.resolves(accountWithSecret);

      await expect(modelEngine.createAsset(mockAsset));

      expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
      expect(mockAccountRepository.get).to.have.been.calledWith(mockAsset.content.idData.createdBy);
      expect(mockEntityBuilder.setBundle).to.have.been.calledWith(mockAsset, null);
      expect(mockEntityRepository.storeAsset).to.have.been.calledWith(mockAsset);
    });

    it('validate with the Entity Builder and proxies the ValidationError', async () => {
      mockEntityBuilder.validateAsset.throws(new ValidationError('an error'));

      await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(ValidationError);
    });

    it('throws if address does not exist', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(modelEngine.createAsset(mockEvent)).to.be.rejectedWith(PermissionError);
    });
  });

  describe('getting an asset by id', () => {
    const exampleAssetId = '0x123';
    beforeEach(() => {
      mockEntityRepository.getAsset.resolves(null);
      mockEntityRepository.getAsset.withArgs(exampleAssetId).resolves(mockAsset);
    });

    it('asks the repository for the asset', async () => {
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
      mockEntityBuilder.setBundle.returns(mockEvent);
      mockEntityRepository.storeEvent.resolves();
      mockEntityRepository.getAsset.resolves(mockAsset);
      mockAccountRepository.get.resolves(accountWithSecret);
    });

    it('coordinates all services', async () => {
      await expect(modelEngine.createEvent(mockEvent)).to.have.been.fulfilled;

      // validates
      expect(mockEntityBuilder.validateEvent).to.have.been.calledWith(mockEvent);
      // checks if creator exists
      expect(mockAccountRepository.get).to.have.been.calledWith(mockEvent.content.idData.createdBy);
      // checks if target asset exists
      expect(mockEntityRepository.getAsset).to.have.been.calledWith(mockEvent.content.idData.assetId);
      // marks the event bundle as null -> not yet bundled
      expect(mockEntityBuilder.setBundle).to.have.been.calledWith(mockEvent, null);
      // stores in entity repository
      expect(mockEntityRepository.storeEvent).to.have.been.calledWith(mockEvent);
    });

    it('throws if address does not exist', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(PermissionError);
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

    it('asks the repository for the event', async () => {
      const asset = await modelEngine.getEvent(exampleEventId);

      expect(mockEntityRepository.getEvent).to.have.been.calledWith(exampleEventId);
      expect(asset).to.deep.equal(mockEvent);
    });

    it('throws if event not found', async () => {
      await expect(modelEngine.getEvent('notexistingEvent')).to.be.rejectedWith(NotFoundError);

      expect(mockEntityRepository.getEvent).to.have.been.calledWith('notexistingEvent');
    });
  });

  describe('finding events', () => {
    it('coordinates all services', async () => {
      await scenario.addAsset(0);
      await scenario.addEvent(0, 0);
      const eventSet = scenario.events;
      mockEntityRepository.findEvents.resolves({results: eventSet, resultCount: 165});
      const mockParams = {'a param': 'a value'};

      const ret = await expect(modelEngine.findEvents(mockParams)).to.fulfilled;

      // asks the entity repository for the events
      expect(mockEntityRepository.findEvents).to.have.been.calledWith(mockParams);

      expect(ret.results).to.equal(eventSet);
      expect(ret.resultCount).to.equal(165);
    });
  });

  describe('finalising a bundle', () => {
    it('coordinates all services', async () => {
      await scenario.generateAssets(
        2,
        (inx) => ({
          account: 0,
          fields: {
            timestamp: inx
          }
        })
      );

      await scenario.generateEvents(
        3,
        (inx) => ({
          accountInx: 0,
          assetInx: 0,
          fields: {
            timestamp: inx
          }
        })
      );

      const unbundledAssets = scenario.assets;
      const unbundledEvents = scenario.events;
      const nodeSecret = 'nodeSecret';
      const assembledBundle = {
        bundleId: 'a mock bundle',
        contents: {
          entries: [
            ...unbundledAssets,
            ...unbundledEvents
          ]
        }
      };

      mockEntityRepository.getAssetsWithoutBundle.resolves(unbundledAssets);
      mockEntityRepository.getEventsWithoutBundle.resolves(unbundledEvents);
      mockEntityBuilder.assembleBundle.returns(assembledBundle);
      mockEntityBuilder.setBundle.returnsArg(0);
      mockEntityRepository.storeBundle.resolves();
      mockEntityRepository.storeAsset.resolves();
      mockEntityRepository.storeEvent.resolves();
      mockIdentityManager.nodePrivateKey.resolves(nodeSecret);

      const ret = await expect(modelEngine.finaliseBundle()).to.be.fulfilled;

      // get unbundled assets and events from the repository 
      expect(mockEntityRepository.getAssetsWithoutBundle).to.have.been.called;
      expect(mockEntityRepository.getEventsWithoutBundle).to.have.been.called;
      // create a bundle with the gathered assets and events and sign it
      expect(mockIdentityManager.nodePrivateKey).to.have.been.called;
      expect(mockEntityBuilder.assembleBundle).to.have.been.calledWith(unbundledAssets, unbundledEvents, Date.now(), nodeSecret);
      // store it in the repository
      expect(mockEntityRepository.storeBundle).to.have.been.calledWith(assembledBundle);
      // set the bundle metadata for all the now bundled assets and events
      expect(mockEntityBuilder.setBundle).to.have.callCount(unbundledAssets.length + unbundledEvents.length);
      expect(mockEntityRepository.storeAsset).to.have.callCount(unbundledAssets.length);
      expect(mockEntityRepository.storeEvent).to.have.callCount(unbundledEvents.length);

      // return the bundle
      expect(ret).to.be.deep.eq(assembledBundle);
    });
  });
});
