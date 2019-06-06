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
import {ValidationError, PermissionError} from '../../src/errors/errors';
import pkPair from '../fixtures/pk_pair';
import ambAuthorizationHeaderMiddleware from '../../src/middlewares/amb_authorization_header_middleware';
import {pick} from '../../src/utils/dict_utils';
import config from '../../src/config/config';

chai.use(sinonChai);
const {expect} = chai;

describe('Authorisation header middleware', () => {
  let request;
  let response;
  let next;

  beforeEach(async () => {
    next = spy();
    request = httpMocks.createRequest({
      headers: {
        authorization: `AMB ${pkPair.secret}`
      }
    });
    response = httpMocks.createResponse();
  });

  describe('Amb authorization is enabled', () => {
    const conf = {...config, authorizationWithSecretKeyEnabled: true};

    it('adds ambSecret to the request if authorization header with an AMB secret provided', () => {
      ambAuthorizationHeaderMiddleware(conf)(request, response, next);

      expect(request).to.include.key('ambSecret');
      expect(request.ambSecret).to.equal(pkPair.secret);
      expect(next).to.be.calledOnce;
    });

    it('does nothing if no authorization header with an AMB secret was provided', () => {
      const noAuthReq = pick(request, 'headers.authorization');

      ambAuthorizationHeaderMiddleware(conf)(noAuthReq, response, next);

      expect(request).to.not.include.key('ambSecret');
      expect(next).to.be.calledOnce;
    });

    it('throws exception if authorization type is not AMB', () => {
      request.headers.authorization = pkPair.secret;

      expect(() => ambAuthorizationHeaderMiddleware(conf)(request, response, next)).to.throw(ValidationError);
      expect(next).to.be.not.called;
    });
  });

  describe('Amb authorization is disabled', () => {
    const conf = {...config, authorizationWithSecretKeyEnabled: false};

    it('does nothing if no authorization header with an AMB secret was provided', () => {
      const noAuthReq = pick(request, 'headers.authorization');

      ambAuthorizationHeaderMiddleware(conf)(noAuthReq, response, next);

      expect(request).to.not.include.key('ambSecret');
      expect(next).to.be.calledOnce;
    });

    it('throws if amb authorization is disabled', async () => {
      expect(() => ambAuthorizationHeaderMiddleware(conf)(request, response, next)).to.throw(PermissionError);
      expect(next).to.be.not.called;
    });
  });
});
