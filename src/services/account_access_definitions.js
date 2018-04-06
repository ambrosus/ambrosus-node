import {
  validateFieldsConstrainedToSet, validateIsAddress, validateNonNegativeInteger,
  validatePathsNotEmpty
} from '../utils/validations';
import {PermissionError, ValidationError} from '../errors/errors';

export default class AccountAccessDefinitions {
  constructor(identityManager, accountRepository) {
    this.identityManager = identityManager;
    this.accountRepository = accountRepository;
  }

  async ensureHasPermission(address, permissionName) {
    const account = await this.accountRepository.get(address);
    if (account === null) {
      throw new PermissionError(`Address ${address} doesn't exist`);
    }
    if (!this.hasPermission(account, permissionName)) {
      throw new PermissionError(`${account.address} has no '${permissionName}' permission`);
    }
  }

  async ensureCanRegisterAccount(address) {
    return this.ensureHasPermission(address, 'register_account');
  }

  async ensureCanCreateEntity(address) {
    return this.ensureHasPermission(address, 'create_entity');
  }

  async getTokenCreatorAccessLevel(tokenData) {
    if (!tokenData) {
      return 0;
    }
    const creatorAccount = await this.accountRepository.get(tokenData.createdBy);
    if (creatorAccount === null) {
      return 0;
    }
    return creatorAccount.accessLevel;
  }

  hasPermission(account, permissionName) {
    return account.permissions.indexOf(permissionName) >= 0;
  }

  defaultAdminAccount(address) {
    return {
      address,
      permissions: ['register_account', 'create_entity'],
      accessLevel: 1000
    };
  }

  validateAddAccountRequest(account) {
    const registrationFields = [
      'address',
      'permissions',
      'accessLevel'
    ];
    validatePathsNotEmpty(account, registrationFields);
    validateFieldsConstrainedToSet(account, registrationFields);
    validateNonNegativeInteger(account.accessLevel, 'AccessLevel should be a non-negative integer');
    validateIsAddress(account.address);
  }

  validateModifyAccountRequest(params) {
    const allowedParametersList = ['permissions', 'accessLevel'];
    validateFieldsConstrainedToSet(params, allowedParametersList);
    if (params.accessLevel) {
      validateNonNegativeInteger(params.accessLevel, 'Access level should be a non-negative integer');
    }
    if (params.permissions && !Array.isArray(params.permissions)) {
      throw new ValidationError(`Invalid permissions parameter value`);
    }
  }
}
