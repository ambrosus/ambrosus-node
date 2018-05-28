/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import {
  validatePathsNotEmpty, validateFieldsConstrainedToSet, validateIntegerParameterAndCast,
  validateNonNegativeInteger, validateIsAddress
} from '../../src/utils/validations';
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
      expect(() => validateIntegerParameterAndCast('NaN', 'sampleErrMsg')).to.throw(ValidationError);
    });
  });

  describe('validateNonNegativeInteger', () => {
    it('throws if not integer provided', async () => {
      expect(() => validateNonNegativeInteger(1)).to.not.throw();
      expect(() => validateNonNegativeInteger(1.5)).to.throw(ValidationError);
      expect(() => validateNonNegativeInteger('1')).to.throw(ValidationError);
      expect(() => validateNonNegativeInteger([1])).to.throw(ValidationError);
    });

    it('throws if negative integer provided', async () => {
      expect(() => validateNonNegativeInteger(0)).to.not.throw();
      expect(() => validateNonNegativeInteger(-1)).to.throw(ValidationError);
    });
  });

  describe('validateIsAddress', () => {
    const correctAddress = '0x074976a8D5F07dA5DADa1Eb248AD369a764bB373';

    it('does not throw with valid addresses', async () => {
      expect(() => validateIsAddress(correctAddress)).to.not.throw();
      expect(() => validateIsAddress(correctAddress.toLowerCase())).to.not.throw();
      expect(() => validateIsAddress(correctAddress.toUpperCase())).to.not.throw();
    });

    it('throws if address has wrong length', async () => {
      expect(() => validateIsAddress(correctAddress.slice(0, -1))).to.throw(ValidationError);
      expect(() => validateIsAddress(`${correctAddress}a`)).to.throw(ValidationError);
    });

    it('throws if address has no prefix', async () => {
      expect(() => validateIsAddress(correctAddress.slice(2))).to.throw(ValidationError);
    });

    it('throws if not hex value', async () => {
      expect(() => validateIsAddress('0x074976a8D5F07dA5DADa1Eb248AD369a764bB37g')).to.throw(ValidationError);
    });
  });
});
