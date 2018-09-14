/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';
import {PermissionError, ValidationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';
import allPermissions from '../utils/all_permissions';

export default class AccountAccessDefinitions {
  constructor(identityManager, accountRepository) {
    this.identityManager = identityManager;
    this.accountRepository = accountRepository;
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

  async ensureCanRegisterAccounts(address) {
    return this.ensureHasPermission(address, allPermissions.registerAccounts);
  }

  async ensureCanManageAccounts(address) {
    return this.ensureHasPermission(address, allPermissions.manageAccounts);
  }

  async ensureCanCreateAsset(address) {
    return this.ensureHasPermission(address, allPermissions.createAsset);
  }

  async ensureCanCreateEvent(address) {
    return this.ensureHasPermission(address, allPermissions.createEvent);
  }

  async ensureCanRegisterTheAccount(address, newAccount) {
    const creator = await this.accountRepository.get(address);
    if (creator === null) {
      throw new PermissionError(`Account with address ${address} doesn't exist`);
    }
    if (this.hasPermission(creator, allPermissions.superAccount)) {
      return;
    }
    this.ensureNoExceedingPermissions(creator, newAccount);
    this.ensureSameOrganization(creator, newAccount);
  }

  async ensureCanModifyTheAccount(address, accountToChange, accountModificationRequest) {
    const modifier = await this.accountRepository.get(address);
    if (modifier === null) {
      throw new PermissionError(`Account with address ${address} doesn't exist`);
    }
    if (this.hasPermission(modifier, allPermissions.superAccount)) {
      return;
    }
    this.ensureNoExceedingPermissions(modifier, accountModificationRequest);
    this.ensureSameOrganization(modifier, accountToChange);
    if (this.hasPermission(accountToChange, allPermissions.protectedAccount)) {
      throw new PermissionError('You cannot modify protected accounts');
    }
  }

  ensureNoExceedingPermissions(managingAccount, managedAccount) {
    if (managedAccount.permissions) {
      const exceedingPermissions = managedAccount.permissions.filter(
        (permission) => !managingAccount.permissions.includes(permission));
      if (exceedingPermissions.length > 0) {
        throw new PermissionError(`No permissions: ${exceedingPermissions}`);
      }
    }
    if (managedAccount.accessLevel !== undefined && managedAccount.accessLevel > managingAccount.accessLevel) {
      throw new PermissionError(`Minimal access level ${managedAccount.accessLevel} required`);
    }
  }

  ensureSameOrganization(managingAccount, managedAccount) {
    if (managedAccount.organization && managingAccount.organization !== managedAccount.organization) {
      throw new PermissionError(`You belong to the different organization`);
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
      permissions: [allPermissions.superAccount],
      registeredOn: getTimestamp(),
      accessLevel: 1000
    };
  }

  validateCorrectPermission(permissionName) {
    if (!Object.values(allPermissions).includes(permissionName)) {
      throw new ValidationError(
        `${permissionName} is not a valid permission. Only permissions allowed are:\n${Object.values(allPermissions)}`);
    }
  }

  validateAndCastFindAccountParams(params) {
    const allowedParametersList = ['accessLevel', 'page', 'perPage', 'registeredBy'];

    return validateAndCast(params)
      .fieldsConstrainedToSet(allowedParametersList)
      .castNumber(['accessLevel', 'page', 'perPage'])
      .isNonNegativeInteger(['accessLevel', 'page', 'perPage'])
      .isAddress(['registeredBy'])
      .getCastedParams();
  }

  validateAddAccountRequest(account) {
    const requiredFields = [
      'address',
      'permissions',
      'accessLevel'
    ];
    const allowedFields = [...requiredFields, 'organization'];

    validateAndCast(account)
      .required(requiredFields)
      .fieldsConstrainedToSet(allowedFields)
      .isNonNegativeInteger(['accessLevel', 'organization'])
      .isAddress(['address']);

    account.permissions.forEach(this.validateCorrectPermission);
  }

  validateModifyAccountRequest(params) {
    const allowedParametersList = ['permissions', 'accessLevel', 'organization'];

    validateAndCast(params)
      .fieldsConstrainedToSet(allowedParametersList)
      .isNonNegativeInteger(['accessLevel', 'organization'])
      .validate(['permissions'], (permissions) => Array.isArray(permissions), 'Permissions should be an array');

    if (params.permissions) {
      params.permissions.forEach(this.validateCorrectPermission);
    }
  }
}
