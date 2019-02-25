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

import StringReadStream from '../../src/utils/string_read_stream';

chai.use(sinonChai);

describe('StringReadStream', () => {
  describe('_read internal method', () => {
    let stream;
    const string = '0123456789abc';
    const chunkSize = 5;
    let pushStub;

    beforeEach(() => {
      stream = new StringReadStream(string, chunkSize);
      pushStub = sinon.stub(stream, 'push');
    });

    afterEach(() => {
      pushStub.restore();
    });

    describe('in the middle of the string', () => {
      it('increases the position by chunkSize', () => {
        expect(stream.position).to.equal(0);
        stream._read();
        expect(stream.position).to.equal(chunkSize);
        stream._read();
        expect(stream.position).to.equal(chunkSize * 2);
      });

      it('pushes a full chunk', () => {
        stream._read();
        expect(pushStub).to.have.been.calledWith('01234', 'utf8');
        stream._read();
        expect(pushStub).to.have.been.calledWith('56789', 'utf8');
      });
    });

    describe('near the end of the string', () => {
      beforeEach(() => {
        stream._read();
        stream._read();
      });

      it('increases the position to equal the string length', () => {
        stream._read();
        expect(stream.position).to.equal(string.length);
      });

      it('pushes the final chunk', () => {
        stream._read();
        expect(pushStub).to.have.been.calledWith('abc', 'utf8');
      });
    });

    describe('at the end of the string', () => {
      beforeEach(() => {
        stream._read();
        stream._read();
        stream._read();
      });

      it('pushes null to signal end of stream', () => {
        stream._read();
        expect(pushStub).to.have.been.calledWith(null, 'utf8');
      });
    });
  });
});
