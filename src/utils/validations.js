/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {get} from './dict_utils';
import {InvalidParametersError, ValidationError} from '../errors/errors';

const validatePathsNotEmpty = (dict, paths) => {
  for (const path of paths) {
    const value = get(dict, path);
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(`${path} should not be empty`);
    }
  }
};

const validateFieldsConstrainedToSet = (dict, validFields) => {
  const invalidFields = Object.keys(dict).filter((key) => !validFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ValidationError(`Some fields (${invalidFields.join(',')}) are outside of the allowed set of fields (${validFields})`);
  }
};

const validateIntegerParameterAndCast = (value, errorMsg) => {
  if (value) {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      throw new InvalidParametersError(`Invalid ${errorMsg} parameter value`);
    }
    return parsedValue;
  }
};

const validateNonNegativeInteger = (value, errorMsg = '') => {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(errorMsg);
  }
};

const validateIsAddress = (address, errorMsg = `${address} is not a valid ethereum address`) => {
  const addressRegex = /^0x[0-9a-f]{40}$/gi;
  if (!addressRegex.exec(address)) {
    throw new ValidationError(errorMsg);
  }
};

export {
  validatePathsNotEmpty,
  validateFieldsConstrainedToSet,
  validateIntegerParameterAndCast,
  validateNonNegativeInteger,
  validateIsAddress
};
