/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import matchHexOfLength from '../../src/utils/regex';

const {expect} = chai;

describe('Regular expressions', () => {
  describe('Match hex', () => {
    it('should accept hex with correct length', async () => {
      expect(matchHexOfLength('0x123456', 6)).to.be.true;
      expect(matchHexOfLength('0x123456', 5)).to.be.false;
      expect(matchHexOfLength('0x123456', 7)).to.be.false;
    });

    it('should only accept strings with valid hex characters', async () => {
      expect(matchHexOfLength('0xQ', 1)).to.be.false;
      expect(matchHexOfLength('0x0123456789abcdefABCDEF', 22)).to.be.true;
    });

    it('should not accept without prefix', async () => {
      expect(matchHexOfLength('0123456789abcdefABCDEF', 22)).to.be.false;
      expect(matchHexOfLength('0123456789abcdefABCDEF', 20)).to.be.false;
    });
  });
});
