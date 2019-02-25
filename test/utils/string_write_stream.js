/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint-disable no-underscore-dangle */

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import StringWriteStream from '../../src/utils/string_write_stream';

chai.use(sinonChai);

describe('StringWriteStream', () => {
  describe('_write internal method', () => {
    let stream;
    let callbackStub;

    beforeEach(() => {
      stream = new StringWriteStream();
      callbackStub = sinon.stub();
    });

    it('appends the chunk to the internal string', () => {
      expect(stream.get()).to.equal('');
      stream._write('abc', null, callbackStub);
      expect(stream.get()).to.equal('abc');
      stream._write(new Buffer('12345'), null, callbackStub);
      expect(stream.get()).to.equal('abc12345');
      expect(callbackStub).to.have.been.calledTwice;
    });
  });
});
