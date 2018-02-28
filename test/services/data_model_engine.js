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
import resetHistory from '../helpers/reset_history';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Data Model Engine', () => {
  let mockAsset;
  let mockEvent;

  let web3;
  let identityManager;

  before(async () => {
    web3 = await createWeb3();
    identityManager = new IdentityManager(web3);
    mockAsset = createAsset();
    mockEvent = createEvent();
  });

  describe('Create account', () => {
    let mockIdentityManager;
    let mockAccountRepository;
    let mockAccountAccessDefinitions;
    let modelEngine;

    before(() => {
      mockIdentityManager = {
        createKeyPair: sinon.stub()
      };
      mockAccountRepository = {
        store: sinon.stub(),
        get: sinon.stub(),
        count: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureHasPermission: sinon.stub(),
        defaultAdminPermissions: sinon.stub(),
        validateNewAccountRequest: sinon.stub()
      };
      modelEngine = new DataModelEngine(mockIdentityManager, {}, {}, mockAccountRepository, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockIdentityManager, mockAccountRepository, mockAccountAccessDefinitions);

      mockIdentityManager.createKeyPair.returns(pkPair);
      mockAccountRepository.get.returns(adminAccount);
      mockAccountAccessDefinitions.validateNewAccountRequest.resolves();
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
    });

    it('validates with mockIdentityManager and delegates to accountRepository', async () => {
      const request = createAccountRequest();
      expect(await modelEngine.createAccount(request.content)).to.eq(pkPair);

      expect(mockAccountAccessDefinitions.validateNewAccountRequest).to.have.been.called;
      expect(mockAccountRepository.store).to.have.been.calledWith({
        ...pkPair,
        permissions: request.content.idData.permissions
      });
      expect(mockAccountRepository.get).to.have.been.calledWith(request.content.idData.createdBy);
    });

    it('throws ValidationError if wrong request format', async () => {
      mockAccountAccessDefinitions.validateNewAccountRequest.throws(new ValidationError('an error'));

      const request = createAccountRequest();
      await expect(modelEngine.createAccount(request.content)).to.be.rejectedWith(ValidationError);
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());

      const request = createAccountRequest();
      await expect(modelEngine.createAccount(request.content)).to.be.rejectedWith(PermissionError);
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
    let mockAccountRepository;
    let modelEngine;

    before(() => {
      mockAccountRepository = {
        get: sinon.stub()
      };
      modelEngine = new DataModelEngine({}, {}, {}, mockAccountRepository, {});
    });

    beforeEach(() => {
      resetHistory(mockAccountRepository);

      mockAccountRepository.get.returns(pkPair);
    });

    it('delegates to accountRepository', async () => {
      expect(await modelEngine.getAccount()).to.eq(pkPair);
      expect(mockAccountRepository.get).to.have.been.called;
    });

    it('throws NotFoundError if non-existing', async () => {
      mockAccountRepository.get.returns(null);

      await expect(modelEngine.getAccount()).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Creating an asset', () => {
    let mockEntityBuilder;
    let mockEntityRepository;
    let mockAccountRepository;
    let modelEngine;

    before(() => {
      mockEntityBuilder = {
        validateAsset: sinon.stub(),
        setBundle: sinon.stub()
      };
      mockEntityRepository = {
        storeAsset: sinon.stub()
      };
      mockAccountRepository = {
        get: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, mockEntityBuilder, mockEntityRepository, mockAccountRepository, {}, {});
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository, mockAccountRepository);

      mockEntityBuilder.validateAsset.returns();
      mockEntityBuilder.setBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();
      mockAccountRepository.get.resolves(accountWithSecret);
    };

    describe('positive case', () => {
      before(async () => {
        restoreDefaultBehaviour();

        await expect(modelEngine.createAsset(mockAsset)).to.be.fulfilled;
      });

      it('validates with Entity Builder', () => {
        expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
      });

      it('checks if creator address is registered', () => {
        expect(mockAccountRepository.get).to.have.been.calledWith(mockAsset.content.idData.createdBy);
      });

      it('sets the bundle to be null', () => {
        expect(mockEntityBuilder.setBundle).to.have.been.calledWith(mockAsset, null);
      });

      it('stores the asset in the repository', () => {
        expect(mockEntityRepository.storeAsset).to.have.been.calledWith(mockAsset);
      });
    });

    describe('negative case', () => {
      beforeEach(() => {
        restoreDefaultBehaviour();
      });

      it('throws if creator address is not registered', async () => {
        mockAccountRepository.get.resolves(null);
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(PermissionError);
      });

      it('throws if Entity Builder validation fails', async () => {
        mockEntityBuilder.validateAsset.throws(new ValidationError('an error'));
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(ValidationError);
      });
    });
  });

  describe('Getting an asset by id', () => {
    let mockEntityRepository;
    let modelEngine;
    const exampleAssetId = '0x123';

    before(() => {
      mockEntityRepository = {
        getAsset: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, {}, mockEntityRepository, {}, {}, {});
    });

    beforeEach(() => {
      resetHistory(mockEntityRepository);
    });

    it('asks the repository for the asset', async () => {
      mockEntityRepository.getAsset.resolves(mockAsset);

      const asset = await modelEngine.getAsset(exampleAssetId);

      expect(mockEntityRepository.getAsset).to.have.been.calledWith(exampleAssetId);
      expect(asset).to.deep.equal(mockAsset);
    });

    it('throws if asset not found', async () => {
      mockEntityRepository.getAsset.resolves(null);

      await expect(modelEngine.getAsset(exampleAssetId)).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Creating an event', () => {
    let mockEntityBuilder;
    let mockEntityRepository;
    let mockAccountRepository;
    let modelEngine;

    before(() => {
      mockEntityBuilder = {
        validateEvent: sinon.stub(),
        setBundle: sinon.stub()
      };
      mockEntityRepository = {
        storeEvent: sinon.stub(),
        getAsset: sinon.stub()
      };
      mockAccountRepository = {
        get: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, mockEntityBuilder, mockEntityRepository, mockAccountRepository, {}, {});
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository, mockAccountRepository);

      mockEntityBuilder.validateEvent.returns();
      mockEntityBuilder.setBundle.returns(mockEvent);
      mockEntityRepository.storeEvent.resolves();
      mockEntityRepository.getAsset.resolves(mockAsset);
      mockAccountRepository.get.resolves(accountWithSecret);
    };

    describe('positive case', () => {
      before(async () => {
        restoreDefaultBehaviour();

        await expect(modelEngine.createEvent(mockEvent)).to.have.been.fulfilled;
      });

      it('validates with Entity Builder', () => {
        expect(mockEntityBuilder.validateEvent).to.have.been.calledWith(mockEvent);
      });

      it('checks if creator address is registered', () => {
        expect(mockAccountRepository.get).to.have.been.calledWith(mockEvent.content.idData.createdBy);
      });

      it('checks if target asset exists', () => {
        expect(mockEntityRepository.getAsset).to.have.been.calledWith(mockEvent.content.idData.assetId);
      });

      it('sets the bundle to be null', () => {
        expect(mockEntityBuilder.setBundle).to.have.been.calledWith(mockEvent, null);
      });

      it('stores the asset in the repository', () => {
        expect(mockEntityRepository.storeEvent).to.have.been.calledWith(mockEvent);
      });
    });

    describe('negative', () => {
      beforeEach(() => {
        restoreDefaultBehaviour();
      });

      it('throws if creator address is not registered', async () => {
        mockAccountRepository.get.resolves(null);
        await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(PermissionError);
      });

      it('throws if Entity Builder validation fails', async () => {
        mockEntityBuilder.validateEvent.throws(new ValidationError('an error'));

        await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(ValidationError);
      });

      it('throws if target asset doesn\'t exists in Entity Repository', async () => {
        mockEntityRepository.getAsset.resolves(null);

        await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(InvalidParametersError);
      });
    });
  });

  describe('Getting an event by id', () => {
    let mockEntityRepository;
    let modelEngine;
    const exampleEventId = '0x123';

    before(() => {
      mockEntityRepository = {
        getEvent: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, {}, mockEntityRepository, {}, {}, {});
    });

    beforeEach(() => {
      resetHistory(mockEntityRepository);
    });

    it('asks the repository for the event', async () => {
      mockEntityRepository.getEvent.resolves(mockEvent);

      const event = await modelEngine.getEvent(exampleEventId);

      expect(mockEntityRepository.getEvent).to.have.been.calledWith(exampleEventId);
      expect(event).to.deep.equal(mockEvent);
    });

    it('throws if event not found', async () => {
      mockEntityRepository.getEvent.resolves(null);

      await expect(modelEngine.getEvent(exampleEventId)).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Finding events', () => {
    let mockEntityRepository;
    let modelEngine;

    let scenario;
    let eventSet;
    const mockParams = {'a param': 'a value'};

    let ret;

    before(async () => {
      mockEntityRepository = {
        findEvents: sinon.stub()
      };

      scenario = new ScenarioBuilder(identityManager);
      await scenario.injectAccount(adminAccountWithSecret);
      await scenario.addAsset(0);
      eventSet = [
        await scenario.addEvent(0, 0)
      ];
      mockEntityRepository.findEvents.resolves({results: eventSet, resultCount: 165});

      modelEngine = new DataModelEngine({}, {}, mockEntityRepository, {}, {}, {});

      ret = await expect(modelEngine.findEvents(mockParams)).to.fulfilled;
    });

    it('asks the entity repository for the events', async () => {
      expect(mockEntityRepository.findEvents).to.have.been.calledWith(mockParams);
    });

    it('properly assembles the result', () => {
      expect(ret.results).to.equal(eventSet);
      expect(ret.resultCount).to.equal(165);
    });
  });


  describe('Finalising a bundle', () => {
    let mockEntityRepository;
    let mockEntityBuilder;
    let mockIdentityManager;
    let modelEngine;

    let clock;
    let scenario;

    const nodeSecret = 'nodeSecret';
    let unbundledAssets;
    let unbundledEvents;
    let assembledBundle;

    let ret;

    before(async () => {
      clock = sinon.useFakeTimers();
      scenario = new ScenarioBuilder(identityManager);
      await scenario.injectAccount(adminAccountWithSecret);
      unbundledAssets = [
        await scenario.addAsset(0, {timestamp: 0}),
        await scenario.addAsset(0, {timestamp: 1})
      ];
      unbundledEvents = [
        await scenario.addEvent(0, 0, {timestamp: 0}),
        await scenario.addEvent(0, 0, {timestamp: 1}),
        await scenario.addEvent(0, 0, {timestamp: 2})
      ];

      assembledBundle = {
        bundleId: 'a mock bundle',
        contents: {
          entries: [
            ...unbundledAssets,
            ...unbundledEvents
          ]
        }
      };

      mockEntityBuilder = {
        assembleBundle: sinon.stub(),
        setBundle: sinon.stub()
      };

      mockEntityRepository = {
        getAssetsWithoutBundle: sinon.stub(),
        getEventsWithoutBundle: sinon.stub(),
        storeBundle: sinon.stub(),
        storeAsset: sinon.stub(),
        storeEvent: sinon.stub()
      };

      mockIdentityManager = {
        nodePrivateKey: sinon.stub()
      };

      mockEntityRepository.getAssetsWithoutBundle.resolves(unbundledAssets);
      mockEntityRepository.getEventsWithoutBundle.resolves(unbundledEvents);
      mockEntityBuilder.assembleBundle.returns(assembledBundle);
      mockEntityBuilder.setBundle.returnsArg(0);
      mockEntityRepository.storeBundle.resolves();
      mockEntityRepository.storeAsset.resolves();
      mockEntityRepository.storeEvent.resolves();
      mockIdentityManager.nodePrivateKey.resolves(nodeSecret);

      modelEngine = new DataModelEngine(mockIdentityManager, mockEntityBuilder, mockEntityRepository, {}, {}, {});

      ret = await expect(modelEngine.finaliseBundle()).to.be.fulfilled;
    });

    after(() => {
      clock.restore();
    });

    it('gets unbundled assets and events from the repository', async () => {
      expect(mockEntityRepository.getAssetsWithoutBundle).to.have.been.called;
      expect(mockEntityRepository.getEventsWithoutBundle).to.have.been.called;
    });

    it('orders the entity builder to assemble the bundle JSON', async () => {
      expect(mockIdentityManager.nodePrivateKey).to.have.been.called;
      expect(mockEntityBuilder.assembleBundle).to.have.been.calledWith(unbundledAssets, unbundledEvents, Date.now(), nodeSecret);
    });

    it('stores the bundle it in the repository', async () => {
      expect(mockEntityRepository.storeBundle).to.have.been.calledWith(assembledBundle);
    });

    it('set the bundle metadata for all the now bundled assets and events', async () => {
      expect(mockEntityBuilder.setBundle).to.have.callCount(unbundledAssets.length + unbundledEvents.length);
      expect(mockEntityRepository.storeAsset).to.have.callCount(unbundledAssets.length);
      expect(mockEntityRepository.storeEvent).to.have.callCount(unbundledEvents.length);
    });

    it('returns the bundle', async () => { 
      expect(ret).to.be.deep.eq(assembledBundle);
    });
  });
});
