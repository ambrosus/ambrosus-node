/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import validateAndCast from '../../src/utils/validations';
import {ValidationError} from '../../src/errors/errors';

const {expect} = chai;

describe('validation', () => {
  let validator;

  describe('required', () => {
    const input = {one: 0, two: '', three: {four: {five: 12}, six: true}};

    before(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.required([])).to.deep.equal(validator);
    });

    it('throws if at least one path is not in dict', () => {
      expect(() => validator.required(['three.five'])).to.throw(ValidationError);
    });

    it('throws if at least one path is empty in dict', () => {
      expect(() => validator.required(['two'])).to.throw(ValidationError);
    });

    it('supports nested paths', () => {
      expect(() => validator.required(['one', 'three.six'])).to.not.throw();
    });
  });

  describe('fieldsConstrainedToSet', () => {
    const input = {one: 0, two: '', three: false};

    beforeEach(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.fieldsConstrainedToSet(['one', 'two', 'three'])).to.deep.equal(validator);
    });

    it('works for a complete list of fields', () => {
      expect(() => validator.fieldsConstrainedToSet(['one', 'two', 'three'])).to.not.throw();
    });

    it('works for a bigger set of accepted fields', () => {
      expect(() => validator.fieldsConstrainedToSet(['one', 'two', 'three', 'four'])).to.not.throw();
    });

    it('throws if additional fields are in dict', () => {
      expect(() => validator.fieldsConstrainedToSet(['one', 'two'])).to.throw(ValidationError);
    });

    describe('Nested fields', () => {
      beforeEach(() => {
        validator = validateAndCast({...input, four: {five: {six: '6', nine: '9'}, seven: '7'}});
      });

      it('works for a complete list of fields', async () => {
        expect(() => validator.fieldsConstrainedToSet(['five', 'seven'], 'four')).to.not.throw();
      });

      it('throws if additional fields are in dict', () => {
        expect(() => validator.fieldsConstrainedToSet(['five'], 'four')).to.throw(ValidationError);
      });

      it('works with even deeper fields', () => {
        expect(() => validator.fieldsConstrainedToSet(['six', 'nine'], 'four.five')).to.not.throw();
        expect(() => validator.fieldsConstrainedToSet(['six'], 'four.five')).to.throw(ValidationError);
      });
    });
  });

  describe('castNumber', () => {
    const input = {int: 6969, strInt: '6969', strFloat: '3.14', nan: 'NaN'};

    beforeEach(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.castNumber([])).to.deep.equal(validator);
    });

    it('works for an integer parameter', () => {
      expect(() => validator.castNumber(['int'])).to.not.throw();
      expect(validator.getCastedParams().int).to.equal(6969);
    });

    it('works for parsable string parameter', () => {
      expect(() => validator.castNumber(['strInt', 'strFloat'])).to.not.throw();
      expect(validator.getCastedParams().strInt).to.equal(6969);
      expect(validator.getCastedParams().strFloat).to.equal(3.14);
    });

    it('does nothing if parameter is undefined', async () => {
      expect(() => validator.castNumber(['undefinedPath'])).to.not.throw();
      expect(validator.getCastedParams()).to.deep.equal(input);
    });

    it('throws if parameter not parsable', () => {
      expect(() => validator.castNumber(['nan'])).to.throw(ValidationError);
      expect(() => validateAndCast({badParam: 'r1'}).castNumber(['badParam'])).to.throw(ValidationError);
      expect(() => validateAndCast({badParam: '1r'}).castNumber(['badParam'])).to.throw(ValidationError);
      expect(() => validateAndCast({badParam: '3e'}).castNumber(['badParam'])).to.throw(ValidationError);
    });

    it('does not modify original object', async () => {
      const params = {int: '123'};
      const validated = validateAndCast(params)
        .castNumber(['int'])
        .getCastedParams();
      expect(params).to.deep.equal({int: '123'});
      expect(validated).to.deep.equal({int: 123});
    });

    describe('Nested fields', () => {
      beforeEach(() => {
        validator = validateAndCast({wrap: input});
      });

      it('works for an integer parameter', () => {
        expect(() => validator.castNumber(['wrap.int'])).to.not.throw();
        expect(validator.getCastedParams().wrap.int).to.equal(6969);
      });

      it('works for parsable string parameter', () => {
        expect(() => validator.castNumber(['wrap.strInt', 'wrap.strFloat'])).to.not.throw();
        expect(validator.getCastedParams().wrap.strInt).to.equal(6969);
        expect(validator.getCastedParams().wrap.strFloat).to.equal(3.14);
      });

      it('does nothing if parameter is undefined', async () => {
        expect(() => validator.castNumber(['wrap.undefinedPath'])).to.not.throw();
        expect(validator.getCastedParams()).to.deep.equal({wrap: input});
      });

      it('throws if parameter not parsable', () => {
        expect(() => validator.castNumber(['wrap.nan'])).to.throw(ValidationError);
      });
    });
  });

  describe('isNonNegativeInteger', () => {
    const input = {int: 6969, strInt: '6969', float: '3.14', nan: NaN, neg: -10, zero: 0, arr: [1], obj: {}};

    beforeEach(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.isNonNegativeInteger([])).to.deep.equal(validator);
    });

    it('throws if not a positive integer provided', async () => {
      expect(() => validator.isNonNegativeInteger(['int', 'zero'])).to.not.throw();
      expect(() => validator.isNonNegativeInteger(['strInt'])).to.throw(ValidationError);
      expect(() => validator.isNonNegativeInteger(['float'])).to.throw(ValidationError);
      expect(() => validator.isNonNegativeInteger(['nan'])).to.throw(ValidationError);
      expect(() => validator.isNonNegativeInteger(['neg'])).to.throw(ValidationError);
      expect(() => validator.isNonNegativeInteger(['nan'])).to.throw(ValidationError);
      expect(() => validator.isNonNegativeInteger(['arr'])).to.throw(ValidationError);
      expect(() => validator.isNonNegativeInteger(['obj'])).to.throw(ValidationError);
    });

    it('does nothing if parameter is undefined', async () => {
      expect(() => validator.isNonNegativeInteger(['rubbish'])).to.not.throw();
    });

    describe('Nested fields', () => {
      beforeEach(() => {
        validator = validateAndCast({wrap: input});
      });

      it('throws if not a positive integer provided', async () => {
        expect(() => validator.isNonNegativeInteger(['wrap.int', 'wrap.zero'])).to.not.throw();
        expect(() => validator.isNonNegativeInteger(['wrap.strInt'])).to.throw(ValidationError);
        expect(() => validator.isNonNegativeInteger(['wrap.float'])).to.throw(ValidationError);
        expect(() => validator.isNonNegativeInteger(['wrap.nan'])).to.throw(ValidationError);
        expect(() => validator.isNonNegativeInteger(['wrap.neg'])).to.throw(ValidationError);
        expect(() => validator.isNonNegativeInteger(['wrap.nan'])).to.throw(ValidationError);
        expect(() => validator.isNonNegativeInteger(['wrap.arr'])).to.throw(ValidationError);
        expect(() => validator.isNonNegativeInteger(['wrap.obj'])).to.throw(ValidationError);
      });

      it('does nothing if parameter is undefined', async () => {
        expect(() => validator.isNonNegativeInteger(['wrap.rubbish'])).to.not.throw();
      });
    });
  });

  describe('isAddress', () => {
    const input = {
      correctAddress: '0x074976a8D5F07dA5DADa1Eb248AD369a764bB373',
      lower: '0x074976a8d5f07da5dada1eb248ad369a764bb373',
      upper: '0X074976A8D5F07DA5DADA1EB248AD369A764BB373',
      tooShort: '0x074976a8D5F07dA5DADa1Eb248AD369a764bB37',
      tooLong: '0x074976a8D5F07dA5DADa1Eb248AD369a764bB3731',
      noPrefix: '074976a8D5F07dA5DADa1Eb248AD369a764bB373',
      notHex: '0x074976a8D5F07dA5DADa1Eb248AD369a764bBxyz'
    };

    beforeEach(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.isAddress([])).to.deep.equal(validator);
    });

    it('does not throw with valid addresses', async () => {
      expect(() => validator.isAddress(['correctAddress'])).to.not.throw();
    });

    it('is case insensitive', async () => {
      expect(() => validator.isAddress(['upper', 'lower'])).to.not.throw();
    });

    it('throws if address has wrong length', async () => {
      expect(() => validator.isAddress(['tooShort'])).to.throw(ValidationError);
      expect(() => validator.isAddress(['tooLong'])).to.throw(ValidationError);
    });

    it('throws if address has no prefix', async () => {
      expect(() => validator.isAddress(['noPrefix'])).to.throw(ValidationError);
    });

    it('throws if not hex value', async () => {
      expect(() => validator.isAddress(['notHex'])).to.throw(ValidationError);
    });

    it('does not throw if undefined', async () => {
      expect(() => validator.isAddress(['undefined'])).to.not.throw();
    });

    describe('Nested fields', () => {
      beforeEach(() => {
        validator = validateAndCast({wrap: input});
      });

      it('does not throw with valid addresses', async () => {
        expect(() => validator.isAddress(['wrap.correctAddress'])).to.not.throw();
      });

      it('is case insensitive', async () => {
        expect(() => validator.isAddress(['wrap.upper', 'wrap.lower'])).to.not.throw();
      });

      it('throws if address has wrong length', async () => {
        expect(() => validator.isAddress(['wrap.tooShort'])).to.throw(ValidationError);
        expect(() => validator.isAddress(['wrap.tooLong'])).to.throw(ValidationError);
      });

      it('throws if address has no prefix', async () => {
        expect(() => validator.isAddress(['wrap.noPrefix'])).to.throw(ValidationError);
      });

      it('throws if not hex value', async () => {
        expect(() => validator.isAddress(['wrap.notHex'])).to.throw(ValidationError);
      });

      it('does not throw if undefined', async () => {
        expect(() => validator.isAddress(['wrap.undefined'])).to.not.throw();
      });
    });
  });

  describe('isCorrectId', () => {
    const input = {
      correctId: '0x978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc53d2',
      lower: '0x978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc53d2',
      upper: '0X978F69298BA7940C11B16C4A778C7AD1A4E8C6ED3C90C35F36CFEC1B20FC53D2',
      tooShort: '0x978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc53d',
      tooLong: '0x978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc53d21',
      noPrefix: '978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc53d2',
      notHex: '0x978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc5xyz'
    };

    beforeEach(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.isCorrectId([])).to.deep.equal(validator);
    });

    it('does not throw with valid addresses', async () => {
      expect(() => validator.isCorrectId(['correctId'])).to.not.throw();
    });

    it('is case insensitive', async () => {
      expect(() => validator.isCorrectId(['upper', 'lower'])).to.not.throw();
    });

    it('throws if address has wrong length', async () => {
      expect(() => validator.isCorrectId(['tooShort'])).to.throw(ValidationError);
      expect(() => validator.isCorrectId(['tooLong'])).to.throw(ValidationError);
    });

    it('throws if address has no prefix', async () => {
      expect(() => validator.isCorrectId(['noPrefix'])).to.throw(ValidationError);
    });

    it('throws if not hex value', async () => {
      expect(() => validator.isCorrectId(['notHex'])).to.throw(ValidationError);
    });

    it('does not throw if undefined', async () => {
      expect(() => validator.isCorrectId(['undefined'])).to.not.throw();
    });

    describe('Nested fields', () => {
      beforeEach(() => {
        validator = validateAndCast({wrap: input});
      });

      it('does not throw with valid addresses', async () => {
        expect(() => validator.isCorrectId(['wrap.correctId'])).to.not.throw();
      });

      it('is case insensitive', async () => {
        expect(() => validator.isCorrectId(['wrap.upper', 'wrap.lower'])).to.not.throw();
      });

      it('throws if address has wrong length', async () => {
        expect(() => validator.isCorrectId(['wrap.tooShort'])).to.throw(ValidationError);
        expect(() => validator.isCorrectId(['wrap.tooLong'])).to.throw(ValidationError);
      });

      it('throws if address has no prefix', async () => {
        expect(() => validator.isCorrectId(['wrap.noPrefix'])).to.throw(ValidationError);
      });

      it('throws if not hex value', async () => {
        expect(() => validator.isCorrectId(['wrap.notHex'])).to.throw(ValidationError);
      });

      it('does not throw if undefined', async () => {
        expect(() => validator.isCorrectId(['wrap.undefined'])).to.not.throw();
      });
    });
  });

  describe('isUrl', () => {
    const input = {
      correctUrl1: 'http://ambrosusnode.com',
      correctUrl2: 'http://ambrosus-node.com',
      correctUrl3: 'http://ambrosus-node.masternode.com',
      correctUrl4: 'http://ambrosus-node.com:8080',
      correctUrl5: 'https://ambrosus-node.com/api',
      correctUrl6: 'https://ambrosus-node.com/resources/ambnet/app.js',
      incorrectUrl1: 'http://ambrosus-node.123',
      incorrectUrl2: 'http://ambrosus-node.',
      incorrectUrl3: 'http://ambrosus-node',
      incorrectUrl4: 'ftp://ambrosus-node.com',
      incorrectUrl5: '//ambrosus-node.com/resources/ambnet/accesspoint/app.js',
      incorrectUrl6: 'ambrosus-node.com',
      incorrectUrl7: 'ambrosus-node'
    };

    beforeEach(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.isUrl([])).to.deep.equal(validator);
    });

    it('works for correct values', async () => {
      for (let ind = 1; ind <= 6; ind++) {
        // eslint-disable-next-line no-loop-func
        expect(() => validator.isUrl([`correctUrl${ind}`])).to.not.throw();
      }
    });

    it('throws for incorrect values', async () => {
      for (let ind = 1; ind <= 7; ind++) {
        // eslint-disable-next-line no-loop-func
        expect(() => validator.isUrl([`incorrectUrl${ind}`])).to.throw(ValidationError);
      }
    });
  });

  describe('isConstrainedToSize', () => {
    describe('ASCII strings', () => {
      const exampleJson = {foo: 10}; // stringified length = 10

      it('works when serialized object size is less or equals to size limit', async () => {
        expect(() => validateAndCast(exampleJson).isConstrainedToSize(10)).to.not.throw();
      });

      it('throws when serialized object size is greater than size limit', async () => {
        expect(() => validateAndCast(exampleJson).isConstrainedToSize(9)).to.throw(ValidationError);
      });
    });

    describe('UTF-8 strings', () => {
      const utf8Json = {
        тест: '👍💯',
        的的: true
      }; // stringified length = 23, cyrillic characters size=2, japanese=3, emoji=4. Total size = 37

      it('works when serialized object size is less or equals to size limit', async () => {
        expect(() => validateAndCast(utf8Json).isConstrainedToSize(37)).to.not.throw();
      });

      it('throws when serialized object size is greater than size limit', async () => {
        expect(() => validateAndCast(utf8Json).isConstrainedToSize(36)).to.throw(ValidationError);
      });
    });
  });

  describe('validate', () => {
    const input = {one: 0, two: '2', three: false};
    const predicate = (value) => value !== '2';

    beforeEach(() => {
      validator = validateAndCast(input);
    });

    it('returns self', async () => {
      expect(validator.validate(['abc'], () => true)).to.deep.equal(validator);
    });

    it('does not throw if predicate is true for all fields', async () => {
      expect(() => validator.validate(['one', 'three'], predicate)).to.not.throw();
    });

    it('throws if predicate is false for any field', async () => {
      expect(() => validator.validate(['one', 'two', 'three'], predicate)).to.throw(ValidationError);
    });

    describe('Nested fields', () => {
      beforeEach(() => {
        validator = validateAndCast({wrap: input});
      });

      it('returns self', async () => {
        expect(validator.validate(['abc'], () => true)).to.deep.equal(validator);
      });

      it('does not throw if predicate is true for all fields', async () => {
        expect(() => validator.validate(['wrap.one', 'wrap.three'], predicate)).to.not.throw();
      });

      it('throws if predicate is false for any field', async () => {
        expect(() => validator.validate(['wrap.one', 'wrap.two', 'wrap.three'], predicate)).to.throw(ValidationError);
      });
    });
  });
});
