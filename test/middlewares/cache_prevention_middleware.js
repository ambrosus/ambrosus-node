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
import cachePreventionMiddleware from '../../src/middlewares/cache_prevention_middleware';

chai.use(sinonChai);
const {expect} = chai;

describe('Cache prevention middleware', () => {
  let request;
  let response;
  let next;

  beforeEach(async () => {
    next = spy();
    request = httpMocks.createRequest();
    response = httpMocks.createResponse();
  });

  it('adds `no-store` to `cache-control` header', () => {
    cachePreventionMiddleware(request, response, next);

    /* eslint no-underscore-dangle: ["error", { "allow": ["_headers"] }] */
    expect(response._headers['cache-control']).to.equal('no-store');
    expect(next).to.be.calledOnce;
  });
});
