/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {AuthenticationError, ValidationError} from '../../src/errors/errors';
import accessTokenMiddleware from '../../src/middlewares/access_token_middleware';
import TokenAuthenticator from '../../src/utils/token_authenticator';
import IdentityManager from '../../src/services/identity_manager';
import {createWeb3} from '../../src/utils/web3_tools';
import pkPair from '../fixtures/pk_pair';

chai.use(sinonChai);
const {expect} = chai;

describe('Access token middleware', () => {
  const now = 5;
  let mockTokenAuthenticator;
  let request;
  let response;
  let next;
  let tokenAuthenticator;
  let token;
  let clock;

  before(async () => {
    tokenAuthenticator = new TokenAuthenticator(new IdentityManager(await createWeb3()));
    clock = sinon.useFakeTimers(now);
  });

  beforeEach(() => {
    token = tokenAuthenticator.generateToken(pkPair.secret, now + 1);
    next = sinon.spy();
    mockTokenAuthenticator = {
      decodeToken: sinon.stub()
    };
    request = httpMocks.createRequest({
      headers: {
        authorization: `AMB_TOKEN ${token}`
      }
    });
    response = httpMocks.createResponse();
  });

  it('pass if token authenticator confirms', () => {
    const decodedToken = {idData: {createdBy: '0x1', validUntil: now + 1}};
    const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator);
    mockTokenAuthenticator.decodeToken.returns(decodedToken);
    expect(() => configuredMiddleware(request, response, next)).to.not.throw();
    expect(request.tokenData).to.deep.eq(decodedToken.idData);
    expect(mockTokenAuthenticator.decodeToken).to.have.been.called;
  });

  it('throws if authenticator rejects', () => {
    mockTokenAuthenticator.decodeToken.throws(new AuthenticationError());
    const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator);
    expect(() => configuredMiddleware(request, response, next)).to.throw(AuthenticationError);
  });

  it('throws AuthenticationError if no token provided', async () => {
    request = httpMocks.createRequest({});
    const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator);
    expect(() => configuredMiddleware(request, response, next)).to.throw(AuthenticationError);
    expect(request).to.not.include.key('tokenData');
  });

  it('throws ValidationError if other type of authorization', async () => {
    request = httpMocks.createRequest({
      headers: {
        authorization: `BAD_TOKEN ${token}`
      }
    });
    const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator);
    expect(() => configuredMiddleware(request, response, next)).to.throw(ValidationError);
    expect(request).to.not.include.key('tokenData');
  });

  describe('token not required', () => {
    it('throws if authenticator rejects', () => {
      mockTokenAuthenticator.decodeToken.throws(new AuthenticationError());
      const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator, false);
      expect(() => configuredMiddleware(request, response, next)).to.throw(AuthenticationError);
    });

    it('does not modify request if no token provided', async () => {
      request = httpMocks.createRequest({});
      const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator, false);
      expect(() => configuredMiddleware(request, response, next)).to.not.throw();
      expect(request).to.not.include.key('tokenData');
    });

    it('does not modify request if other type of authorization', async () => {
      request = httpMocks.createRequest({
        headers: {
          authorization: `BAD_TOKEN ${token}`
        }
      });
      const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator, false);
      expect(() => configuredMiddleware(request, response, next)).to.not.throw();
      expect(request).to.not.include.key('tokenData');
    });
  });

  after(() => {
    clock.restore();
  });
});
