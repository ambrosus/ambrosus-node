/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {get, put} from './dict_utils';
import {ValidationError} from '../errors/errors';
import psl from 'psl';

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

  isNodeUrl(valueNames) {
    const isValidUrl = (inputUrl) => {
      try {
        const stringUrl = inputUrl.toString();
        const url = new URL(stringUrl);
        const {protocol, hostname} = url;
        if (!(['http:', 'https:'].includes(protocol))) {
          return false;
        }
        if (!psl.isValid(hostname)) {
          const ipv4 = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          if (!ipv4.test(hostname)) {
            return false;
          }
        }
        return inputUrl === `${protocol}//${hostname}`;
        // eslint-disable-next-line no-empty
      } catch {}
      return false;
    };

    for (const valueName of valueNames) {
      const value = get(this.params, valueName);
      if (value !== undefined && !isValidUrl(value)) {
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
