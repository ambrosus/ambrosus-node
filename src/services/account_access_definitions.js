/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';
import {PermissionError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';

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
      registeredOn: getTimestamp(),
      accessLevel: 1000
    };
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
  }

  validateModifyAccountRequest(params) {
    const allowedParametersList = ['permissions', 'accessLevel', 'organization'];

    validateAndCast(params)
      .fieldsConstrainedToSet(allowedParametersList)
      .isNonNegativeInteger(['accessLevel', 'organization'])
      .validate(['permissions'], (permissions) => Array.isArray(permissions), 'Permissions should be an array');
  }
}
