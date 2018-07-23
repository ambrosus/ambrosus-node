/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {get, put} from './dict_utils';
import {ValidationError} from '../errors/errors';

class ValidationAndCasting {
  constructor(params) {
    this.params = params;
  }

  getCastedParams() {
    return this.params;
  }

  required(paths) {
    for (const path of paths) {
      const value = get(this.params, path);
      if (value === undefined || value === null || value === '') {
        throw new ValidationError(`${path} should not be empty`);
      }
    }
    return this;
  }

  fieldsConstrainedToSet(validFields, path = '') {
    const invalidFields = Object.keys(get(this.params, path)).filter((key) => !validFields.includes(key));
    if (invalidFields.length > 0) {
      throw new ValidationError(
        `Some fields (${invalidFields.join(',')}) are outside of the allowed set of fields (${validFields})`);
    }
    return this;
  }

  castNumber(valueNames) {
    for (const valueName of valueNames) {
      const value = get(this.params, valueName);
      if (value) {
        const parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) {
          throw new ValidationError(`Invalid ${valueName} parameter value`);
        }
        this.params = put(this.params, valueName, parsedValue);
      }
    }
    return this;
  }

  isNonNegativeInteger(valueNames) {
    for (const valueName of valueNames) {
      const value = get(this.params, valueName);
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new ValidationError(`Invalid ${valueName} parameter value. Should be a non-negative integer.`);
      }
    }
    return this;
  }

  isAddress(valueNames) {
    const addressRegex = /^0x[0-9a-f]{40}$/i;
    for (const valueName of valueNames) {
      const value = get(this.params, valueName);
      if (value !== undefined && !addressRegex.exec(value)) {
        throw new ValidationError(`${valueName} = ${value} is not a valid ethereum address`);
      }
    }
    return this;
  }

  /**
   * Custom validator
   * @param valueNames - list of paths to validated parameters
   * @param validator - predicate returning true if value is correct
   * @param errorMsg - error message
   */
  validate(valueNames, validator, errorMsg) {
    for (const valueName of valueNames) {
      const value = get(this.params, valueName);
      if (value !== undefined && validator(value) !== true) {
        throw new ValidationError(`${valueName} = ${value}, ${errorMsg}`);
      }
    }
    return this;
  }
}

const validateAndCast = (params) => new ValidationAndCasting(params);

export default validateAndCast;
