import {PermissionError} from '../errors/errors';

export default class AccountAccessDefinitions {
  constructor(accountRepository) {
    this.accountRepository = accountRepository;
  }

  async setPermissions(address, permissions, sender) {
    await this.canChangePermissions(sender);
    return this.accountRepository.setPermissions(address, permissions);
  }

  async canChangePermissions(address) {
    if (!await this.checkPermission(address, 'change_account_permissions')) {
      throw new PermissionError(`${address} cannot change account permissions`);
    }
  }

  async checkPermission(address, permissionName) {
    const permissions = await this.accountRepository.getPermissions(address);
    return permissions.indexOf(permissionName) >= 0;
  }

  async createAdminAccountPermissions(adminAddress) {
    await this.accountRepository.setPermissions(adminAddress, ['change_account_permissions', 'create_account']);
  }
}
