import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon, {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import {AuthenticationError, InvalidParametersError} from '../../src/errors/errors';
import accessTokenMiddleware from '../../src/middlewares/access_token_middleware';
import TokenAuthenticator from '../../src/utils/token_authenticator';
import IdentityManager from '../../src/services/identity_manager';
import {createWeb3} from '../../src/utils/web3_tools';
import pkPair from '../fixtures/pk_pair';

chai.use(sinonChai);
const {expect} = chai;

describe('Access token middleware', () => {
  let mockTokenAuthenticator;
  let request;
  let response;
  let next;
  let tokenAuthenticator;
  let token;

  before(async () => {
    tokenAuthenticator = new TokenAuthenticator(new IdentityManager(await createWeb3()));
  });

  beforeEach(() => {
    token = tokenAuthenticator.generateToken(pkPair.secret, 1);
    next = spy();
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
    const decodedToken = {idData: {createdBy: '0x1', validUntil: 1}};
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

  it('throws InvalidParametersError if other type of authorization', async () => {
    request = httpMocks.createRequest({
      headers: {
        authorization: `BAD_TOKEN ${token}`
      }
    });
    const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator);
    expect(() => configuredMiddleware(request, response, next)).to.throw(InvalidParametersError);
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
});
