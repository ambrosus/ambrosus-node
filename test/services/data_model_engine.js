import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import DataModelEngine from '../../src/services/data_model_engine';
import {
  AuthenticationError,
  InvalidParametersError,
  NotFoundError,
  PermissionError,
  ValidationError
} from '../../src/errors/errors';


import {createAsset, createEvent} from '../fixtures/assets_events';
import {createAccountRequest, adminAccount, accountWithSecret, adminAccountWithSecret} from '../fixtures/account';
import pkPair from '../fixtures/pk_pair';

import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {pick, put} from '../../src/utils/dict_utils';

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

  before(async () => {
    scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
  });

  beforeEach(async () => {
    mockAsset = createAsset();
    mockEvent = createEvent();
    scenario.reset();
    await scenario.injectAccount(adminAccountWithSecret);

    mockIdentityManager = {
      createKeyPair: sinon.stub(),
      validateSignature: sinon.stub()
    };
    mockAccountRepository = {
      store: sinon.stub(),
      get: sinon.stub(),
      count: sinon.stub()
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
      getEvent: sinon.stub(),
      findEvents: sinon.stub(),
      countEvents: sinon.stub()
    };
    mockAccountAccessDefinitions = {
      hasPermission: sinon.stub(),
      setPermissions: sinon.stub(),
      defaultAdminPermissions: sinon.stub()
    };
    modelEngine = new DataModelEngine(mockIdentityManager, mockEntityBuilder, mockEntityRepository,
      mockAccountRepository, mockAccountAccessDefinitions);
  });

  describe('Create account', () => {
    it('validates with mockIdentityManager and delegates to accountRepository', async () => {
      const request = createAccountRequest();
      mockAccountAccessDefinitions.hasPermission.resolves(true);
      mockAccountRepository.get.returns(adminAccount);
      mockIdentityManager.createKeyPair.returns(pkPair);
      expect(await modelEngine.createAccount(request.content.idData, request.content.signature)).to.eq(pkPair);
      expect(mockIdentityManager.validateSignature).to.have.been.called;
      expect(mockAccountRepository.store).to.have.been.calledWith(pkPair);
      expect(mockAccountRepository.get).to.have.been.calledWith(request.content.idData.createdBy);
    });

    it('throws PermissionError if account has no required permission', async () => {
      const request = createAccountRequest();
      mockAccountAccessDefinitions.hasPermission.resolves(false);
      await expect(modelEngine.createAccount(request.content.idData, request.content.signature))
        .to.eventually.be.rejectedWith(PermissionError);
    });

    it('throws ValidationError if signature is wrong', async () => {
      const request = createAccountRequest();
      mockIdentityManager.validateSignature.throws(new ValidationError('an error'));
      await expect(modelEngine.createAccount(request.content.idData, request.content.signature))
        .to.be.rejectedWith(ValidationError);
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

  describe('Permissions', () => {
    const exampleData = {
      createdBy: '0x123',
      address: '0x456',
      permissions: ['a', 'b']
    };

    it('updates permissions', async () => {
      const result = await modelEngine.updatePermissions(exampleData, 'signature');
      expect(mockAccountAccessDefinitions.setPermissions)
        .to.be.calledWith(exampleData.address, exampleData.permissions, exampleData.createdBy);
      expect(result).to.deep.eq(pick(exampleData, 'createdBy'));
    });

    for (const field of [
      'createdBy',
      'address',
      'permissions']) {
      // eslint-disable-next-line no-loop-func
      it(`throws if the ${field} field is missing`, async () => {
        const brokenData = pick(exampleData, field);
        await expect(modelEngine.updatePermissions(brokenData)).to.eventually.be.rejectedWith(ValidationError);
      });
    }

    it('throws if permissions is not an array', async () => {
      const brokenData = put(exampleData, 'permissions', 'aaa');
      await expect(modelEngine.updatePermissions(brokenData)).to.eventually.be.rejectedWith(ValidationError);
    });

    it('throws error if signature is wrong', async () => {
      mockIdentityManager.validateSignature.throws(new AuthenticationError('an error'));
      await expect(modelEngine.createAccount(exampleData, 'signature'))
        .to.be.rejectedWith(AuthenticationError);
    });
  });

  describe('Creating an asset', () => {
    it('validates with Entity Builder and sends to Entity Storage', async () => {
      mockEntityBuilder.setAssetBundle.returns(mockAsset);
      mockEntityRepository.storeAsset.resolves();
      mockAccountRepository.get.resolves(accountWithSecret);

      await expect(modelEngine.createAsset(mockAsset));

      expect(mockEntityBuilder.validateAsset).to.have.been.calledWith(mockAsset);
      expect(mockAccountRepository.get).to.have.been.calledWith(mockAsset.content.idData.createdBy);
      expect(mockEntityBuilder.setAssetBundle).to.have.been.calledWith(mockAsset, null);
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
      expect(mockEntityBuilder.setEventBundle).to.have.been.calledWith(mockEvent, null);
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

  describe('finding events', () => {
    it('coordinates all services', async () => {
      await scenario.addAsset(0);
      const eventSet = await scenario.generateEvents(
        100,
        (inx) => ({
          accountInx: 0,
          subjectInx: 0,
          fields: {timestamp: inx},
          data: {}
        })
      );
      mockEntityRepository.findEvents.resolves({results: eventSet, resultCount: 165});

      const ret = await expect(modelEngine.findEvents()).to.fulfilled;

      // asks the entity repository for the events
      expect(mockEntityRepository.findEvents).to.have.been.called;

      expect(ret.results).to.equal(eventSet);
      expect(ret.resultCount).to.equal(165);
    });
  });
});

