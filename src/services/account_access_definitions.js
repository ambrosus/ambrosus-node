import {PermissionError} from '../errors/errors';

export default class AccountAccessDefinitions {
  constructor(accountRepository) {
    this.accountRepository = accountRepository;
  }

  async setPermissions(address, permissions, sender) {
    await this.ensureHasChangeAccountPermissions(sender);
    return this.accountRepository.setPermissions(address, permissions);
  }

  async ensureHasChangeAccountPermissions(address) {
    if (!await this.hasPermission(address, 'change_account_permissions')) {
      throw new PermissionError(`${address} cannot change account permissions`);
    }
  }

  async hasPermission(address, permissionName) {
    const permissions = await this.accountRepository.getPermissions(address);
    return permissions.indexOf(permissionName) >= 0;
  }

  defaultAdminPermissions() {
    return ['change_account_permissions', 'create_account'];
  }
}
