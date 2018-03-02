import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon, {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import {AuthenticationError} from '../../src/errors/errors';
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

  beforeEach(async () => {
    const tokenAuthenticator = new TokenAuthenticator(new IdentityManager(await createWeb3()));
    const token = tokenAuthenticator.generateToken(pkPair.secret, 1);
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
    expect(() => configuredMiddleware(request, response, next)).to.not.throw(AuthenticationError);
    expect(request.tokenData).to.deep.eq(decodedToken.idData);
    expect(mockTokenAuthenticator.decodeToken).to.have.been.called;
  });

  it('throws if authenticator rejects', () => {
    mockTokenAuthenticator.decodeToken.throws(new AuthenticationError());
    const configuredMiddleware = accessTokenMiddleware(mockTokenAuthenticator);
    expect(() => configuredMiddleware(request, response, next)).to.throw(AuthenticationError);    
  });
});
