import {validatePathsNotEmpty} from '../utils/validations';
import {PermissionError} from '../errors/errors';

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
    return ['change_account_permissions', 'create_account'];
  }

  validateNewAccountRequest(account) {
    validatePathsNotEmpty(account, [
      'idData',
      'idData.createdBy'
    ]);
  }
}
