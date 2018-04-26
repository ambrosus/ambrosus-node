import chai from 'chai';
import Config from '../../src/utils/config';

const {expect} = chai;

describe('Config', () => {
  it('intialisation', () => {
    const config = new Config({attribute: 2});
    expect(config.attributes).to.deep.eq({attribute: 2});
  });

  it('withAttibutes (initially empty)', () => {
    const config = new Config({}).withAttributes({attribute: 1});
    expect(config.attributes).to.deep.eq({attribute: 1});
  });

  it('withAttibutes (override)', () => {
    const config = new Config({attribute: 2}).withAttributes({attribute: 1});
    expect(config.attributes).to.deep.eq({attribute: 1});
  });  
});
