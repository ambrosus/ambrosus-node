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
