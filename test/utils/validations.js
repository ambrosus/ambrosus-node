import chai from 'chai';
import {
  validatePathsNotEmpty, validateFieldsConstrainedToSet, validateIntegerParameterAndCast,
  validateNonNegativeInteger
} from '../../src/utils/validations';
import {ValidationError, InvalidParametersError} from '../../src/errors/errors';

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

  describe('validateIntegerParameterAndCast', () => {
    let output;

    it('works for an integer parameter', () => {
      expect(() => output = validateIntegerParameterAndCast(6969, 'sampleErrMsg')).to.not.throw();
      expect(output).to.equal(6969);
    });
  
    it('works for parsable string parameter', () => {
      expect(() => output = validateIntegerParameterAndCast('6969', 'sampleErrMsg')).to.not.throw();
      expect(output).to.equal(6969);
    });
  
    it('throws if parameter not parsable', () => {
      expect(() => validateIntegerParameterAndCast('NaN', 'sampleErrMsg')).to.throw(InvalidParametersError);
    });
  });

  describe('validateNonNegativeInteger', () => {
    it('throws if not integer provided', async () => {
      expect(() => validateNonNegativeInteger(1)).to.not.throw;
      expect(() => validateNonNegativeInteger(1.5)).to.throw(ValidationError);
      expect(() => validateNonNegativeInteger('1')).to.throw(ValidationError);
      expect(() => validateNonNegativeInteger([1])).to.throw(ValidationError);
    });

    it('throws if negative integer provided', async () => {
      expect(() => validateNonNegativeInteger(0)).to.not.throw;
      expect(() => validateNonNegativeInteger(-1)).to.throw(ValidationError);
    });
  });
});
