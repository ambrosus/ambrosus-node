/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

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

  describe('Adding admin account', () => {
    let mockIdentityManager;
    let mockAccountRepository;
    let mockAccountAccessDefinitions;
    const exampleAccount = adminAccount;
    const otherAccount = account;
    let modelEngine;

    before(() => {
      mockIdentityManager = {
        nodeAddress: sinon.stub()
      };
      mockAccountRepository = {
        store: sinon.stub(),
        get: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        defaultAdminAccount: sinon.stub()
      };
      modelEngine = new DataModelEngine(mockIdentityManager, {}, {}, {}, {}, {}, mockAccountRepository, {}, {}, {}, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockIdentityManager, mockAccountRepository, mockAccountAccessDefinitions);

      mockIdentityManager.nodeAddress.returns(exampleAccount.address);
      mockAccountRepository.get.resolves(exampleAccount);
      mockAccountAccessDefinitions.defaultAdminAccount.returns(exampleAccount);
    });

    it('takes the nodeAddress from the identityManager if no parameter provided and registers if not already registered', async () => {
      mockAccountRepository.get.resolves(null);

      await expect(modelEngine.addAdminAccount()).to.have.been.fulfilled;

      expect(mockIdentityManager.nodeAddress).to.have.been.called;
      expect(mockAccountRepository.get).to.have.been.calledWith(exampleAccount.address);
      expect(mockAccountAccessDefinitions.defaultAdminAccount).to.have.been.calledWith(exampleAccount.address);
      expect(mockAccountRepository.store).to.have.been.calledWith(exampleAccount);
    });

    it(`registers the provided address as an admin if not already registered`, async () => {
      mockAccountRepository.get.resolves(null);
      mockAccountAccessDefinitions.defaultAdminAccount.returns(otherAccount);

      await expect(modelEngine.addAdminAccount(otherAccount.address)).to.have.been.fulfilled;

      expect(mockIdentityManager.nodeAddress).to.have.not.been.called;
      expect(mockAccountRepository.get).to.have.been.calledWith(otherAccount.address);
      expect(mockAccountAccessDefinitions.defaultAdminAccount).to.have.been.calledWith(otherAccount.address);
      expect(mockAccountRepository.store).to.have.been.calledWith(otherAccount);
    });

    it('does nothing if account already registered', async () => {
      await expect(modelEngine.addAdminAccount()).to.have.been.fulfilled;

      expect(mockIdentityManager.nodeAddress).to.have.been.called;
      expect(mockAccountRepository.get).to.have.been.calledWith(exampleAccount.address);
      expect(mockAccountRepository.store).to.not.have.been.called;
    });
  });

  describe('Add account', () => {
    let mockIdentityManager;
    let mockAccountRepository;
    let mockAccountAccessDefinitions;
    let modelEngine;
    let clock;

    before(() => {
      clock = sinon.useFakeTimers(22000);

      mockIdentityManager = {
        createKeyPair: sinon.stub()
      };
      mockAccountRepository = {
        store: sinon.stub(),
        get: sinon.stub(),
        count: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanRegisterAccount: sinon.stub(),        
        validateAddAccountRequest: sinon.stub()
      };
      modelEngine = new DataModelEngine(mockIdentityManager, {}, {}, {}, {}, {}, mockAccountRepository, {}, {}, {}, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockIdentityManager, mockAccountRepository, mockAccountAccessDefinitions);

      mockAccountRepository.get.returns(adminAccount);
      mockAccountAccessDefinitions.validateAddAccountRequest.resolves();
      mockAccountAccessDefinitions.ensureCanRegisterAccount.resolves();
    });

    it('validates with mockIdentityManager and delegates to accountRepository', async () => {
      const request = addAccountRequest();
      const registrationResponse = {
        address: account.address,
        permissions: ['permission1', 'permission2'],
        registeredBy: adminAccount.address,
        registeredOn: 22,
        accessLevel: 7
      };
      expect(await modelEngine.addAccount(request, createTokenFor(adminAccount.address)))
        .to.deep.equal(registrationResponse);
      expect(mockAccountAccessDefinitions.validateAddAccountRequest).to.have.been.called;
      expect(mockAccountAccessDefinitions.ensureCanRegisterAccount)
        .to.have.been.calledWith(adminAccount.address);
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
      mockAccountAccessDefinitions.ensureCanRegisterAccount.rejects(new PermissionError());

      const request = addAccountRequest();
      await expect(modelEngine.addAccount(request, createTokenFor(adminAccount.address))).to.be.rejectedWith(PermissionError);
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureCanRegisterAccount.throws(new PermissionError());

      const request = addAccountRequest();
      await expect(modelEngine.addAccount(request, createTokenFor(adminAccount.address))).to.be.rejectedWith(PermissionError);
    });

    after(() => {
      clock.restore();
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
        validateAddAccountRequest: sinon.stub()
      };
      modelEngine = new DataModelEngine({}, {}, {}, {}, {}, {}, mockAccountRepository, {}, {}, {}, mockAccountAccessDefinitions);
      account = put(accountWithSecret, {registeredBy : adminAccount.address, permissions : ['perm1', 'perm2']});
      accountWithoutSecret = pick(account, 'secret');
    });

    beforeEach(() => {
      resetHistory(mockAccountRepository);
      mockAccountRepository.get.returns(accountWithoutSecret);
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

  describe('Finding accounts', () => {
    let mockFindAccountQueryObjectFactory;
    let mockFindAccountQueryObject;
    let mockAccountAccessDefinitions;
    let modelEngine;
    let account;
    let accountWithoutSecret;

    before(() => {
      mockFindAccountQueryObjectFactory = {
        create: sinon.stub()
      };
      mockFindAccountQueryObject = {
        execute: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanRegisterAccount: sinon.stub()
      };
      modelEngine = new DataModelEngine({}, {}, {}, {}, {}, {}, {}, {}, mockFindAccountQueryObjectFactory, {}, mockAccountAccessDefinitions);
      account = put(accountWithSecret, {registeredBy: adminAccount.address, permissions : ['perm1', 'perm2']});
      accountWithoutSecret = pick(account, 'secret');
    });

    beforeEach(() => {
      resetHistory(mockFindAccountQueryObjectFactory);
      mockFindAccountQueryObjectFactory.create.returns(mockFindAccountQueryObject);
      mockFindAccountQueryObject.execute.returns({result: [accountWithoutSecret], resultCount: 1});
      mockAccountAccessDefinitions.ensureCanRegisterAccount.resolves();
    });

    it('uses findAccountQueryObjectFactory and delegates to findAccountQueryObject', async () => {
      expect(await modelEngine.findAccounts({createdBy : adminAccount.address})).to.deep.equal({result: [accountWithoutSecret], resultCount: 1});
      expect(mockFindAccountQueryObjectFactory.create).to.have.been.called;
      expect(mockFindAccountQueryObject.execute).to.have.been.called;
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureCanRegisterAccount.throws(new PermissionError());
      await expect(modelEngine.findAccounts({createdBy : adminAccount.address})).to.be.rejectedWith(PermissionError);
      expect(mockAccountAccessDefinitions.ensureCanRegisterAccount).to.have.been.called;
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
        ensureCanRegisterAccount: sinon.stub(),
        validateModifyAccountRequest: sinon.stub()
      };
      modelEngine = new DataModelEngine({}, {}, {}, {}, {}, {}, mockAccountRepository, {}, {}, {}, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockAccountRepository);
      mockAccountRepository.update.returns(modifiedAccount);
      mockAccountRepository.get.withArgs(adminAccount.address).returns(adminAccount);
      mockAccountRepository.get.withArgs(accountToModify).returns(accountWithoutSecret);
      mockAccountAccessDefinitions.ensureCanRegisterAccount.resolves();
      mockAccountAccessDefinitions.validateModifyAccountRequest.resolves();
    });

    it('validates request and delegates to AccountRepository', async () => {
      expect(await modelEngine.modifyAccount(accountToModify, modifyRequest, {createdBy : adminAccount.address})).to.deep.equal(modifiedAccount);
      expect(mockAccountAccessDefinitions.ensureCanRegisterAccount).to.have.been.calledWith(adminAccount.address);
      expect(mockAccountAccessDefinitions.validateModifyAccountRequest).to.have.been.calledWith(modifyRequest);
      expect(mockAccountRepository.update).to.have.been.called;
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureCanRegisterAccount.throws(new PermissionError());
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
        storeAsset: sinon.stub(),
        getAsset: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanCreateEntity: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, mockEntityRepository, {}, {}, {}, {}, {}, {}, mockAccountAccessDefinitions);
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository);

      mockEntityBuilder.validateAsset.returns();
      mockEntityBuilder.setBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();
      mockEntityRepository.getAsset.resolves(null);
      mockAccountAccessDefinitions.ensureCanCreateEntity.resolves();
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
        expect(mockAccountAccessDefinitions.ensureCanCreateEntity)
          .to.have.been.calledWith(mockAsset.content.idData.createdBy);
      });

      it('checks if same asset does not exist', async () => {
        expect(mockEntityRepository.getAsset).to.have.been.calledWith(mockAsset.assetId);
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
        mockAccountAccessDefinitions.ensureCanCreateEntity.throws(new PermissionError());
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(PermissionError);
        expect(mockEntityRepository.storeAsset).to.have.been.not.called;
      });

      it('throws if Entity Builder validation fails', async () => {
        mockEntityBuilder.validateAsset.throws(new ValidationError('an error'));
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(ValidationError);
      });

      it('throws if asset with same assetId already exists', async () => {
        mockEntityRepository.getAsset.resolves({});
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(InvalidParametersError);
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

      modelEngine = new DataModelEngine({}, {}, {}, mockEntityRepository, {}, {}, {}, {}, {}, {}, {});
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

  describe('Finding assets', () => {
    let mockFindAssetQueryObjectFactory;
    let mockFindAssetQueryObject;
    let modelEngine;

    let scenario;
    let assetSet;
    let asset;

    let ret;

    before(async () => {
      mockFindAssetQueryObjectFactory = {
        create: sinon.stub()
      };

      mockFindAssetQueryObject = {
        execute: sinon.stub()
      };

      scenario = new ScenarioBuilder(identityManager);
      await scenario.addAdminAccount(adminAccountWithSecret);
      asset = await scenario.addAsset(0);
      assetSet = [asset];
      mockFindAssetQueryObjectFactory.create.returns(mockFindAssetQueryObject);
      mockFindAssetQueryObject.execute.returns({results: assetSet, resultCount: 165});

      modelEngine = new DataModelEngine({}, {}, {}, {},
        {}, {}, {}, {}, {}, mockFindAssetQueryObjectFactory, {});

      ret = await expect(modelEngine.findAssets()).to.fulfilled;
    });

    it('creates asset query object', async () => {
      expect(mockFindAssetQueryObjectFactory.create).to.have.been.called;
    });

    it('asks the asset query object for the assets', async () => {
      expect(mockFindAssetQueryObject.execute).to.have.been.called;
    });

    it('properly assembles the result', () => {
      expect(ret.results).to.equal(assetSet);
      expect(ret.resultCount).to.equal(165);
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
        getAsset: sinon.stub(),
        getEvent: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanCreateEntity: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, mockEntityRepository,{}, {}, {}, {}, {}, {}, mockAccountAccessDefinitions);
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository);

      mockEntityBuilder.validateEvent.returns();
      mockEntityBuilder.setBundle.returns(mockEvent);
      mockEntityRepository.storeEvent.resolves();
      mockEntityRepository.getAsset.resolves(mockAsset);
      mockEntityRepository.getEvent.resolves(null);
      mockAccountAccessDefinitions.ensureCanCreateEntity.resolves();
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
        expect(mockAccountAccessDefinitions.ensureCanCreateEntity)
          .to.have.been.calledWith(mockEvent.content.idData.createdBy);
      });

      it('checks if target asset exists', () => {
        expect(mockEntityRepository.getAsset).to.have.been.calledWith(mockEvent.content.idData.assetId);
      });

      it('checks if same event does not exist', async () => {
        expect(mockEntityRepository.getEvent).to.have.been.calledWith(mockEvent.eventId);
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
        mockAccountAccessDefinitions.ensureCanCreateEntity.throws(new PermissionError());
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

      it('throws if event with same eventId already exists', async () => {
        mockEntityRepository.getEvent.resolves({});
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
      modelEngine = new DataModelEngine({}, {}, {}, mockEntityRepository, {}, {}, {}, {}, {}, {}, mockAccountAccessDefinitions);
    });

    beforeEach(() => {
      resetHistory(mockEntityRepository, mockAccountAccessDefinitions);
      mockEntityRepository.getEvent.resolves(mockEvent);
      mockAccountAccessDefinitions.getTokenCreatorAccessLevel.resolves(accessLevel);
    });

    it('asks the query object for the event', async () => {
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
    let mockFindEventQueryObjectFactory;
    let mockFindEventQueryObject;
    let mockAccountAccessDefinitions;
    let mockEntityBuilder;
    let modelEngine;
    const accessLevel = 4;

    let scenario;
    let eventSet;
    const mockParams = {'a param': 'a value'};
    const mockParams2 = {'a param2': 'a value2'};
    const mockTokenData = {createdBy: 'tester', validUntil: 'all bugs gone'};

    let ret;

    before(async () => {
      mockFindEventQueryObjectFactory = {
        create: sinon.stub()
      };

      mockEntityBuilder = {
        validateAndCastFindEventsParams: sinon.stub()
      };

      mockAccountAccessDefinitions = {
        getTokenCreatorAccessLevel: sinon.stub()
      };
      mockFindEventQueryObject = {
        execute: sinon.stub()
      };

      scenario = new ScenarioBuilder(identityManager);
      await scenario.addAdminAccount(adminAccountWithSecret);
      await scenario.addAsset(0);
      eventSet = [
        await scenario.addEvent(0, 0)
      ];
      mockFindEventQueryObjectFactory.create.returns(mockFindEventQueryObject);
      mockFindEventQueryObject.execute.returns({results: eventSet, resultCount: 165});
      mockEntityBuilder.validateAndCastFindEventsParams.returns(mockParams2);
      mockAccountAccessDefinitions.getTokenCreatorAccessLevel.resolves(accessLevel);

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, {},
        {}, {}, {}, mockFindEventQueryObjectFactory, {}, {}, mockAccountAccessDefinitions);

      ret = await expect(modelEngine.findEvents(mockParams, mockTokenData)).to.fulfilled;
    });

    it('asks the entity builder for parameters validation', () => {
      expect(mockEntityBuilder.validateAndCastFindEventsParams).to.have.been.calledWith(mockParams);
    });

    it('gets access level', async () => {
      expect(mockAccountAccessDefinitions.getTokenCreatorAccessLevel).to.have.been.calledWith(mockTokenData);
    });

    it('creates event query object', async () => {
      expect(mockFindEventQueryObjectFactory.create).to.have.been.calledWith(mockParams2, accessLevel);
    });

    it('asks the event query object for the events', async () => {
      expect(mockFindEventQueryObject.execute).to.have.been.called;
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

      modelEngine = new DataModelEngine({}, {}, mockEntityBuilder, mockEntityRepository, {}, {}, {}, {}, {}, {}, {});

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
    const bundleSizeLimit = 15;
    const txHash = '0xc9087b7510e98183f705fe99ddb6964f3b845878d8a801cf6b110975599b6009';
    let unbundledAssets;
    let unbundledEvents;
    let assembledBundle;

    let ret;

    before(async () => {
      clock = sinon.useFakeTimers();

      scenario = new ScenarioBuilder(identityManager);
      await scenario.addAdminAccount(adminAccountWithSecret);
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
        content: {
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
        storeBundleProofMetadata: sinon.stub()
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
      mockProofRepository.uploadProof.resolves({blockNumber, transactionHash: txHash});

      modelEngine = new DataModelEngine(mockIdentityManager, {}, mockEntityBuilder, mockEntityRepository, {}, mockProofRepository, {}, {}, {}, {}, {});

      ret = await expect(modelEngine.finaliseBundle(bundleStubId, bundleSizeLimit)).to.be.fulfilled;
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
      const expectedTimestamp = Math.floor(Date.now() / 1000);
      expect(mockEntityBuilder.assembleBundle).to.have.been.calledWith(unbundledAssets, unbundledEvents,
        expectedTimestamp, nodeSecret);
    });

    it('stores the bundle it in the repository', () => {
      expect(mockEntityRepository.storeBundle).to.have.been.calledWith(assembledBundle);
    });

    it('ends the bundling procedure in the repository', () => {
      expect(mockEntityRepository.endBundle).to.have.been.calledWith(bundleStubId, assembledBundle.bundleId, bundleSizeLimit);
    });

    it('uploads the proof to the registry contract', () => {
      expect(mockProofRepository.uploadProof).to.have.been.calledWith(assembledBundle.bundleId);
    });

    it('returns the bundle', () => {
      expect(ret).to.be.deep.eq(assembledBundle);
    });

    it('stores block number in metadata', async () => {
      expect(mockEntityRepository.storeBundleProofMetadata).to.have.been.calledWith(assembledBundle.bundleId, blockNumber, txHash);
    });

    describe('Empty bundle', async () => {
      before(async () => {
        const emptyBundle = {
          bundleId: 'a mock bundle',
          content: {
            entries: []
          }
        };

        mockProofRepository = {
          uploadProof: sinon.stub()
        };

        mockEntityRepository = {
          storeBundle: sinon.stub(),
          beginBundle: sinon.stub()
        };

        mockEntityBuilder.assembleBundle.returns(emptyBundle);
        mockEntityRepository.beginBundle.resolves({});

        ret = await expect(modelEngine.finaliseBundle(bundleStubId)).to.be.fulfilled;
      });

      it('returns null', () => {
        expect(ret).to.be.deep.eq(null);
      });

      it('does not store empty bundle', () => {
        expect(mockProofRepository.uploadProof).to.have.not.been.called;
      });

      it('does not upload empty bundle', () => {
        expect(mockEntityRepository.storeBundle).to.have.not.been.called;
      });
    });
  });
  
  describe('Downloading a bundle', async () => {
    const bundleId = '0x123';
    const vendorId = '0x987';
    const vendorUrl = '0.0.0.0';
    const downloadedBundle = createBundle();
    let mockEntityRepository;
    let mockEntityDownloader;
    let mockProofRepository;
    let modelEngine;
    let result;

    before(async () => {
      mockEntityRepository = {
        storeBundle: sinon.stub(),
        getBundle: sinon.stub()
      };

      mockProofRepository = {
        getVendorUrl: sinon.stub()
      };

      mockEntityDownloader = {
        downloadBundle: sinon.stub()
      };

      modelEngine = new DataModelEngine({}, {}, {}, mockEntityRepository, mockEntityDownloader, mockProofRepository, {}, {}, {}, {}, {}, {});
    });
    describe('new bundle', async () => {
      before(async () => {
        resetHistory(mockProofRepository, mockEntityDownloader, mockEntityRepository);
        mockEntityRepository.getBundle.resolves(null);
        mockEntityRepository.storeBundle.resolves();
        mockProofRepository.getVendorUrl.resolves(vendorUrl);
        mockEntityDownloader.downloadBundle.resolves(downloadedBundle);

        result = await expect(modelEngine.downloadBundle(bundleId, vendorId)).to.be.fulfilled;
      });
      it('asks the entity repository for the bundle', async () => {
        expect(mockEntityRepository.getBundle).to.have.been.calledWith(bundleId);
      });
      it(`asks proof repository for vendor's url`, async() => {
        expect(mockProofRepository.getVendorUrl).to.have.been.calledWith(vendorId);
      });
      it(`delegetes entity downloader to download bundle from given url`, async() => {
        expect(mockEntityDownloader.downloadBundle).to.have.been.calledWith(vendorUrl, bundleId);
      });
      it(`saves downloaded bundle to entity repository`, async() => {
        expect(mockEntityRepository.storeBundle).to.have.been.calledWith(downloadedBundle);
      });
      it(`returns downloaded bundle`, async() => {
        expect(result).to.deep.equal(downloadedBundle);
      });
    });
    describe('already existing bundle', async () => {
      let alreadyExistingBundle;
      before(async () => {
        resetHistory(mockProofRepository, mockEntityDownloader, mockEntityRepository);
        alreadyExistingBundle = createBundle();
        mockEntityRepository.getBundle.resolves(alreadyExistingBundle);

        result = await expect(modelEngine.downloadBundle(bundleId, vendorId)).to.be.fulfilled;
      });
      it(`returns bundle from repository if requested bundle already stored`, async() => {
        result = await expect(modelEngine.downloadBundle(bundleId, vendorId)).to.be.fulfilled;
        expect(mockProofRepository.getVendorUrl).to.be.not.called;
        expect(mockEntityDownloader.downloadBundle).to.be.not.called;
        expect(mockEntityRepository.storeBundle).to.be.not.called;
        expect(result).to.deep.equal(alreadyExistingBundle);
      });
    });
  });
});
