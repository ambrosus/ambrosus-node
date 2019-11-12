/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';
import {PermissionError, ValidationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';
import allPermissions from '../utils/all_permissions';

export default class AccountAccessDefinitions {
  constructor(identityManager, accountRepository, organizationRepository) {
    this.identityManager = identityManager;
    this.accountRepository = accountRepository;
    this.organizationRepository = organizationRepository;
  }

  async ensureHasPermission(address, permissionName) {
    const account = await this.accountRepository.get(address);
    if (account === null) {
      throw new PermissionError(`Account with address ${address} doesn't exist`);
    }
    if (!this.hasPermission(account, allPermissions.superAccount) && !this.hasPermission(account, permissionName)) {
      throw new PermissionError(`${account.address} has no '${permissionName}' permission`);
    }
  }

  async ensureNotBuiltInAccount(managedAccount) {
    const adminAddress = await this.identityManager.adminAddress();

    if (adminAddress === managedAccount.address) {
      throw new PermissionError(`Can not modify built-in admin account`);
    }
  }

  async ensureCanCreateAsset(address) {
    const creator = await this.accountRepository.get(address);
    this.ensureActiveAccount(creator);
    await this.ensureActiveOrganization(creator);
    return this.ensureHasPermission(address, allPermissions.createAsset);
  }

  async ensureCanCreateEvent(address, accessLevel) {
    await this.ensureHasPermission(address, allPermissions.createEvent);
    const creator = await this.accountRepository.get(address);
    this.ensureActiveAccount(creator);
    await this.ensureActiveOrganization(creator);
    if (accessLevel > creator.accessLevel) {
      throw new PermissionError(`The event's access level needs to be less than or equal to your access level`);
    }
  }

  async ensureCanAddAccount(address, newAccountRequest) {
    await this.ensureHasPermission(address, allPermissions.registerAccounts);
    this.validateAddAccountRequest(newAccountRequest);
    const creator = await this.accountRepository.get(address);
    this.ensureActiveAccount(creator);
    if (this.hasPermission(creator, allPermissions.superAccount)) {
      return;
    }
    await this.ensureActiveOrganization(creator);
    this.ensureNoExceedingPermissions(creator, newAccountRequest);
    this.ensureSameOrganization(creator, newAccountRequest);
  }

  async ensureCanModifyAccount(address, accountToChange, accountModificationRequest) {
    await this.ensureNotBuiltInAccount(accountToChange);
    await this.ensureHasPermission(address, allPermissions.manageAccounts);
    this.validateModifyAccountRequest(accountModificationRequest);
    const modifier = await this.accountRepository.get(address);
    this.ensureActiveAccount(modifier);
    this.ensureNotSameAccount(modifier, accountToChange);
    if (this.hasPermission(modifier, allPermissions.superAccount)) {
      return;
    }
    await this.ensureActiveOrganization(modifier);
    this.ensureNoExceedingPermissions(modifier, accountModificationRequest);
    this.ensureSameOrganization(modifier, accountToChange);
    if (this.hasPermission(accountToChange, allPermissions.protectedAccount)) {
      throw new PermissionError('Protected accounts cannot be modified');
    }
  }

  async ensureCanViewAccount(callerAddress, accountToView) {
    const requestedBy = await this.accountRepository.get(callerAddress);

    this.ensureActiveAccount(requestedBy);

    if (this.hasPermission(requestedBy, allPermissions.superAccount)) {
      return;
    }

    await this.ensureHasPermission(requestedBy.address, allPermissions.manageAccounts);

    await this.ensureActiveOrganization(requestedBy);

    this.ensureSameOrganization(requestedBy, accountToView);
  }

  ensureNoExceedingPermissions(managingAccount, managedAccount) {
    if (managedAccount.permissions) {
      const hasExceedingPermissions = managedAccount.permissions.some(
        (permission) => !managingAccount.permissions.includes(permission));
      if (hasExceedingPermissions) {
        throw new PermissionError(`You cannot assign other accounts the permissions you don't possess. Your permissions are: ${managingAccount.permissions}`);
      }
    }
    if (managedAccount.accessLevel !== undefined && managedAccount.accessLevel > managingAccount.accessLevel) {
      throw new PermissionError(`Your access level needs to be not less than the one you want to set`);
    }
  }

  ensureSameOrganization(managingAccount, managedAccount) {
    if (managedAccount.organization && managingAccount.organization !== managedAccount.organization) {
      throw new PermissionError(`You need to belong to the same organization`);
    }
  }

  ensureNotSameAccount(managingAccount, managedAccount) {
    if (managingAccount.address === managedAccount.address) {
      throw new PermissionError(`Account can not modify itself`);
    }
  }

  ensureActiveAccount(account) {
    if (!account.active) {
      throw new PermissionError(`Account is disabled`);
    }
  }

  async ensureActiveOrganization(account) {
    const isActiveOrganization = await this.organizationRepository.isActive(account.organization);

    if (!isActiveOrganization) {
      throw new PermissionError(`Organization is disabled`);
    }
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
      active: true,
      permissions: [allPermissions.superAccount, allPermissions.manageAccounts, allPermissions.registerAccounts],
      registeredOn: getTimestamp(),
      accessLevel: 1000,
      organization: 0
    };
  }

  validateCorrectPermission(permissionName) {
    if (!Object.values(allPermissions).includes(permissionName)) {
      throw new ValidationError(
        `${permissionName} is not a valid permission. Allowed permissions are:\n${Object.values(allPermissions)}`);
    }
  }

  validateAndCastFindAccountParams(params) {
    const allowedParametersList = ['accessLevel', 'page', 'perPage', 'registeredBy', 'organization'];

    return validateAndCast(params)
      .fieldsConstrainedToSet(allowedParametersList)
      .castNumber(['accessLevel', 'page', 'perPage', 'organization'])
      .isNonNegativeInteger(['accessLevel', 'page', 'perPage'])
      .validate(['perPage'], (perPage) => perPage <= 100, 'pageSize should not be higher than 100')
      .validate(['perPage'], (perPage) => 0 < perPage, 'pageSize should be positive')
      .isAddress(['registeredBy'])
      .getCastedParams();
  }

  validateAddAccountRequest(account) {
    const requiredFields = [
      'address',
      'permissions',
      'accessLevel'
    ];
    const allowedFields = [...requiredFields, 'organization', 'active'];

    validateAndCast(account)
      .required(requiredFields)
      .fieldsConstrainedToSet(allowedFields)
      .isNonNegativeInteger(['accessLevel', 'organization'])
      .isBoolean(['active'])
      .isAddress(['address']);

    account.permissions.forEach(this.validateCorrectPermission);
  }

  validateModifyAccountRequest(params) {
    const allowedParametersList = ['permissions', 'accessLevel', 'organization', 'active'];

    validateAndCast(params)
      .fieldsConstrainedToSet(allowedParametersList)
      .isNonNegativeInteger(['accessLevel', 'organization'])
      .isBoolean(['active'])
      .validate(['permissions'], (permissions) => Array.isArray(permissions), 'Permissions should be an array');

    if (params.permissions) {
      params.permissions.forEach(this.validateCorrectPermission);
    }
  }
}
