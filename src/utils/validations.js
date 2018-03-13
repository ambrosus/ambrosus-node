import {get} from './dict_utils';
import {ValidationError, InvalidParametersError} from '../errors/errors';

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

export {validatePathsNotEmpty, validateFieldsConstrainedToSet, validateIntegerParameterAndCast, validateNonNegativeInteger};
