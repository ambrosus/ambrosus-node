import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import AccountAccessDefinitions from '../../src/services/account_access_definitions';
import {PermissionError, ValidationError} from '../../src/errors/errors';
import {account, addAccountRequest} from '../fixtures/account';
import {pick, put} from '../../src/utils/dict_utils';
import resetHistory from '../helpers/reset_history';
import createTokenFor from '../fixtures/create_token_for';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Account Access Definitions', () => {
  const permissions = ['permission1', 'permission2'];
  const accessLevel = 4;
  const mockAccount = {
    ...account,
    permissions,
    accessLevel
  };
  let mockIdentityManager = null;
  let mockAccountRepository;
  let accountAccessDefinitions;

  before(() => {
    mockIdentityManager = {
      validateSignature: sinon.stub(),
      sign: sinon.stub()
    };
    mockAccountRepository = {
      get: sinon.stub()
    };
    accountAccessDefinitions = new AccountAccessDefinitions(mockIdentityManager, mockAccountRepository);
  });

  beforeEach(() => {
    resetHistory(mockIdentityManager, mockAccountRepository);
    mockAccountRepository.get.resolves(mockAccount);
  });

  it('hasPermission returns true only if an account has permission', () => {
    expect(accountAccessDefinitions.hasPermission(mockAccount, permissions[0])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, permissions[1])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, 'topsecret')).to.eq(false);
  });

  describe('ensurePermission', () => {
    it('asks accountRepository for acocunt', async () => {
      await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, permissions[0]))
        .to.be.fulfilled;
      expect(mockAccountRepository.get).to.be.calledWith(mockAccount.address);
    });

    it('throws PermissionError when account has no permission', async () => {
      await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, 'topsecret'))
        .to.be.rejectedWith(PermissionError);
    });

    it('throws PermissionError when account with this address not found', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, permissions[0]))
        .to.be.rejectedWith(PermissionError);
    });
  });

  describe('ensureCanRegisterAccount & ensureCanCreateEntity', () => {
    let ensureHasPermissionStub;

    before(() => {
      ensureHasPermissionStub = sinon.stub(accountAccessDefinitions, 'ensureHasPermission');
    });

    it('ensureCanRegisterAccount calls ensurePermission with `register_account`', async () => {
      await accountAccessDefinitions.ensureCanRegisterAccount(mockAccount.address);
      expect(ensureHasPermissionStub).to.be.calledWith(mockAccount.address, 'register_account');
    });

    it('ensureCanCreateEntity calls ensurePermission with `create_entity`', async () => {
      await accountAccessDefinitions.ensureCanCreateEntity(mockAccount.address);
      expect(ensureHasPermissionStub).to.be.calledWith(mockAccount.address, 'create_entity');
    });

    afterEach(() => {
      resetHistory({ensureHasPermissionStub});
    });

    after(() => {
      ensureHasPermissionStub.restore();
    });
  });

  it('defaultAdminAccount returns correct object', async () => {
    expect(accountAccessDefinitions.defaultAdminAccount('0x1234')).to.deep.eq(
      {
        address: '0x1234',
        permissions: ['register_account', 'create_entity'],
        accessLevel: 1000
      });
  });

  describe('getTokenCreatorAccessLevel', () => {
    const mockToken = createTokenFor({createdBy: mockAccount.address});

    it('returns accessLevel of the account if registered', async () => {
      await expect(accountAccessDefinitions.getTokenCreatorAccessLevel(mockToken))
        .to.be.eventually.equal(accessLevel);
      expect(mockAccountRepository.get).to.be.calledWith(mockToken.createdBy);
    });

    it('assumes access level = 0 when no token provided', async () => {
      await expect(accountAccessDefinitions.getTokenCreatorAccessLevel())
        .to.be.eventually.equal(0);
      await expect(accountAccessDefinitions.getTokenCreatorAccessLevel(null))
        .to.be.eventually.equal(0);
    });

    it('assumes access level = 0 when user not registered', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(accountAccessDefinitions.getTokenCreatorAccessLevel(mockToken))
        .to.be.eventually.equal(0);
    });
  });

  describe('validating account registration', () => {
    let account;

    before(() => {
      mockIdentityManager.sign.returns('0x1');
      account = addAccountRequest();
    });

    for (const field of ['address', 'permissions', 'accessLevel']) {
      // eslint-disable-next-line no-loop-func
      it(`throws if the ${field} field is missing`, () => {
        const brokenData = pick(account, field);
        expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
      });
    }

    it(`throws if surplus fields are passed`, () => {
      const brokenData = put(account, 'extraField', 'extraValue');
      expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
    });

    it('throws if accessLevel is not integer', async () => {
      const brokenData = put(account, 'accessLevel', 3.14);
      expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
    });

    it('throws if accessLevel is negative', async () => {
      const brokenData = put(account, 'accessLevel', -10);
      expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
    });

    it('throws if address has wrong format', async () => {
      const brokenData = put(account, 'address', '0x123');
      expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
    });
  });

  describe('validating account modification', () => {
    it(`throws if surplus parameters are passed`, () => {
      const notSupportedParams = {permissions : ['param1', 'param2'], extraParam : 'extraValue'};
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(notSupportedParams)).to.throw(ValidationError);
    });

    it(`throws if any parameters is invalid`, () => {
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({permissions : 'notArrayPermission'}))
        .to.throw(ValidationError);
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({accessLevel: -5}))
        .to.throw(ValidationError);
    });
  });
});
