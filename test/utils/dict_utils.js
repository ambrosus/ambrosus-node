/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import {get, pick, put} from '../../src/utils/dict_utils';

const {expect} = chai;

describe('Dict utils', () => {
  describe('put', () => {
    const input = {one: '1', two: {three: 'abc'}};

    it('works with valid path and value ', () => {
      expect(put(input, 'two.three', 'xyz')).to.be.eql({one: '1', two: {three: 'xyz'}});
    });

    it('works with valid path dictionary', () => {
      expect(put(input, {'two.three': 'xyz', 'two.four': 2, one: '3'})).to.be.eql({one: '3', two: {three: 'xyz', four: 2}});
    });

    it('throws if a non-object is found on path', () => {
      expect(() => put(input, 'one.five', '3')).to.throw();
    });

    it('throws if path is not a accepted type', () => {
      expect(() => put(input, 2, '3')).to.throw();
    });

    it('throws if path is an empty string', () => {
      expect(() => put(input, '', '3')).to.throw();
    });
  });

  describe('pick', () => {
    const input = {one: '1', two: {three: 'abc'}};

    it('works with valid path', () => {
      expect(pick(input, 'two.three')).to.be.eql({one: '1', two: {}});
    });

    it('works with valid path array', () => {
      expect(pick(input, ['two.three', 'one'])).to.be.eql({two: {}});
    });

    it('throws if a non-object is found on path', () => {
      expect(() => pick(input, 'one.five')).to.throw();
    });

    it('throws if path is not a accepted type', () => {
      expect(() => pick(input, 2)).to.throw();
    });

    it('throws if path is an empty string', () => {
      expect(() => pick(input, '')).to.throw();
    });
  });

  describe('get', () => {
    const input = {one: '1', two: {three: 'abc'}};

    it('should return object when empty path', () => {
      expect(get(input, '')).to.deep.eq(input);
    });

    it('should return key with non-empty path', () => {
      expect(get(input, 'one')).to.eq('1');
      expect(get(input, 'two')).to.deep.eq({three: 'abc'});
      expect(get(input, 'two.three')).to.eq('abc');
    });

    it('should return undefined when nothing found with path', () => {
      expect(get(input, 'five')).to.eq(undefined);
      expect(get(input, 'five.six')).to.eq(undefined);
      expect(get(input, 'one.two.three')).to.eq(undefined);
      expect(get(input, 'two.ten')).to.eq(undefined);
    });
  });
});

