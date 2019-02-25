/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import httpMocks from 'node-mocks-http';
import {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import ensureJsonMime from '../../src/middlewares/mime_middleware';
import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
const {expect} = chai;

describe('MIME middleware', () => {
  let response;
  let next;

  beforeEach(async () => {
    next = spy();
    response = httpMocks.createResponse();
  });

  it('calls next when MIME type is application/json', () => {
    ensureJsonMime(httpMocks.createRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'transfer-encoding': 'chunked',
        'content-length': 100
      }
    }), response, next);

    expect(next).to.be.calledOnce;
  });

  it('throws when MIME type is not application/json', () => {
    expect(() => ensureJsonMime(httpMocks.createRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'text/html',
        'transfer-encoding': 'chunked',
        'content-length': 100
      }
    }), response, next)).to.throw(ValidationError);

    expect(next).to.be.not.called;
  });
});
