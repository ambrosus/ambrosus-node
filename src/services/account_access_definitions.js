import {validateFieldsConstrainedToSet, validateNonNegativeInteger, validatePathsNotEmpty, validateFieldsConstrainedToSet} from '../utils/validations';
import {PermissionError, ValidationError} from '../errors/errors';

export default class AccountAccessDefinitions {
  constructor(identityManager, accountRepository) {
    this.identityManager = identityManager;
    this.accountRepository = accountRepository;
  }

  async ensureHasPermission(address, permissionName) {
    const account = await this.accountRepository.get(address);
    if (account === null) {
      throw new PermissionError(`Address ${account} doesn't exist`);
    }
    if (!this.hasPermission(account, permissionName)) {
      throw new PermissionError(`${account.address} has no '${permissionName}' permission`);
    }
  }

  hasPermission(account, permissionName) {
    return account.permissions.indexOf(permissionName) >= 0;
  }

  defaultAdminPermissions() {
    return ['change_account_permissions', 'register_account', 'create_entity'];
  }

  validateNewAccountRequest(account) {
    const registrationFields = [
      'address',
      'permissions'
    ];
    validatePathsNotEmpty(account, registrationFields);
    validateFieldsConstrainedToSet(account, registrationFields);
    validateNonNegativeInteger(account.accessLevel, 'AccessLevel should be a not negative integer');
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
