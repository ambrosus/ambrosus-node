import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import AccountAccessDefinitions from '../../src/services/account_access_definitions';
import {PermissionError, ValidationError, InvalidParametersError} from '../../src/errors/errors';
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
  let accountAccessDefinitions;

  before(() => {
    mockIdentityManager = {
      validateSignature: sinon.stub(),
      sign: sinon.stub()
    };
    accountAccessDefinitions = new AccountAccessDefinitions(mockIdentityManager);
  });

  it('hasPermission returns true only if an account has permission', () => {
    expect(accountAccessDefinitions.hasPermission(mockAccount, permissions[0])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, permissions[1])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, 'topsecret')).to.eq(false);
  });

  it('ensurePermission throws PermissionError when account has no permission', () => {
    expect(() => accountAccessDefinitions.ensureHasPermission(mockAccount, permissions[0])).to.not.throw();
    expect(() => accountAccessDefinitions.ensureHasPermission(mockAccount, 'topsecret')).to.throw(PermissionError);
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

    for (const field of ['address', 'permissions']) {
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
  });

  describe('validating account modification', () => {
    it(`throws if surplus parameters are passed`, () => {
      const notSupportedParams = {permissions : ['param1', 'param2'], extraParam : 'extraValue'};
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(notSupportedParams)).to.throw(InvalidParametersError);
    });

    it(`throws if any parameters is invalid`, () => {
      const invalidParams = {permissions : 'notArrayPermission'};
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(invalidParams)).to.throw(InvalidParametersError);
    });
  });
});
