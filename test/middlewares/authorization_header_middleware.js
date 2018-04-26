import chai from 'chai';
import httpMocks from 'node-mocks-http';
import {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import {InvalidParametersError, PermissionError} from '../../src/errors/errors';
import pkPair from '../fixtures/pk_pair';
import ambAuthorizationHeaderMiddleware from '../../src/middlewares/amb_authorization_header_middleware';
import {pick} from '../../src/utils/dict_utils';

chai.use(sinonChai);
const {expect} = chai;

describe('Authorisation header middleware', () => {
  let request;
  let response;
  let next;
  let config;

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
    before(() => {
      config = {isAuthorizationWithSecretKeyEnabled: () => true};
    });

    it('adds ambSecret to the request if authorization header with an AMB secret provided', () => {
      ambAuthorizationHeaderMiddleware(config)(request, response, next);

      expect(request).to.include.key('ambSecret');
      expect(request.ambSecret).to.equal(pkPair.secret);
      expect(next).to.be.calledOnce;
    });

    it('does nothing if no authorization header with an AMB secret was provided', () => {
      const noAuthReq = pick(request, 'headers.authorization');

      ambAuthorizationHeaderMiddleware(config)(noAuthReq, response, next);

      expect(request).to.not.include.key('ambSecret');
      expect(next).to.be.calledOnce;
    });

    it('throws exception if authorization type is not AMB', () => {
      request.headers.authorization = pkPair.secret;

      expect(() => ambAuthorizationHeaderMiddleware(config)(request, response, next)).to.throw(InvalidParametersError);
      expect(next).to.be.not.called;
    });
  });

  describe('Amb authorization is disabled', () => {
    before(() => {
      config = {isAuthorizationWithSecretKeyEnabled: () => false};
    });

    it('does nothing if no authorization header with an AMB secret was provided', () => {
      const noAuthReq = pick(request, 'headers.authorization');

      ambAuthorizationHeaderMiddleware(config)(noAuthReq, response, next);

      expect(request).to.not.include.key('ambSecret');
      expect(next).to.be.calledOnce;
    });

    it('throws if amb authorization is disabled', async () => {
      expect(() => ambAuthorizationHeaderMiddleware(config)(request, response, next)).to.throw(PermissionError);
      expect(next).to.be.not.called;
    });
  });
});
