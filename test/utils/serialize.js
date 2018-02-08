import chai from 'chai';
import serialize from '../../src/utils/serialize';

const {expect} = chai;

describe('Serialization', () => {
  it('should serialize object stable', async () => {
    const serialized = serialize({bar: {test1: 'test1', test2: [1, false], test3: 123}, foo: 'foo'});
    const expectedResult = '{\'bar\':{\'test1\':\'test1\',\'test2\':[1,false],\'test3\':123},\'foo\':\'foo\'}';
    expect(serialized).to.equal(expectedResult);
  });
});
