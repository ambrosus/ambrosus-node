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
import {NotFoundError, PermissionError, ValidationError} from '../../src/errors/errors';

import {createAsset, createBundle, createEvent} from '../fixtures/assets_events';
import {account, accountWithSecret, addAccountRequest, adminAccount, adminAccountWithSecret} from '../fixtures/account';

import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';

import createTokenFor from '../fixtures/create_token_for';
import resetHistory from '../helpers/reset_history';
import allPermissions from '../../src/utils/all_permissions';

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
      modelEngine = new DataModelEngine({
        identityManager: mockIdentityManager,
        accountRepository: mockAccountRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
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
    const now = 22;
    let mockIdentityManager;
    let mockAccountRepository;
    let mockAccountAccessDefinitions;
    let modelEngine;
    let clock;

    before(() => {
      clock = sinon.useFakeTimers(now * 1000);

      mockIdentityManager = {
        createKeyPair: sinon.stub()
      };
      mockAccountRepository = {
        store: sinon.stub(),
        get: sinon.stub(),
        count: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanAddAccount: sinon.stub()
      };
      modelEngine = new DataModelEngine({
        identityManager: mockIdentityManager,
        accountRepository: mockAccountRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
    });

    beforeEach(() => {
      resetHistory(mockIdentityManager, mockAccountRepository, mockAccountAccessDefinitions);

      mockAccountRepository.get.resolves(null);
      mockAccountAccessDefinitions.ensureCanAddAccount.resolves();
    });

    it('validates with mockIdentityManager and delegates to accountRepository', async () => {
      const request = addAccountRequest();
      const registrationResponse = {
        ...request,
        registeredBy: adminAccount.address,
        registeredOn: now
      };
      expect(await modelEngine.addAccount(request, createTokenFor(adminAccount.address)))
        .to.deep.equal(registrationResponse);
      expect(mockAccountAccessDefinitions.ensureCanAddAccount).to.been.calledOnceWith(adminAccount.address, request);
      expect(mockAccountRepository.get).to.be.calledOnceWith(request.address);
      expect(mockAccountRepository.store).to.have.been.calledOnceWith({
        registeredBy: adminAccount.address,
        ...registrationResponse
      });
    });

    it('throws ValidationError if account with same address exists', async () => {
      const request = addAccountRequest();
      mockAccountRepository.get.resolves({address: request.address});
      await expect(modelEngine.addAccount(request, createTokenFor(adminAccount.address))).to.be.rejectedWith(ValidationError);
    });

    it('throws ValidationError if invalid account request', async () => {
      mockAccountAccessDefinitions.ensureCanAddAccount.rejects(new ValidationError('an error'));

      const request = addAccountRequest();
      await expect(modelEngine.addAccount(request, createTokenFor(adminAccount.address))).to.be.rejectedWith(ValidationError);
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureCanAddAccount.rejects(new PermissionError('an error'));

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
        ensureHasPermission: sinon.stub().resolves()
      };
      modelEngine = new DataModelEngine({
        accountRepository: mockAccountRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
      account = put(accountWithSecret, {registeredBy: adminAccount.address, permissions: ['perm1', 'perm2']});
      accountWithoutSecret = pick(account, 'secret');
    });

    beforeEach(() => {
      resetHistory(mockAccountRepository, mockAccountAccessDefinitions);
      mockAccountRepository.get.returns(accountWithoutSecret);
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
    });

    it('delegates to accountRepository', async () => {
      expect(await modelEngine.getAccount(account.address, {createdBy: adminAccount.address})).to.eq(accountWithoutSecret);
      expect(mockAccountRepository.get).to.have.been.called;
    });

    it('throws PermissionError if the sender misses `manage_accounts` permission', async () => {
      mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());
      await expect(modelEngine.getAccount(account.address, {createdBy: adminAccount.address})).to.be.rejectedWith(PermissionError);
      expect(mockAccountAccessDefinitions.ensureHasPermission).to.be.calledOnceWith(adminAccount.address, allPermissions.manageAccounts);
    });

    it('throws PermissionError if non-existing sender', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(modelEngine.getAccount(account.address, {createdBy: adminAccount.address})).to.be.rejectedWith(PermissionError);
    });

    it('throws NotFoundError if non-existing account requested', async () => {
      mockAccountRepository.get.withArgs(adminAccount.address).resolves(adminAccount);
      mockAccountRepository.get.withArgs(account.address).resolves(null);
      await expect(modelEngine.getAccount(account.address, {createdBy: adminAccount.address})).to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Finding accounts', () => {
    const mockParams = {accessLevel: '1'};
    const validatedParams = {accessLevel: 1};
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
        ensureHasPermission: sinon.stub(),
        validateAndCastFindAccountParams: sinon.stub()
      };
      modelEngine = new DataModelEngine({
        findAccountQueryObjectFactory: mockFindAccountQueryObjectFactory,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
      account = put(accountWithSecret, {registeredBy: adminAccount.address, permissions: ['perm1', 'perm2']});
      accountWithoutSecret = pick(account, 'secret');
    });

    beforeEach(() => {
      resetHistory(mockFindAccountQueryObjectFactory, mockAccountAccessDefinitions, mockFindAccountQueryObject);
      mockFindAccountQueryObjectFactory.create.returns(mockFindAccountQueryObject);
      mockFindAccountQueryObject.execute.returns({result: [accountWithoutSecret], resultCount: 1});
      mockAccountAccessDefinitions.ensureHasPermission.resolves();
      mockAccountAccessDefinitions.validateAndCastFindAccountParams.returns(validatedParams);
    });

    it('uses findAccountQueryObjectFactory and delegates to findAccountQueryObject', async () => {
      expect(await modelEngine.findAccounts(mockParams, {createdBy: adminAccount.address})).to.deep.equal({result: [accountWithoutSecret], resultCount: 1});
      expect(mockFindAccountQueryObjectFactory.create).to.have.been.calledOnceWith(validatedParams);
      expect(mockFindAccountQueryObject.execute).to.have.been.calledOnce;
    });

    it('validates params', async () => {
      await modelEngine.findAccounts(mockParams, {createdBy: adminAccount.address});
      expect(mockAccountAccessDefinitions.validateAndCastFindAccountParams).to.have.been.calledOnceWith(mockParams);
    });

    it('throws PermissionError if the sender misses `manage_accounts` permission', async () => {
      mockAccountAccessDefinitions.ensureHasPermission.throws(new PermissionError());
      await expect(modelEngine.findAccounts(mockParams, {createdBy: adminAccount.address})).to.be.rejectedWith(PermissionError);
      expect(mockAccountAccessDefinitions.ensureHasPermission).to.be.calledOnceWith(adminAccount.address, allPermissions.manageAccounts);
    });
  });

  describe('Modify account', () => {
    let mockAccountRepository;
    let modelEngine;
    let mockAccountAccessDefinitions;
    let getAccountStub;
    const account = put(accountWithSecret, {registeredBy: adminAccount.address, permissions: ['perm1', 'perm2']});
    const accountWithoutSecret = pick(account, 'secret');
    const modifyRequest = {permissions: ['changedPerm1', 'changedPerm2']};
    const accountToModify = accountWithoutSecret;
    const modifiedAccount = put(accountWithoutSecret, modifyRequest);

    before(() => {
      mockAccountRepository = {
        update: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanModifyAccount: sinon.stub()
      };
      modelEngine = new DataModelEngine({
        accountRepository: mockAccountRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
      getAccountStub = sinon.stub(modelEngine, 'getAccount');
    });

    beforeEach(() => {
      resetHistory(mockAccountRepository, mockAccountAccessDefinitions, {getAccountStub});
      mockAccountRepository.update.resolves(modifiedAccount);
      getAccountStub.withArgs(adminAccount.address).resolves(adminAccount);
      getAccountStub.withArgs(accountToModify.address).resolves(accountToModify);
      mockAccountAccessDefinitions.ensureCanModifyAccount.resolves();
    });

    it('gets modified account and delegates to AccountRepository', async () => {
      expect(await modelEngine.modifyAccount(accountToModify.address, modifyRequest, {createdBy: adminAccount.address})).to.deep.equal(modifiedAccount);
      expect(getAccountStub).to.be.calledOnceWith(accountToModify.address);
      expect(mockAccountAccessDefinitions.ensureCanModifyAccount).to.be.calledOnceWith(adminAccount.address, accountToModify, modifyRequest);
      expect(mockAccountRepository.update).to.have.been.calledOnceWith(accountToModify.address, modifyRequest);
    });

    it('throws NotFoundError in case of modification of non-existing account requested', async () => {
      getAccountStub.withArgs('0x1234').rejects(new NotFoundError());
      await expect(modelEngine.modifyAccount('0x1234', modifyRequest, {createdBy: adminAccount.address})).to.rejectedWith(NotFoundError);
    });

    it('throws PermissionError if the sender misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureCanModifyAccount.throws(new PermissionError());
      await expect(modelEngine.modifyAccount(accountToModify.address, modifyRequest, {createdBy: adminAccount.address})).to.rejectedWith(PermissionError);
    });

    it('throws ValidationError when request is not valid', async () => {
      mockAccountAccessDefinitions.ensureCanModifyAccount.throws(new ValidationError());
      await expect(modelEngine.modifyAccount(accountToModify.address, modifyRequest, {createdBy: adminAccount.address})).to.rejectedWith(ValidationError);
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
        setBundle: sinon.stub(),
        setEntityUploadTimestamp: sinon.stub()
      };
      mockEntityRepository = {
        storeAsset: sinon.stub(),
        getAsset: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanCreateAsset: sinon.stub()
      };

      modelEngine = new DataModelEngine({
        entityBuilder: mockEntityBuilder,
        entityRepository: mockEntityRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository);

      mockEntityBuilder.validateAsset.returns();
      mockEntityBuilder.setBundle.returns(mockAsset);
      mockEntityBuilder.setEntityUploadTimestamp.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();
      mockEntityRepository.getAsset.resolves(null);
      mockAccountAccessDefinitions.ensureCanCreateAsset.resolves();
    };

    describe('positive case', () => {
      before(async () => {
        restoreDefaultBehaviour();
        await expect(modelEngine.createAsset(mockAsset)).to.be.fulfilled;
      });

      it('validates with Entity Builder', () => {
        expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
      });

      it('checks if creator has `create_asset` permission', async () => {
        expect(mockAccountAccessDefinitions.ensureCanCreateAsset)
          .to.have.been.calledWith(mockAsset.content.idData.createdBy);
      });

      it('checks if same asset does not exist', async () => {
        expect(mockEntityRepository.getAsset).to.have.been.calledWith(mockAsset.assetId);
      });

      it('sets the bundle to be null', () => {
        expect(mockEntityBuilder.setBundle).to.have.been.calledWith(mockAsset, null);
      });

      it('sets entity upload timestamp', () => {
        expect(mockEntityBuilder.setEntityUploadTimestamp).to.have.been.calledWith(mockAsset);
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
        mockAccountAccessDefinitions.ensureCanCreateAsset.throws(new PermissionError());
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(PermissionError);
        expect(mockEntityRepository.storeAsset).to.have.been.not.called;
      });

      it('throws if Entity Builder validation fails', async () => {
        mockEntityBuilder.validateAsset.throws(new ValidationError('an error'));
        await expect(modelEngine.createAsset(mockAsset)).to.be.rejectedWith(ValidationError);
      });

      it('throws if asset with same assetId already exists', async () => {
        mockEntityRepository.getAsset.resolves({});
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

      modelEngine = new DataModelEngine({entityRepository: mockEntityRepository});
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
    let mockEntityBuilder;
    let modelEngine;

    let scenario;
    let assetSet;
    let asset;
    const params = {foo: 'bar'};
    const validatedParams = {bar: 'foo'};
    let ret;

    before(async () => {
      mockFindAssetQueryObjectFactory = {
        create: sinon.stub()
      };

      mockFindAssetQueryObject = {
        execute: sinon.stub()
      };

      mockEntityBuilder = {
        validateAndCastFindAssetsParams: sinon.stub()
      };

      scenario = new ScenarioBuilder(identityManager);
      await scenario.addAdminAccount(adminAccountWithSecret);
      asset = await scenario.addAsset(0);
      assetSet = [asset];
      mockFindAssetQueryObjectFactory.create.returns(mockFindAssetQueryObject);
      mockEntityBuilder.validateAndCastFindAssetsParams.returns(validatedParams);
      mockFindAssetQueryObject.execute.returns({results: assetSet, resultCount: 165});

      modelEngine = new DataModelEngine({
        entityBuilder: mockEntityBuilder,
        findAssetQueryObjectFactory: mockFindAssetQueryObjectFactory
      });

      ret = await expect(modelEngine.findAssets(params)).to.fulfilled;
    });

    it('creates asset query object', async () => {
      expect(mockFindAssetQueryObjectFactory.create).to.have.been.calledWith(validatedParams);
    });

    it('asks the asset query object for the assets', async () => {
      expect(mockFindAssetQueryObject.execute).to.have.been.called;
    });

    it('calls validateAndCastFindAssetsParams with params', () => {
      expect(mockEntityBuilder.validateAndCastFindAssetsParams).to.have.been.calledWith(params);
    });

    it('properly assembles the result', () => {
      expect(ret.results).to.equal(assetSet);
      expect(ret.resultCount).to.equal(165);
    });

    describe('Finding assets by identifiers', () => {
      let mockFindEventQueryObject;
      let mockFindEventQueryObjectFactory;
      let mockAccountAccessDefinitions;
      const identifier = {
        isbn: 'abc-def',
        gs1: '123'
      };
      const token = {one: 1};
      const accessLevel = 2;

      before(async () => {
        mockFindEventQueryObjectFactory = {
          create: sinon.stub()
        };

        mockFindEventQueryObject = {
          execute: sinon.stub()
        };

        mockAccountAccessDefinitions = {
          getTokenCreatorAccessLevel: sinon.stub()
        };

        mockEntityBuilder.validateAndCastFindAssetsParams.returns({identifier});
        mockFindEventQueryObjectFactory.create.returns(mockFindEventQueryObject);
        mockFindEventQueryObject.execute.resolves({
          results: [
            {content: {idData: {assetId: '1', foo: 'bar'}}},
            {content: {idData: {assetId: '10', one: {two: 2}}}},
            {content: {idData: {assetId: '1'}}}
          ]
        });
        mockAccountAccessDefinitions.getTokenCreatorAccessLevel.resolves(accessLevel);

        modelEngine = new DataModelEngine({
          entityBuilder: mockEntityBuilder,
          findEventQueryObjectFactory: mockFindEventQueryObjectFactory,
          findAssetQueryObjectFactory: mockFindAssetQueryObjectFactory,
          accountAccessDefinitions: mockAccountAccessDefinitions
        });
      });

      describe('selectAssetsIdsByIdentifier', () => {
        let result;

        before(async () => {
          result = await modelEngine.selectAssetsIdsByIdentifier(identifier, accessLevel);
        });

        it('should create FindEventQueryObject with correct parameters', () => {
          expect(mockFindEventQueryObjectFactory.create).to.be.calledWith({
            data: {
              type: 'ambrosus.event.identifiers',
              identifiers: {
                isbn: 'abc-def',
                gs1: '123'
              }
            }
          }, accessLevel);
        });

        it('should execute and return unique ids', () => {
          expect(mockFindEventQueryObject.execute).to.be.calledOnce;
          expect(result).to.deep.equal(['1', '10']);
        });

        it('when accessLevel was not given it defaults to 0', async () => {
          await modelEngine.selectAssetsIdsByIdentifier(identifier);
          expect(mockFindEventQueryObjectFactory.create).to.be.calledWith({
            data: {
              type: 'ambrosus.event.identifiers',
              identifiers: {
                isbn: 'abc-def',
                gs1: '123'
              }
            }
          }, 0);
        });
      });

      describe('findAssets', () => {
        before(async () => {
          await modelEngine.findAssets({identifier}, token);
        });

        it('takes access level from token when filter by identifiers', async () => {
          expect(mockAccountAccessDefinitions.getTokenCreatorAccessLevel).to.be.calledWith(token);
        });

        it('puts assetIds to consideredAssets', async () => {
          expect(mockFindAssetQueryObjectFactory.create).to.be.calledWith({assetIds: ['1', '10']});
        });
      });
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
        setBundle: sinon.stub(),
        setEntityUploadTimestamp: sinon.stub()
      };
      mockEntityRepository = {
        storeEvent: sinon.stub(),
        getAsset: sinon.stub(),
        getEvent: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanCreateEvent: sinon.stub()
      };

      modelEngine = new DataModelEngine({
        entityBuilder: mockEntityBuilder,
        entityRepository: mockEntityRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
    });

    const restoreDefaultBehaviour = () => {
      resetHistory(mockEntityBuilder, mockEntityRepository);

      mockEntityBuilder.validateEvent.returns();
      mockEntityBuilder.setBundle.returns(mockEvent);
      mockEntityBuilder.setEntityUploadTimestamp.returns(mockEvent);
      mockEntityRepository.storeEvent.resolves();
      mockEntityRepository.getAsset.resolves(mockAsset);
      mockEntityRepository.getEvent.resolves(null);
      mockAccountAccessDefinitions.ensureCanCreateEvent.resolves();
    };

    describe('positive case', () => {
      before(async () => {
        restoreDefaultBehaviour();
        await expect(modelEngine.createEvent(mockEvent)).to.have.been.fulfilled;
      });

      it('validates with Entity Builder', () => {
        expect(mockEntityBuilder.validateEvent).to.have.been.calledWith(mockEvent);
      });

      it('checks if creator has `create_event` permission', async () => {
        expect(mockAccountAccessDefinitions.ensureCanCreateEvent)
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

      it('sets entity upload timestamp', () => {
        expect(mockEntityBuilder.setEntityUploadTimestamp).to.have.been.calledWith(mockEvent);
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
        mockAccountAccessDefinitions.ensureCanCreateEvent.throws(new PermissionError());
        await expect(modelEngine.createEvent(mockAsset)).to.be.rejectedWith(PermissionError);
        expect(mockEntityRepository.storeEvent).to.have.been.not.called;
      });

      it('throws if Entity Builder validation fails', async () => {
        mockEntityBuilder.validateEvent.throws(new ValidationError('an error'));

        await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(ValidationError);
      });

      it('throws if target asset doesn\'t exists in Entity Repository', async () => {
        mockEntityRepository.getAsset.resolves(null);

        await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(ValidationError);
      });

      it('throws if event with same eventId already exists', async () => {
        mockEntityRepository.getEvent.resolves({});
        await expect(modelEngine.createEvent(mockEvent)).to.be.rejectedWith(ValidationError);
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
      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
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

      modelEngine = new DataModelEngine({
        entityBuilder: mockEntityBuilder,
        findEventQueryObjectFactory: mockFindEventQueryObjectFactory,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });

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

    it('throws ValidationError when parameter validation is not successful', async () => {
      const mockParams = {'a param': 'a value'};
      mockEntityBuilder.validateAndCastFindEventsParams.throws(new ValidationError);

      await expect(modelEngine.findEvents(mockParams)).to.be.rejectedWith(ValidationError);

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
        getBundle: sinon.stub(),
        getBundleMetadata: sinon.stub()
      };

      mockEntityRepository.getBundle.resolves(exampleBundle);
      mockEntityRepository.getBundleMetadata.resolves(null);

      modelEngine = new DataModelEngine({
        entityBuilder: mockEntityBuilder,
        entityRepository: mockEntityRepository
      });

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

  describe('Preparing bundle candidate', () => {
    let mockEntityRepository;
    let mockEntityBuilder;
    let mockIdentityManager;
    let mockUploadRepository;
    let modelEngine;

    let clock;
    let scenario;

    const bundleStubId = 'abc';
    const nodeSecret = 'nodeSecret';
    const bundleItemsCountLimit = 100;
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

      mockEntityRepository = {
        fetchEntitiesForBundling: sinon.stub().resolves({assets: unbundledAssets, events: unbundledEvents})
      };

      mockIdentityManager = {
        nodePrivateKey: sinon.stub().resolves(nodeSecret)
      };

      mockEntityBuilder = {
        assembleBundle: sinon.stub().resolves(assembledBundle)
      };

      mockUploadRepository = {
        bundleItemsCountLimit: sinon.stub().resolves(bundleItemsCountLimit)
      };

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        identityManager: mockIdentityManager,
        entityBuilder: mockEntityBuilder,
        uploadRepository: mockUploadRepository
      });

      ret = await expect(modelEngine.prepareBundleCandidate(bundleStubId)).to.be.fulfilled;
    });

    after(() => {
      clock.restore();
    });

    it('gets the entity count limit per bundle from the upload repository', () => {
      expect(mockUploadRepository.bundleItemsCountLimit).to.have.been.calledOnce;
    });

    it('fetches entities to bundle from the repository', () => {
      expect(mockEntityRepository.fetchEntitiesForBundling).to.have.been.calledWith(bundleStubId, bundleItemsCountLimit);
    });

    it('asks the identity manager for the node private key', () => {
      expect(mockIdentityManager.nodePrivateKey).to.have.been.called;
    });

    it('orders the entity builder to assemble the bundle JSON', () => {
      const expectedTimestamp = Math.floor(Date.now() / 1000);
      expect(mockEntityBuilder.assembleBundle).to.have.been.calledWith(unbundledAssets, unbundledEvents,
        expectedTimestamp, nodeSecret);
    });

    it('returns the bundle', () => {
      expect(ret).to.be.deep.eq(assembledBundle);
    });
  });

  describe('Accepting bundle candidate', () => {
    let mockEntityRepository;
    let modelEngine;

    let clock;
    let scenario;

    const bundleStubId = 'abc';
    const storagePeriods = 2;
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

      mockEntityRepository = {
        markEntitiesAsBundled: sinon.stub(),
        storeBundle: sinon.stub(),
        storeBundleProofMetadata: sinon.stub()
      };

      mockEntityRepository.markEntitiesAsBundled.resolves();
      mockEntityRepository.storeBundle.resolves();
      mockEntityRepository.storeBundleProofMetadata.resolves();

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository
      });

      ret = await expect(modelEngine.acceptBundleCandidate(assembledBundle, bundleStubId, storagePeriods)).to.be.fulfilled;
    });

    after(() => {
      clock.restore();
    });

    it('stores the bundle in the repository', () => {
      expect(mockEntityRepository.storeBundle).to.have.been.calledWith(assembledBundle, storagePeriods);
    });

    it('ends the bundling procedure in the repository', () => {
      expect(mockEntityRepository.markEntitiesAsBundled).to.have.been.calledWith(bundleStubId, assembledBundle.bundleId);
    });

    it('returns the bundle', () => {
      expect(ret).to.be.deep.eq(assembledBundle);
    });
  });

  describe('Rejecting bundle candidate', () => {
    let mockEntityRepository;
    let modelEngine;

    const bundleStubId = 'bundleStubId';

    before(async () => {
      mockEntityRepository = {
        discardBundling: sinon.stub()
      };

      mockEntityRepository.discardBundling.resolves();

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository
      });

      await expect(modelEngine.rejectBundleCandidate(bundleStubId)).to.be.fulfilled;
    });

    it('revokes entities from being bundled', async () => {
      expect(mockEntityRepository.discardBundling).to.have.been.calledWith(bundleStubId);
    });
  });

  describe('Upload accepted bundle candidates', () => {
    let mockEntityRepository;
    let mockUploadRepository;
    let modelEngine;
    const blockNumber = 10;
    const txHash = '0xc9087b7510e98183f705fe99ddb6964f3b845878d8a801cf6b110975599b6009';

    beforeEach(() => {
      mockEntityRepository = {
        findBundlesWaitingForUpload: sinon.stub().resolves([
          {
            bundleId: 'bundle1',
            storagePeriods: 2
          },
          {
            bundleId: 'bundle3',
            storagePeriods: 6
          }
        ]),
        storeBundleProofMetadata: sinon.stub()
      };

      mockUploadRepository = {
        uploadBundle: sinon.stub()
      };
      mockUploadRepository.uploadBundle.withArgs('bundle1', 2).resolves({blockNumber, transactionHash: txHash});
      mockUploadRepository.uploadBundle.withArgs('bundle3', 6).rejects(new Error('An error'));

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        uploadRepository: mockUploadRepository
      });
    });

    it('asks the entity repository for waiting candidates', async () => {
      await expect(modelEngine.uploadAcceptedBundleCandidates()).to.eventually.be.fulfilled;
      expect(mockEntityRepository.findBundlesWaitingForUpload).to.be.calledOnce;
    });

    it('for each candidate calls the uploadBundle method on the upload repository', async () => {
      await expect(modelEngine.uploadAcceptedBundleCandidates()).to.eventually.be.fulfilled;
      expect(mockUploadRepository.uploadBundle).to.be.have.been.calledWith('bundle1', 2);
      expect(mockUploadRepository.uploadBundle).to.be.have.been.calledWith('bundle3', 6);
      expect(mockUploadRepository.uploadBundle).to.have.callCount(2);
    });

    it('for each uploaded candidate stores bundle proof metadata in the entity repository', async () => {
      await expect(modelEngine.uploadAcceptedBundleCandidates()).to.eventually.be.fulfilled;
      expect(mockEntityRepository.storeBundleProofMetadata).to.be.have.been.calledOnceWith('bundle1', blockNumber, txHash);
    });

    it('returns a summary', async () => {
      const result = await modelEngine.uploadAcceptedBundleCandidates();
      expect(result.ok).to.deep.equal(['bundle1']);
      expect(result.failed.bundle3.message).to.equal('An error');
      expect(result.failed.bundle3.stack).to.exist;
    });
  });

  describe('Downloading a bundle', () => {
    const bundleId = '0x123';
    const sheltererId = '0x789';
    const nodeUrl = '0.0.0.0';
    const downloadedBundle = createBundle();
    let mockEntityRepository;
    let mockEntityDownloader;
    let mockEntityBuilder;
    let mockRolesRepository;
    let mockUploadRepository;
    let modelEngine;

    beforeEach(() => {
      mockEntityRepository = {
        storeBundle: sinon.stub()
      };

      mockRolesRepository = {
        nodeUrl: sinon.stub().resolves(nodeUrl)
      };

      mockUploadRepository = {
        verifyBundle: sinon.stub().resolves()
      };

      mockEntityDownloader = {
        downloadBundle: sinon.stub().resolves(downloadedBundle)
      };

      mockEntityBuilder = {
        validateBundle: sinon.stub()
      };

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        entityDownloader: mockEntityDownloader,
        entityBuilder: mockEntityBuilder,
        rolesRepository: mockRolesRepository,
        uploadRepository: mockUploadRepository
      });
    });

    it('validates and returns the downloaded bundle', async () => {
      expect(await modelEngine.downloadBundle(bundleId, sheltererId)).to.equal(downloadedBundle);
      expect(mockRolesRepository.nodeUrl).to.be.calledWith(sheltererId);
      expect(mockEntityDownloader.downloadBundle).to.be.calledWith(nodeUrl, bundleId);
      expect(mockEntityBuilder.validateBundle).to.be.calledWith(downloadedBundle);
      expect(mockEntityRepository.storeBundle).to.be.calledWith(downloadedBundle);
    });

    it('throws if downloaded empty bundle', async () => {
      mockEntityDownloader.downloadBundle.resolves(null);
      await expect(modelEngine.downloadBundle(bundleId, sheltererId)).to.be.rejectedWith(Error, 'Could not fetch the bundle from the shelterer');
      expect(mockEntityRepository.storeBundle).to.be.not.called;
    });

    it('does not store bundle if validation failed', async () => {
      mockEntityBuilder.validateBundle.throws();
      await expect(modelEngine.downloadBundle(bundleId, sheltererId)).to.be.rejected;
      expect(mockEntityRepository.storeBundle).to.be.not.called;
    });

    it('does not store bundle if verification against chain failed', async () => {
      mockUploadRepository.verifyBundle.rejects();
      await expect(modelEngine.downloadBundle(bundleId, sheltererId)).to.be.rejected;
      expect(mockEntityRepository.storeBundle).to.be.not.called;
    });
  });

  describe('Update sheltering expiration date', () => {
    const bundleId = '0x123';
    const expirationDate = 10;
    let mockEntityRepository;
    let mockUploadRepository;
    let modelEngine;

    beforeEach(() => {
      mockEntityRepository = {
        storeBundleShelteringExpirationDate: sinon.stub()
      };

      mockUploadRepository = {
        expirationDate: sinon.stub().resolves(expirationDate)
      };

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        uploadRepository: mockUploadRepository
      });
    });

    it('updates expiration date', async () => {
      await modelEngine.updateShelteringExpirationDate(bundleId);
      expect(mockUploadRepository.expirationDate).to.be.calledOnceWith(bundleId);
      expect(mockEntityRepository.storeBundleShelteringExpirationDate).to.be.calledOnceWith(bundleId, expirationDate);
    });
  });

  describe('Getting worker logs', () => {
    let modelEngine;
    let mockWorkerLogRepository;

    let ret;

    const exampleLogs = [{foo: 'bar'}, {foo2: 'bar2'}, {foo3: 'bar3'}];

    before(async () => {
      mockWorkerLogRepository = {
        getLogs: sinon.stub().resolves(exampleLogs)
      };

      modelEngine = new DataModelEngine({
        workerLogRepository: mockWorkerLogRepository
      });

      ret = await expect(modelEngine.getWorkerLogs()).to.fulfilled;
    });

    it('asks the worker log repository for the logs', async () => {
      expect(mockWorkerLogRepository.getLogs).to.have.been.calledOnce;
    });

    it('properly returns the result', () => {
      expect(ret).to.equal(exampleLogs);
    });
  });
});
