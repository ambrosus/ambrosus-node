import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import AccountAccessDefinitions from '../../src/services/account_access_definitions';
import {PermissionError, ValidationError} from '../../src/errors/errors';
import {account, addAccountRequest} from '../fixtures/account';
import {pick, put} from '../../src/utils/dict_utils';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Account Access Definitions', () => {
  const permissions = ['permission1', 'permission2'];
  const mockAccount = {
    ...account,
    permissions
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
    mockAccountRepository.get.resolves(mockAccount);
  });

  it('hasPermission returns true only if an account has permission', () => {
    expect(accountAccessDefinitions.hasPermission(mockAccount, permissions[0])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, permissions[1])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, 'topsecret')).to.eq(false);
  });

  it('ensurePermission asks accountRepository for acocunt', async () => {
    await accountAccessDefinitions.ensureHasPermission(mockAccount.address, permissions[0]);
    expect(mockAccountRepository.get).to.be.calledWith(mockAccount.address);
  });

  it('ensurePermission throws PermissionError when account has no permission', async () => {
    await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, permissions[0]))
      .to.be.fulfilled;
    await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, 'topsecret'))
      .to.be.rejectedWith(PermissionError);
  });

  it('ensurePermission throws PermissionError when account with this address not found', async () => {
    mockAccountRepository.get.resolves(null);
    await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, permissions[0]))
      .to.be.rejectedWith(PermissionError);
  });

  it('defaultAdminPermissions returns correct list', async () => {
    expect(accountAccessDefinitions.defaultAdminPermissions())
      .to.deep.eq(['change_account_permissions', 'register_account', 'create_entity']);
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
      expect(() => accountAccessDefinitions.validateNewAccountRequest(brokenData)).to.throw(ValidationError);
    });

    it('throws if accessLevel is negative', async () => {
      const brokenData = put(account, 'accessLevel', -10);
      expect(() => accountAccessDefinitions.validateNewAccountRequest(brokenData)).to.throw(ValidationError);
    });
  });

  describe('validating account modification', () => {
    it(`throws if surplus parameters are passed`, () => {
      const notSupportedParams = {permissions : ['param1', 'param2'], extraParam : 'extraValue'};
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(notSupportedParams)).to.throw(ValidationError);
    });

    it(`throws if any parameters is invalid`, () => {
      const invalidParams1 = {permissions : 'notArrayPermission'};
      const invalidParams2 = {accessLevel: -5};
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(invalidParams1)).to.throw(ValidationError);
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(invalidParams2)).to.throw(ValidationError);
    });
  });
});
