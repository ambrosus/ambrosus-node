/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import {pipe} from '../../src/utils/higher_order_functions';

const {expect} = chai;

describe('Higher order functions', () => {
  describe('pipe', () => {
    const times2 = (num) => num * 2;
    const plus1 = (num) => num + 1;

    it('works with one argument', () => {
      expect(pipe(times2, plus1)(10)).to.equal(21);
      expect(pipe(plus1, times2)(10)).to.equal(22);
    });

    it('works with several arguments', async () => {
      const sum = ([num1, num2]) => num1 + num2;
      expect(pipe(sum, times2)([4, 5])).to.equal(18);
    });
  });
});
