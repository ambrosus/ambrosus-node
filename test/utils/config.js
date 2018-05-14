/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

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
