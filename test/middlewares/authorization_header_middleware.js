import chai from 'chai';
import httpMocks from 'node-mocks-http';
import {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import {InvalidParametersError} from '../../src/errors/errors';
import pkPair from '../fixtures/pk_pair';
import ambAuthorizationHeaderMiddleware from '../../src/middlewares/amb_authorization_header_middleware';

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

  it('adds ambSecret to the request if authorization header with an AMB secret provided', () => {
    ambAuthorizationHeaderMiddleware(request, response, next);

    expect(request).to.include.key('ambSecret');
    expect(request.ambSecret).to.equal(pkPair.secret);
    expect(next).to.be.calledOnce;
  });

  it('does nothing if no authorization header with an AMB secret was provided', () => {
    delete request.headers.authorization;

    ambAuthorizationHeaderMiddleware(request, response, next);

    expect(request).to.not.include.key('ambSecret');
    expect(next).to.be.calledOnce;
  });

  it('throws exception if authorization type is not AMB', () => {
    delete request.headers.authorization;
    request.headers.authorization = pkPair.secret;

    expect(() => ambAuthorizationHeaderMiddleware(request, response, next)).to.throw(InvalidParametersError);
    expect(next).to.be.not.called;
  });
});
