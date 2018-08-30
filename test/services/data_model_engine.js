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
      modelEngine = new DataModelEngine({
        identityManager: mockIdentityManager,
        accountRepository: mockAccountRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
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
      modelEngine = new DataModelEngine({
        accountRepository: mockAccountRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
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
    const mockParams = {accessLevel: 1};
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
        ensureCanRegisterAccount: sinon.stub(),
        validateAndCastFindAccountParams: sinon.stub()
      };
      modelEngine = new DataModelEngine({
        findAccountQueryObjectFactory: mockFindAccountQueryObjectFactory,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
      account = put(accountWithSecret, {registeredBy: adminAccount.address, permissions : ['perm1', 'perm2']});
      accountWithoutSecret = pick(account, 'secret');
    });

    beforeEach(() => {
      resetHistory(mockFindAccountQueryObjectFactory);
      mockFindAccountQueryObjectFactory.create.returns(mockFindAccountQueryObject);
      mockFindAccountQueryObject.execute.returns({result: [accountWithoutSecret], resultCount: 1});
      mockAccountAccessDefinitions.ensureCanRegisterAccount.resolves();
      mockAccountAccessDefinitions.validateAndCastFindAccountParams.returns(mockParams);
    });

    it('uses findAccountQueryObjectFactory and delegates to findAccountQueryObject', async () => {
      expect(await modelEngine.findAccounts(mockParams, {createdBy : adminAccount.address})).to.deep.equal({result: [accountWithoutSecret], resultCount: 1});
      expect(mockFindAccountQueryObjectFactory.create).to.have.been.called;
      expect(mockFindAccountQueryObject.execute).to.have.been.called;
    });

    it('validates params', () => {
      expect(mockAccountAccessDefinitions.validateAndCastFindAccountParams).to.have.been.called;
    });

    it('throws PermissionError if account misses required permissions', async () => {
      mockAccountAccessDefinitions.ensureCanRegisterAccount.throws(new PermissionError());
      await expect(modelEngine.findAccounts(mockParams, {createdBy : adminAccount.address})).to.be.rejectedWith(PermissionError);
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
      modelEngine = new DataModelEngine({
        accountRepository: mockAccountRepository,
        accountAccessDefinitions: mockAccountAccessDefinitions
      });
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
        setBundle: sinon.stub(),
        setEntityUploadTimestamp: sinon.stub()
      };
      mockEntityRepository = {
        storeAsset: sinon.stub(),
        getAsset: sinon.stub()
      };
      mockAccountAccessDefinitions = {
        ensureCanCreateEntity: sinon.stub()
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
        ensureCanCreateEntity: sinon.stub()
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
        getBundle: sinon.stub()
      };

      mockEntityRepository.getBundle.resolves(exampleBundle);

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

  describe('Initialising bundle', () => {
    let mockEntityRepository;
    let mockEntityBuilder;
    let mockIdentityManager;
    let modelEngine;

    let clock;
    let scenario;

    const bundleStubId = 'abc';
    const nodeSecret = 'nodeSecret';
    const bundleSizeLimit = 100;
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
        fetchEntitiesForBundling: sinon.stub()
      };

      mockIdentityManager = {
        nodePrivateKey: sinon.stub()
      };

      mockEntityBuilder = {
        assembleBundle: sinon.stub()
      };

      mockEntityRepository.fetchEntitiesForBundling.resolves({assets: unbundledAssets, events: unbundledEvents});
      mockIdentityManager.nodePrivateKey.resolves(nodeSecret);
      mockEntityBuilder.assembleBundle.resolves(assembledBundle);

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        identityManager: mockIdentityManager,
        entityBuilder: mockEntityBuilder
      });

      ret = await expect(modelEngine.initialiseBundling(bundleStubId, bundleSizeLimit)).to.be.fulfilled;
    });

    after(() => {
      clock.restore();
    });

    it('fetches entities to bundle from the repository', () => {
      expect(mockEntityRepository.fetchEntitiesForBundling).to.have.been.calledWith(bundleStubId, bundleSizeLimit);
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

  describe('Finalising bundle', () => {
    let mockEntityRepository;
    let mockUploadRepository;
    let modelEngine;

    let clock;
    let scenario;

    const bundleStubId = 'abc';
    const blockNumber = 10;
    const storagePeriods = 2;
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

      mockEntityRepository = {
        markEntitiesAsBundled: sinon.stub(),
        storeBundle: sinon.stub(),
        storeBundleProofMetadata: sinon.stub()
      };

      mockUploadRepository = {
        uploadBundle: sinon.stub()
      };

      mockEntityRepository.markEntitiesAsBundled.resolves();
      mockEntityRepository.storeBundle.resolves();
      mockEntityRepository.storeBundleProofMetadata.resolves();
      mockUploadRepository.uploadBundle.resolves({blockNumber, transactionHash: txHash});

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        uploadRepository: mockUploadRepository
      });

      ret = await expect(modelEngine.finaliseBundling(assembledBundle, bundleStubId, storagePeriods)).to.be.fulfilled;
    });

    after(() => {
      clock.restore();
    });

    it('stores the bundle it in the repository', () => {
      expect(mockEntityRepository.storeBundle).to.have.been.calledWith(assembledBundle);
    });

    it('ends the bundling procedure in the repository', () => {
      expect(mockEntityRepository.markEntitiesAsBundled).to.have.been.calledWith(bundleStubId, assembledBundle.bundleId);
    });

    it('uploads the proof to the uploads contract', () => {
      expect(mockUploadRepository.uploadBundle).to.have.been.calledWith(assembledBundle.bundleId, storagePeriods);
    });

    it('stores block number and tx hash in metadata', async () => {
      expect(mockEntityRepository.storeBundleProofMetadata).to.have.been.calledWith(assembledBundle.bundleId, blockNumber, txHash);
    });

    it('returns the bundle', () => {
      expect(ret).to.be.deep.eq(assembledBundle);
    });
  });

  describe('Cancelling bundle', () => {
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

      await expect(modelEngine.cancelBundling(bundleStubId)).to.be.fulfilled;
    });

    it('revokes entities from being bundled', async () => {
      expect(mockEntityRepository.discardBundling).to.have.been.calledWith(bundleStubId);
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

  describe('Cleanup unnecessary bundles', () => {
    const allBundles = ['bundle1', 'bundle2', 'bundle3'];
    let mockEntityRepository;
    let mockUploadRepository;
    let modelEngine;

    beforeEach(() => {
      mockEntityRepository = {
        getExpiredBundleIds: sinon.stub().resolves(allBundles),
        deleteBundles: sinon.stub()
      };

      mockUploadRepository = {
        isSheltering: sinon.stub().resolves(true)
      };

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        uploadRepository: mockUploadRepository
      });

      sinon.stub(modelEngine, 'updateShelteringExpirationDate');
    });

    it('checks if is still sheltering for all bundles', async () => {
      await modelEngine.cleanupBundles();
      expect(mockEntityRepository.getExpiredBundleIds).to.be.calledOnce;
      expect(mockUploadRepository.isSheltering).to.be.calledThrice;
      expect(mockUploadRepository.isSheltering).to.be.calledWith('bundle1');
      expect(mockUploadRepository.isSheltering).to.be.calledWith('bundle2');
      expect(mockUploadRepository.isSheltering).to.be.calledWith('bundle3');
    });

    it('deletes not sheltered bundles and returns their ids', async () => {
      mockUploadRepository.isSheltering.withArgs('bundle3').resolves(false);
      expect(await modelEngine.cleanupBundles()).to.deep.equal(['bundle3']);
      expect(mockEntityRepository.deleteBundles).to.be.calledOnceWith(['bundle3']);
    });

    it('updates expiration date on all bundles marked as expired but still sheltered', async () => {
      mockUploadRepository.isSheltering.withArgs('bundle3').resolves(false);
      await modelEngine.cleanupBundles();
      expect(modelEngine.updateShelteringExpirationDate).to.be.calledTwice;
      expect(modelEngine.updateShelteringExpirationDate).to.be.calledWith('bundle2');
      expect(modelEngine.updateShelteringExpirationDate).to.be.calledWith('bundle1');
    });
  });

  describe('Uploading not registered bundles', () => {
    const allBundles = [{
      bundleId: 'bundle1',
      metadata: {storagePeriods: 1}
    }, {
      bundleId: 'bundle2',
      metadata: {storagePeriods: 2}
    }, {
      bundleId: 'bundle3',
      metadata: {storagePeriods: 3}
    }];
    let mockEntityRepository;
    let mockUploadRepository;
    let modelEngine;

    beforeEach(() => {
      mockEntityRepository = {
        findNotRegisteredBundles: sinon.stub().resolves(allBundles)
      };

      mockUploadRepository = {
        uploadBundle: sinon.stub().resolves()
      };

      modelEngine = new DataModelEngine({
        entityRepository: mockEntityRepository,
        uploadRepository: mockUploadRepository
      });
    });

    it('uploads all found bundles', async () => {
      expect(await modelEngine.uploadNotRegisteredBundles()).to.equal(allBundles);
      expect(mockEntityRepository.findNotRegisteredBundles).to.be.calledOnce;
      expect(mockUploadRepository.uploadBundle).to.be.calledThrice;
      expect(mockUploadRepository.uploadBundle).to.be.calledWith('bundle1', 1);
      expect(mockUploadRepository.uploadBundle).to.be.calledWith('bundle2', 2);
      expect(mockUploadRepository.uploadBundle).to.be.calledWith('bundle3', 3);
    });
  });
});
