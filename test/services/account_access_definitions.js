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

import AccountAccessDefinitions from '../../src/services/account_access_definitions';
import {PermissionError, ValidationError} from '../../src/errors/errors';
import {account, addAccountRequest} from '../fixtures/account';
import {pick, put} from '../../src/utils/dict_utils';
import resetHistory from '../helpers/reset_history';
import createTokenFor from '../fixtures/create_token_for';
import allPermissions from '../../src/utils/all_permissions';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Account Access Definitions', () => {
  const mockPermissions = ['permission1', 'permission2'];
  const accessLevel = 4;
  const organization = 3;
  const mockAccount = {
    ...account,
    permissions: mockPermissions,
    accessLevel,
    organization
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
    expect(accountAccessDefinitions.hasPermission(mockAccount, mockPermissions[0])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, mockPermissions[1])).to.eq(true);
    expect(accountAccessDefinitions.hasPermission(mockAccount, 'topsecret')).to.eq(false);
  });

  describe('ensurePermission', () => {
    it('asks accountRepository for account', async () => {
      await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, mockPermissions[0]))
        .to.be.fulfilled;
      expect(mockAccountRepository.get).to.be.calledWith(mockAccount.address);
    });

    it('does not throw when account has super_account permission', async () => {
      mockAccountRepository.get.resolves(put(mockAccount, 'permissions', [allPermissions.superAccount]));
      await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, 'topsecret')).to.be.eventually.fulfilled;
    });

    it('throws PermissionError when account has no permission', async () => {
      await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, 'topsecret'))
        .to.be.rejectedWith(PermissionError);
    });

    it('throws PermissionError when account with this address not found', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(accountAccessDefinitions.ensureHasPermission(mockAccount.address, mockPermissions[0]))
        .to.be.rejectedWith(PermissionError);
    });
  });

  describe('permission checkers', () => {
    let ensureHasPermissionStub;

    before(() => {
      ensureHasPermissionStub = sinon.stub(accountAccessDefinitions, 'ensureHasPermission');
    });

    it('ensureCanRegisterAccounts calls ensurePermission with `register_account`', async () => {
      await accountAccessDefinitions.ensureCanRegisterAccounts(mockAccount.address);
      expect(ensureHasPermissionStub).to.be.calledWith(mockAccount.address, allPermissions.registerAccounts);
    });

    it('ensureCanManageAccounts calls ensurePermission with `manage_accounts`', async () => {
      await accountAccessDefinitions.ensureCanManageAccounts(mockAccount.address);
      expect(ensureHasPermissionStub).to.be.calledWith(mockAccount.address, allPermissions.manageAccounts);
    });

    it('ensureCanCreateAsset calls ensurePermission with `create_asset`', async () => {
      await accountAccessDefinitions.ensureCanCreateAsset(mockAccount.address);
      expect(ensureHasPermissionStub).to.be.calledWith(mockAccount.address, allPermissions.createAsset);
    });

    it('ensureCanCreateEvent calls ensurePermission with `create_event`', async () => {
      await accountAccessDefinitions.ensureCanCreateEvent(mockAccount.address);
      expect(ensureHasPermissionStub).to.be.calledWith(mockAccount.address, allPermissions.createEvent);
    });

    afterEach(() => {
      resetHistory({ensureHasPermissionStub});
    });

    after(() => {
      ensureHasPermissionStub.restore();
    });
  });

  describe('ensureCanRegisterTheAccount', () => {
    const registeredAccount = {
      permissions: [allPermissions.createEvent, allPermissions.createAsset],
      accessLevel: 4,
      organization: 3
    };
    const creatorAddress = '0x123';
    let ensurePermissionsStub;
    let checkOrganizationStub;
    let hasPermissionStub;

    before(() => {
      ensurePermissionsStub = sinon.stub(accountAccessDefinitions, 'ensureNoExceedingPermissions');
      hasPermissionStub = sinon.stub(accountAccessDefinitions, 'hasPermission');
      checkOrganizationStub = sinon.stub(accountAccessDefinitions, 'ensureSameOrganization');
    });

    beforeEach(() => {
      ensurePermissionsStub.returns();
      checkOrganizationStub.returns();
      hasPermissionStub.returns(false);
    });

    it('gets the creator account and passes it to other methods', async () => {
      await accountAccessDefinitions.ensureCanRegisterTheAccount(creatorAddress, registeredAccount);
      expect(mockAccountRepository.get).to.be.calledOnceWith(creatorAddress);
      expect(hasPermissionStub).to.be.calledOnceWith(mockAccount, allPermissions.superAccount);
      expect(ensurePermissionsStub).to.be.calledOnceWith(mockAccount, registeredAccount);
      expect(checkOrganizationStub).to.be.calledOnceWith(mockAccount, registeredAccount);
    });

    it('when the creator is super user does not perform checks', async () => {
      hasPermissionStub.returns(true);
      await accountAccessDefinitions.ensureCanRegisterTheAccount(creatorAddress, registeredAccount);
      expect(ensurePermissionsStub).to.be.not.called;
      expect(checkOrganizationStub).to.be.not.called;
    });

    it('throws if creator account does not exist', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(accountAccessDefinitions.ensureCanRegisterTheAccount(creatorAddress, registeredAccount)).to.be.eventually.rejectedWith(PermissionError);
    });

    it('throws if ensureNoExceedingPermissions throws', async () => {
      ensurePermissionsStub.throws();
      await expect(accountAccessDefinitions.ensureCanRegisterTheAccount(creatorAddress, registeredAccount)).to.be.eventually.rejected;
    });

    it('throws if ensureSameOrganization throws', async () => {
      checkOrganizationStub.throws();
      await expect(accountAccessDefinitions.ensureCanRegisterTheAccount(creatorAddress, registeredAccount)).to.be.eventually.rejected;
    });

    afterEach(() => {
      resetHistory({checkPermissionsStub: ensurePermissionsStub, checkOrganizationStub, hasPermissionStub});
    });

    after(() => {
      ensurePermissionsStub.restore();
      checkOrganizationStub.restore();
      hasPermissionStub.restore();
    });
  });

  describe('ensureCanModifyTheAccount', () => {
    const originalAccount = {
      permissions: [allPermissions.createEvent, allPermissions.createAsset],
      accessLevel: 4,
      organization: 3
    };
    const modificationRequest = {
      accessLevel: 3,
      organization: 321
    };
    const creatorAddress = '0x123';
    let ensurePermissionsStub;
    let checkOrganizationStub;
    let hasPermissionStub;

    before(() => {
      ensurePermissionsStub = sinon.stub(accountAccessDefinitions, 'ensureNoExceedingPermissions');
      hasPermissionStub = sinon.stub(accountAccessDefinitions, 'hasPermission');
      checkOrganizationStub = sinon.stub(accountAccessDefinitions, 'ensureSameOrganization');
    });

    beforeEach(() => {
      ensurePermissionsStub.returns();
      checkOrganizationStub.returns();
      hasPermissionStub.returns(false);
    });

    it('gets the modifier account and checks if has enough permissions', async () => {
      await accountAccessDefinitions.ensureCanModifyTheAccount(creatorAddress, originalAccount, modificationRequest);
      expect(mockAccountRepository.get).to.be.calledOnceWith(creatorAddress);
      expect(hasPermissionStub).to.be.calledWith(mockAccount, allPermissions.superAccount);
      expect(ensurePermissionsStub).to.be.calledOnceWith(mockAccount, modificationRequest);
      expect(checkOrganizationStub).to.be.calledOnceWith(mockAccount, originalAccount);
      expect(hasPermissionStub).to.be.calledWith(originalAccount, allPermissions.protectedAccount);
    });

    it('when the creator is super user does not perform any more checks', async () => {
      hasPermissionStub.withArgs(mockAccount, allPermissions.superAccount).returns(true);
      await accountAccessDefinitions.ensureCanModifyTheAccount(creatorAddress, originalAccount, modificationRequest);
      expect(ensurePermissionsStub).to.be.not.called;
      expect(checkOrganizationStub).to.be.not.called;
    });

    it('throws if tying to modify the protected account', async () => {
      hasPermissionStub.withArgs(originalAccount, allPermissions.protectedAccount).returns(true);
      await expect(accountAccessDefinitions.ensureCanModifyTheAccount(creatorAddress, originalAccount, modificationRequest)).to.be.eventually.rejectedWith(PermissionError);
    });

    it('throws if modifier account does not exist', async () => {
      mockAccountRepository.get.resolves(null);
      await expect(accountAccessDefinitions.ensureCanModifyTheAccount(creatorAddress, originalAccount, modificationRequest)).to.be.eventually.rejectedWith(PermissionError);
    });

    it('throws if ensureNoExceedingPermissions throws', async () => {
      ensurePermissionsStub.throws();
      await expect(accountAccessDefinitions.ensureCanModifyTheAccount(creatorAddress, originalAccount, modificationRequest)).to.be.eventually.rejected;
    });

    it('throws if ensureSameOrganization throws', async () => {
      checkOrganizationStub.throws();
      await expect(accountAccessDefinitions.ensureCanModifyTheAccount(creatorAddress, originalAccount, modificationRequest)).to.be.eventually.rejected;
    });

    afterEach(() => {
      resetHistory({checkPermissionsStub: ensurePermissionsStub, checkOrganizationStub, hasPermissionStub});
      hasPermissionStub.resetBehavior();
    });

    after(() => {
      ensurePermissionsStub.restore();
      checkOrganizationStub.restore();
      hasPermissionStub.restore();
    });
  });

  describe('ensureNoExceedingPermissions', () => {
    const account = {permissions: ['a', 'b'], accessLevel: 3};
    it('passes when same permissions and same access level', () => {
      accountAccessDefinitions.ensureNoExceedingPermissions(account, account);
    });

    it('passes when second account has subset of first accounts permissions', () => {
      accountAccessDefinitions.ensureNoExceedingPermissions(account, {permissions: ['a']});
      accountAccessDefinitions.ensureNoExceedingPermissions(account, {permissions: ['b']});
      accountAccessDefinitions.ensureNoExceedingPermissions(account, {permissions: []});
    });

    it('passes when second account access level is not greater than access level of first account', async () => {
      accountAccessDefinitions.ensureNoExceedingPermissions(account, {accessLevel: 3});
      accountAccessDefinitions.ensureNoExceedingPermissions(account, {accessLevel: 0});
    });

    it('passes when second account is an empty object', async () => {
      accountAccessDefinitions.ensureNoExceedingPermissions(account, {});
    });

    it('throws if second account has exceeding permissions', () => {
      expect(() => accountAccessDefinitions.ensureNoExceedingPermissions(account, {permissions: ['c']})).to.throw(PermissionError);
    });

    it('throws when second account has higher access level', () => {
      expect(() => accountAccessDefinitions.ensureNoExceedingPermissions(account, {accessLevel: 12})).to.throw(PermissionError);
    });
  });

  describe('ensureSameOrganization', () => {
    it('passes when accounts have same organization', () => {
      accountAccessDefinitions.ensureSameOrganization({organization: 1}, {organization: 1});
    });

    it('passes when second account has no organization', async () => {
      accountAccessDefinitions.ensureSameOrganization({organization: 1}, {});
    });

    it('throws when accounts have different organizations', async () => {
      expect(() => accountAccessDefinitions.ensureSameOrganization({organization: 1}, {organization: 2})).to.throw(PermissionError);
    });
  });

  it('defaultAdminAccount returns correct object', async () => {
    const clock = sinon.useFakeTimers(15000);
    expect(accountAccessDefinitions.defaultAdminAccount('0x1234')).to.deep.include(
      {
        address: '0x1234',
        permissions: [allPermissions.superAccount],
        accessLevel: 1000,
        registeredOn: 15
      });
    clock.restore();
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

  describe('Validating query parameters', () => {
    const validParamsAsStrings = {accessLevel: '3', registeredBy: mockAccount.address};

    it('passes for proper parameters', () => {
      const validatedParams = accountAccessDefinitions.validateAndCastFindAccountParams(validParamsAsStrings);
      expect(validatedParams.accessLevel).to.equal(3);
    });

    it('throws if surplus parameters are passed', () => {
      const params = put(validParamsAsStrings, 'additionalParam', '123');
      expect(() => accountAccessDefinitions.validateAndCastFindAccountParams(params)).to.throw(ValidationError);
    });

    it('throws if accessLevel value not in valid type', () => {
      const params = put(validParamsAsStrings, 'accessLevel', 'NaN');
      expect(() => accountAccessDefinitions.validateAndCastFindAccountParams(params)).to.throw(ValidationError);
    });

    it('throws if accessLevel is not integer or not positive', () => {
      expect(() => accountAccessDefinitions.validateAndCastFindAccountParams(put(validParamsAsStrings, 'accessLevel', '-10'))).to.throw(ValidationError);
    });

    it('throws if registeredBy is not valid address', () => {
      const params = put(validParamsAsStrings, 'registeredBy', '0x12312312');
      expect(() => accountAccessDefinitions.validateAndCastFindAccountParams(params)).to.throw(ValidationError);
    });
  });


  describe('validating account registration', () => {
    let account;

    before(() => {
      mockIdentityManager.sign.returns('0x1');
      account = addAccountRequest();
    });

    it('does not throw if account is valid', async () => {
      accountAccessDefinitions.validateAddAccountRequest(account);
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

    it('throws if organization is not a number', async () => {
      const brokenData = put(account, 'organization', 'abc');
      expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
    });

    it('throws if organization is negative', async () => {
      const brokenData = put(account, 'organization', -10);
      expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
    });

    it('throws if organization is not an integer', async () => {
      const brokenData = put(account, 'organization', 3.14);
      expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
    });

    it('throws if accessLevel is not a number', async () => {
      const brokenData = put(account, 'accessLevel', 'abc');
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

    describe('permissions', () => {
      it('does not throw for all valid permissions', async () => {
        accountAccessDefinitions.validateAddAccountRequest({...account, permissions: Object.values(allPermissions)});
      });

      it('throws if unknown permission provided', async () => {
        const brokenData = put(account, 'permissions', [...Object.values(allPermissions), 'bad_permission']);
        expect(() => accountAccessDefinitions.validateAddAccountRequest(brokenData)).to.throw(ValidationError);
      });
    });
  });

  describe('validating account modification', () => {
    it('does not throw when all possible fields are valid', async () => {
      const validParams = {permissions: [allPermissions.createAsset], accessLevel: 3, organization: 3};
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(validParams)).to.not.throw();
    });

    it('does not throw when some fields are omitted', async () => {
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({permissions: []})).to.not.throw();
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({accessLevel: 1})).to.not.throw();
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({organization: 2})).to.not.throw();
    });

    it(`throws if surplus parameters are passed`, () => {
      const notSupportedParams = {permissions : [allPermissions.createAsset], extraParam : 'extraValue'};
      expect(() => accountAccessDefinitions.validateModifyAccountRequest(notSupportedParams)).to.throw(ValidationError);
    });

    it('throws if permissions field is not valid', async () => {
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({permissions : 'notArrayPermission'}))
        .to.throw(ValidationError);
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({permissions : 12}))
        .to.throw(ValidationError);
    });

    it('throws if access level is not valid', async () => {
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({accessLevel: 'not a number'}))
        .to.throw(ValidationError);
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({accessLevel: -5}))
        .to.throw(ValidationError);
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({accessLevel: 1.4}))
        .to.throw(ValidationError);
    });

    it(`throws if organization is not valid`, () => {
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({organization: 'not a number'}))
        .to.throw(ValidationError);
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({organization: -5}))
        .to.throw(ValidationError);
      expect(() => accountAccessDefinitions.validateModifyAccountRequest({organization: 1.4}))
        .to.throw(ValidationError);
    });

    describe('permissions', () => {
      it('does not throw for all valid permissions', async () => {
        accountAccessDefinitions.validateModifyAccountRequest({permissions: Object.values(allPermissions)});
      });

      it('throws if unknown permission provided', async () => {
        const brokenData = {permissions: [...Object.values(allPermissions), 'bad_permission']};
        expect(() => accountAccessDefinitions.validateModifyAccountRequest(brokenData)).to.throw(ValidationError);
      });
    });
  });
});
