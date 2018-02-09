import {get} from './dict_utils';
import {ValidationError} from '../errors/errors';

const validatePathsNotEmpty = (dict, paths) => {
  for (const path of paths) {
    const value = get(dict, path);
    if (value === undefined || value === null || value.length === 0) {
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

export {validatePathsNotEmpty, validateFieldsConstrainedToSet};
