import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {pick, put} from '../../src/utils/dict_utils';

import DataModelEngine from '../../src/services/data_model_engine';
import {InvalidParametersError, NotFoundError, PermissionError, ValidationError} from '../../src/errors/errors';

import {createAsset, createBundle, createEvent} from '../fixtures/assets_events';
import {account, accountWithSecret, addAccountRequest, adminAccount, adminAccountWithSecret} from '../fixtures/account';

import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';

import createTokenFor from '../fixtures/create_token_for';
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
        validateAddAccountRequest: sinon.stub()
      };
      modelEngine = new DataModelEngine(mockIdentityManager, {}, {}, {}, {}, mockAccountRepository, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockIdentityManager, mockAccountRepository, mockAccountAccessDefinitions);

      mockAccountRepository.get.returns(adminAccount);
      mockAccountAccessDefinitions.validateAddAccountRequest.resolves();
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
    });

    it('validates with mockIdentityManager and delegates to accountRepository', async () => {
      const request = addAccountRequest();
      const registrationResponse = {
        address: account.address,
        permissions: ['permission1', 'permission2'],
        registeredBy: adminAccount.address,
        accessLevel: 7
      };
      expect(await modelEngine.addAccount(request, createTokenFor(adminAccount.address)))
        .to.deep.equal(registrationResponse);
      expect(mockAccountAccessDefinitions.validateAddAccountRequest).to.have.been.called;
      expect(mockAccountAccessDefinitions.ensureHasPermission)
        .to.have.been.calledWith(adminAccount.address, 'register_account');
      expect(mockAccountRepository.store).to.have.been.calledWith({
        registeredBy : adminAccount.address,
        ...registrationResponse
      });
    });

    it('throws ValidationError if wrong request format', async () => {
      mockAccountAccessDefinitions.validateAddAccountRequest.throws(new ValidationError('an error'));

      const request = addAccountRequest();
      await expect(modelEngine.addAccount(request, createTokenFor(adminAccount.address))).to.be.rejectedWith(ValidationError);
    });

    it('throws PermissionError if account sender account does not exist', async () => {
      mockAccountAccessDefinitions.ensureHasPermission.rejects(new PermissionError());

      const request = addAccountRequest();
      await expect(modelEngine.addAccount(request, createTokenFor(adminAccount.address))).to.be.rejectedWith(PermissionError);
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());

      const request = addAccountRequest();
      await expect(modelEngine.addAccount(request, createTokenFor(adminAccount.address))).to.be.rejectedWith(PermissionError);
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
    let mockAccountAccessDefinitions;
    let account;
    let accountWithoutSecret;

    before(() => {
      mockAccountRepository = {
        get: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureHasPermission: sinon.stub(),
        defaultAdminPermissions: sinon.stub(),
        validateAddAccountRequest: sinon.stub()
      };
      modelEngine = new DataModelEngine({}, {}, {}, {}, {}, mockAccountRepository, mockAccountAccessDefinitions);
      account = put(accountWithSecret, {registeredBy : adminAccount.address, permissions : ['perm1', 'perm2']});
      accountWithoutSecret = pick(account, 'secret');
    });

    beforeEach(() => {
      resetHistory(mockAccountRepository);
      mockAccountRepository.get.returns(accountWithoutSecret);
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
    });

    it('delegates to accountRepository', async () => {
      expect(await modelEngine.getAccount(account.address, {createdBy : adminAccount.address})).to.eq(accountWithoutSecret);
      expect(mockAccountRepository.get).to.have.been.called;
    });

    it('throws PermissionError if non-existing sender', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(modelEngine.getAccount(account.address, {createdBy : adminAccount.address})).to.be.rejectedWith(PermissionError);
    });

    it('throws NotFoundError if non-existing account requested', async () => {
      mockAccountRepository.get.withArgs(adminAccount.address).resolves(adminAccount);
      mockAccountRepository.get.withArgs(account.address).resolves(null);
      await expect(modelEngine.getAccount(account.address, {createdBy : adminAccount.address})).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Modify account', () => {
    let mockAccountRepository;
    let modelEngine;
    let mockAccountAccessDefinitions;
    const account = put(accountWithSecret, {registeredBy : adminAccount.address, permissions : ['perm1', 'perm2']});
    const accountWithoutSecret = pick(account, 'secret');
    const modifyRequest = {permissions : ['changedPerm1', 'changedPerm2']};
    const accountToModify = accountWithoutSecret.address;
    const modifiedAccount = put(accountWithoutSecret, modifyRequest);

    before(() => {
      mockAccountRepository = {
        update: sinon.stub(),
        get: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureHasPermission: sinon.stub(),
        defaultAdminPermissions: sinon.stub(),
        validateAddAccountRequest: sinon.stub(),
        validateModifyAccountRequest: sinon.stub()
      };
      modelEngine = new DataModelEngine({}, {}, {}, {}, {}, mockAccountRepository, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockAccountRepository);
      mockAccountRepository.update.returns(modifiedAccount);
      mockAccountRepository.get.withArgs(adminAccount.address).returns(adminAccount);
      mockAccountRepository.get.withArgs(accountToModify).returns(accountWithoutSecret);
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
      mockAccountAccessDefinitions.validateModifyAccountRequest.resolves();
    });

    it('delegates to accountRepository', async () => {
      expect(await modelEngine.modifyAccount(accountToModify, modifyRequest, {createdBy : adminAccount.address})).to.deep.equal(modifiedAccount);
      expect(mockAccountRepository.update).to.have.been.called;
    });

    it('throws PermissionError if non-existing sender', async () => {
      mockAccountRepository.get.withArgs(adminAccount.address).returns(null);
      await expect(modelEngine.modifyAccount(accountToModify, modifyRequest, {createdBy : adminAccount.address})).to.rejectedWith(PermissionError);
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());
      await expect(modelEngine.modifyAccount(accountToModify, modifyRequest, {createdBy : adminAccount.address})).to.rejectedWith(PermissionError);
    });

    it('throws NotFoundError if modification of non-existing account requested', async () => {
      mockAccountRepository.get.withArgs('0x1234').returns(null);
      await expect(modelEngine.modifyAccount('0x1234', modifyRequest, {createdBy : adminAccount.address})).to.rejectedWith(NotFoundError);
    });
  });

  describe('Creating an asset', () => {
    let mockEntityBuilder;
    let mockEntityRepository;
    let mockAccountAccessDefinitions;
    let modelEngine;

    before(() => {
      mockEntityBuilder = {
        validateAsset: sinon.stub(),
        setBundle: sinon.stub()
      };
      mockEntityRepository = {
        storeAsset: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureHasPermission: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, mockEntityRepository,{}, {}, mockAccountAccessDefinitions);
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository);

      mockEntityBuilder.validateAsset.returns();
      mockEntityBuilder.setBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
    };

    describe('positive case', () => {
      before(async () => {
        restoreDefaultBehaviour();
        await expect(modelEngine.createAsset(mockAsset)).to.be.fulfilled;
      });

      it('validates with Entity Builder', () => {
        expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
      });

      it('checks if creator has required permission', async () => {
        expect(mockAccountAccessDefinitions.ensureHasPermission)
          .to.have.been.calledWith(mockAsset.content.idData.createdBy, 'create_entity');
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

      it('throws if creator has no permission for adding assets', async () => {
        mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(PermissionError);
        expect(mockEntityRepository.storeAsset).to.have.been.not.called;
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

      modelEngine = new DataModelEngine({}, {}, {}, mockEntityRepository, {}, {}, {}, {});
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
    let mockAccountAccessDefinitions;
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
      mockAccountAccessDefinitions = {
        ensureHasPermission: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, mockEntityRepository,{}, {}, mockAccountAccessDefinitions);
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository);

      mockEntityBuilder.validateEvent.returns();
      mockEntityBuilder.setBundle.returns(mockEvent);
      mockEntityRepository.storeEvent.resolves();
      mockEntityRepository.getAsset.resolves(mockAsset);
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
    };

    describe('positive case', () => {
      before(async () => {
        restoreDefaultBehaviour();
        await expect(modelEngine.createEvent(mockEvent)).to.have.been.fulfilled;
      });

      it('validates with Entity Builder', () => {
        expect(mockEntityBuilder.validateEvent).to.have.been.calledWith(mockEvent);
      });

      it('checks if creator has required permission', async () => {
        expect(mockAccountAccessDefinitions.ensureHasPermission)
          .to.have.been.calledWith(mockEvent.content.idData.createdBy, 'create_entity');
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

      it('throws if creator has no required permission', async () => {
        mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());
        await expect(modelEngine.createEvent(mockAsset)).to.be.rejectedWith(PermissionError);
        expect(mockEntityRepository.storeEvent).to.have.been.not.called;
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
    let mockAccountAccessDefinitions;
    let modelEngine;
    const exampleEventId = '0x123';
    const accessLevel = 4;

    before(() => {
      mockEntityRepository = {
        getEvent: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        getTokenCreatorAccessLevel: sinon.stub()
      };
      modelEngine = new DataModelEngine({}, {}, {}, mockEntityRepository, {}, {}, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockEntityRepository, mockAccountAccessDefinitions);
      mockEntityRepository.getEvent.resolves(mockEvent);
      mockAccountAccessDefinitions.getTokenCreatorAccessLevel.resolves(accessLevel);
    });

    it('asks the repository for the event', async () => {
      const event = await modelEngine.getEvent(exampleEventId);

      expect(mockEntityRepository.getEvent).to.have.been.calledWith(exampleEventId, accessLevel);
      expect(event).to.deep.equal(mockEvent);
    });

    it('throws if event not found', async () => {
      mockEntityRepository.getEvent.resolves(null);

      await expect(modelEngine.getEvent(exampleEventId)).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Finding events', () => {
    let mockEntityRepository;
    let mockAccountAccessDefinitions;
    let mockEntityBuilder;
    let modelEngine;
    const accessLevel = 4;

    let scenario;
    let eventSet;
    const mockParams = {'a param': 'a value'};
    const mockParams2 = {'a param2': 'a value2'};

    let ret;

    before(async () => {
      mockEntityRepository = {
        findEvents: sinon.stub()
      };

      mockEntityBuilder = {
        validateAndCastFindEventsParams: sinon.stub()
      };

      mockAccountAccessDefinitions = {
        getTokenCreatorAccessLevel: sinon.stub()
      };

      scenario = new ScenarioBuilder(identityManager);
      await scenario.injectAccount(adminAccountWithSecret);
      await scenario.addAsset(0);
      eventSet = [
        await scenario.addEvent(0, 0)
      ];
      mockEntityRepository.findEvents.resolves({results: eventSet, resultCount: 165});
      mockEntityBuilder.validateAndCastFindEventsParams.returns(mockParams2);
      mockAccountAccessDefinitions.getTokenCreatorAccessLevel.resolves(accessLevel);

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, mockEntityRepository,
        {}, {}, mockAccountAccessDefinitions);

      ret = await expect(modelEngine.findEvents(mockParams)).to.fulfilled;
    });

    it('asks the entity builder for parameters validation', () => {
      expect(mockEntityBuilder.validateAndCastFindEventsParams).to.have.been.calledWith(mockParams);
    });

    it('asks the entity repository for the events', async () => {
      expect(mockEntityRepository.findEvents).to.have.been.calledWith(mockParams2, accessLevel);
    });

    it('properly assembles the result', () => {
      expect(ret.results).to.equal(eventSet);
      expect(ret.resultCount).to.equal(165);
    });

    it('throws InvalidParametersError when parameter validation is not successful', async () => {
      const mockParams = {'a param': 'a value'};
      mockEntityBuilder.validateAndCastFindEventsParams.throws(new InvalidParametersError);

      await expect(modelEngine.findEvents(mockParams)).to.be.rejectedWith(InvalidParametersError);

      // asks the entity builder for parameters validation
      expect(mockEntityBuilder.validateAndCastFindEventsParams).to.have.been.calledWith(mockParams);
    });
  });

  describe('Getting a bundle by id', () => {
    let mockEntityRepository;
    let mockEntityBuilder;
    let modelEngine;

    let ret;

    const exampleBundleId = '0xabcdef';
    const exampleBundle = put(createBundle(), 'bundleId', exampleBundleId);

    before(async () => {
      mockEntityRepository = {
        getBundle: sinon.stub()
      };



      mockEntityRepository.getBundle.resolves(exampleBundle);

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, mockEntityRepository, {}, {}, {});

      ret = await expect(modelEngine.getBundle(exampleBundleId)).to.fulfilled;
    });

    it('asks the entity repository for the bundle', async () => {
      expect(mockEntityRepository.getBundle).to.have.been.calledWith(exampleBundleId);
    });

    it('properly assembles the result', () => {
      expect(ret).to.equal(exampleBundle);
    });

    it('throws NotFoundError when bundle with requested id does not exist', async () => {
      mockEntityRepository.getBundle.resolves(null);
      await expect(modelEngine.getBundle(exampleBundleId)).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Finalising a bundle', () => {
    let mockEntityRepository;
    let mockEntityBuilder;
    let mockIdentityManager;
    let mockProofRepository;
    let modelEngine;

    let clock;
    let scenario;

    const bundleStubId = 'abc';
    const nodeSecret = 'nodeSecret';
    const blockNumber = 10;
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
        await scenario.addEvent(0, 1, {timestamp: 2})
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
        assembleBundle: sinon.stub()
      };

      mockEntityRepository = {
        beginBundle: sinon.stub(),
        endBundle: sinon.stub(),
        storeBundle: sinon.stub(),
        storeBundleProofBlock: sinon.stub()
      };

      mockIdentityManager = {
        nodePrivateKey: sinon.stub()
      };

      mockProofRepository = {
        uploadProof: sinon.stub()
      };

      mockIdentityManager.nodePrivateKey.resolves(nodeSecret);
      mockEntityBuilder.assembleBundle.returns(assembledBundle);
      mockEntityRepository.beginBundle.resolves({
        assets: unbundledAssets,
        events: unbundledEvents
      });
      mockEntityRepository.endBundle.resolves();
      mockEntityRepository.storeBundle.resolves();
      mockProofRepository.uploadProof.resolves({blockNumber});

      modelEngine = new DataModelEngine(mockIdentityManager, {}, mockEntityBuilder, mockEntityRepository, mockProofRepository, {}, {});

      ret = await expect(modelEngine.finaliseBundle(bundleStubId)).to.be.fulfilled;
    });

    after(() => {
      clock.restore();
    });

    it('begins a new bundling procedure in the repository', () => {
      expect(mockEntityRepository.beginBundle).to.have.been.calledWith(bundleStubId);
    });

    it('asks the identity manager for the node private key', () => {
      expect(mockIdentityManager.nodePrivateKey).to.have.been.called;
    });

    it('orders the entity builder to assemble the bundle JSON', () => {
      expect(mockEntityBuilder.assembleBundle).to.have.been.calledWith(unbundledAssets, unbundledEvents, Date.now(), nodeSecret);
    });

    it('stores the bundle it in the repository', () => {
      expect(mockEntityRepository.storeBundle).to.have.been.calledWith(assembledBundle);
    });

    it('ends the bundling procedure in the repository', () => {
      expect(mockEntityRepository.endBundle).to.have.been.calledWith(bundleStubId, assembledBundle.bundleId);
    });

    it('uploads the proof to the registry contract', () => {
      expect(mockProofRepository.uploadProof).to.have.been.calledWith(assembledBundle.bundleId);
    });

    it('returns the bundle', () => {
      expect(ret).to.be.deep.eq(assembledBundle);
    });

    it('stores block number in metadata', async () => {
      expect(mockEntityRepository.storeBundleProofBlock).to.have.been.calledWith(assembledBundle.bundleId, blockNumber);
    });
  });
});
