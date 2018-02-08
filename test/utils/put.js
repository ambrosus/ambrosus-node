import {describe, it} from 'mocha';
import chai from 'chai';
import put from '../../src/utils/put';

const {expect} = chai;

describe('put', () => {
  const input = {one: '1', two: {three: 'abc'}};

  it('works with valid path and value ', async () => {
    expect(put(input, 'two.three', 'xyz')).to.be.eql({one: '1', two: {three: 'xyz'}});
  });

  it('works with valid path dictionary', async () => {
    expect(put(input, {'two.three': 'xyz', 'two.four': 2, one: '3'})).to.be.eql({one: '3', two: {three: 'xyz', four: 2}});
  });

  it('throws if a non-object is found on path', async () => {
    expect(() => put(input, 'one.five', '3')).to.throw();
  });

  it('throws if path is not a accepted type', async () => {
    expect(() => put(input, 2, '3')).to.throw();
  });
});
