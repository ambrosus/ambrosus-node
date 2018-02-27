import chai from 'chai';
import {validatePathsNotEmpty, validateFieldsConstrainedToSet} from '../../src/utils/validations';
import {ValidationError} from '../../src/errors/errors';

const {expect} = chai;

describe('validation', () => {
  describe('validatePathsNotEmpty', () => {
    const input = {one: 0, two: '', three: {four: {five: 12}, six: true}};

    it('throws if at least one path is not in dict', () => {
      expect(() => validatePathsNotEmpty(input, ['three.five'])).to.throw(ValidationError);
    });

    it('throws if at least one path is empty in dict', () => {
      expect(() => validatePathsNotEmpty(input, ['two'])).to.throw(ValidationError);
    });

    it('works for most cases', () => {
      expect(() => validatePathsNotEmpty(input, ['one', 'three.six'])).to.not.throw();
    });
  });
  describe('validateFieldsConstrainedToSet', () => {
    const input = {one: 0, two: '', three: false};

    it('works for a complete list of fields', () => {
      expect(() => validateFieldsConstrainedToSet(input, ['one', 'two', 'three'])).to.not.throw();
    });

    it('works for a bigger set of accepted fields', () => {
      expect(() => validateFieldsConstrainedToSet(input, ['one', 'two', 'three', 'four'])).to.not.throw();
    });

    it('throws if additional fields are in dict', () => {
      expect(() => validateFieldsConstrainedToSet(input, ['one', 'two'])).to.throw(ValidationError);
    });
  });
});

