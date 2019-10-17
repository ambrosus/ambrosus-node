/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {get, put} from './dict_utils';
import {ValidationError} from '../errors/errors';

const trimObject = (object, maxLength = 500) => {
  const stringifiedObject = object.toString();
  if (stringifiedObject.length > maxLength) {
    return `${stringifiedObject.substring(0, maxLength)}...`;
  }
  return stringifiedObject;
};

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
        if (isNaN(value)) {
          throw new ValidationError(`Invalid ${valueName} parameter value. ${trimObject(value)} is not a number`);
        }
        const parsedValue = parseFloat(value);
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

  isBoolean(valueNames) {
    for (const valueName of valueNames) {
      const value = get(this.params, valueName);

      if ((value !== undefined) && (typeof value !== 'boolean')) {
        throw new ValidationError(`Invalid ${valueName} parameter value. Should be a boolean.`);
      }
    }
    return this;
  }

  isHexOfLength(valueNames, length) {
    const hexRegex = new RegExp(`^0x[0-9a-f]{${length}}$`, 'i');
    for (const valueName of valueNames) {
      const value = get(this.params, valueName);
      if (value !== undefined && !hexRegex.exec(value)) {
        throw new ValidationError(`${valueName} = ${trimObject(value)} is not a hex of length ${length}`);
      }
    }
    return this;
  }

  isAddress(valueNames) {
    return this.isHexOfLength(valueNames, 40);
  }

  isHash(valueNames) {
    return this.isHexOfLength(valueNames, 64);
  }

  isUrl(valueNames) {
    const urlRegex = /^(?:(?:https?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i;
    for (const valueName of valueNames) {
      const value = get(this.params, valueName);
      if (value !== undefined && !urlRegex.exec(value)) {
        throw new ValidationError(`${valueName} = ${trimObject(value)} is not a valid URL`);
      }
    }
    return this;
  }

  isConstrainedToSize(maxSize, errorMsg = `Object is too large.`) {
    const serialized = JSON.stringify(this.params, null, 0);
    if (Buffer.byteLength(serialized) > maxSize) {
      throw new ValidationError(errorMsg);
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
        throw new ValidationError(`${valueName} = ${trimObject(value)}, ${errorMsg}`);
      }
    }
    return this;
  }
}

const validateAndCast = (params) => new ValidationAndCasting(params);

export default validateAndCast;
