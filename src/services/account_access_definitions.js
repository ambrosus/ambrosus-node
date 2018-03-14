import {validatePathsNotEmpty, validateFieldsConstrainedToSet} from '../utils/validations';
import {PermissionError, InvalidParametersError} from '../errors/errors';

export default class AccountAccessDefinitions {
  constructor(identityManager) {
    this.identityManager = identityManager;
  }

  ensureHasPermission(account, permissionName) {
    if (!this.hasPermission(account, permissionName)) {
      throw new PermissionError(`${account.address} has no '${permissionName}' permission`);
    }
  }

  hasPermission(account, permissionName) {
    return account.permissions.indexOf(permissionName) >= 0;
  }

  defaultAdminPermissions() {
    return ['change_account_permissions', 'create_account', 'create_entity'];
  }

  validateNewAccountRequest(account) {
    const registrationFields = [
      'address',
      'permissions'
    ];
    validatePathsNotEmpty(account, registrationFields);
    validateFieldsConstrainedToSet(account, registrationFields);
  }

  validateModifyAccountRequest(params) {
    const allowedParametersList = ['permissions'];
    const invalidFields = Object.keys(params).filter((key) => !allowedParametersList.includes(key));
    if (invalidFields.length > 0) {
      throw new InvalidParametersError(`Some parameters (${invalidFields.join(',')}) are not supported`);
    }
    if (params.permissions && !Array.isArray(params.permissions)) {
      throw new InvalidParametersError(`Invalid permissions parameter value`);
    }
  }
}
