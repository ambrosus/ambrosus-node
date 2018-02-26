import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon, {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import {InvalidParametersError} from '../../src/errors/errors';
import presignerMiddleware from '../../src/middlewares/presigner_middleware';
import pkPair from '../fixtures/pk_pair';

chai.use(sinonChai);
const {expect} = chai;

describe('Presigner middleware', () => {
  const exampleSignature = '0x12345678';
  const exampleData = {
    content: {
      idData: {
        foo: 1,
        bar: 2
      }
    }
  };

  let mockIdentityManager;
  let request;
  let response;
  let next;

  beforeEach(async () => {
    next = spy();
    mockIdentityManager = {
      sign: sinon.stub()
    };
    request = httpMocks.createRequest({
      secret: pkPair.secret,
      body: exampleData
    });
    response = httpMocks.createResponse();

    mockIdentityManager.sign.returns(exampleSignature);
  });

  it('adds signature if secret provided', () => {
    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.idData', 'content.signature');
    configuredMiddleware(request, response, next);

    expect(request.body.content).to.include.key('signature');
    expect(request.body.content.signature).to.equal(exampleSignature);
    expect(next).to.be.calledOnce;
    expect(mockIdentityManager.sign).to.have.been.calledWith(pkPair.secret, request.body.content.idData);
  });

  it('deletes secret from request after data was signed', () => {
    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.idData', 'content.signature');
    configuredMiddleware(request, response, next);

    expect(request).to.not.include.key('secret');
  });

  it('doesn\'t do anything if no secret in request', () => {
    delete request.secret;

    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.idData', 'content.signature');
    configuredMiddleware(request, response, next);

    expect(mockIdentityManager.sign).to.be.not.called;
    expect(next).to.be.calledOnce;
  });

  it('throws exception when path not accessible', () => {
    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.wrongPath', 'content.signature');

    expect(() => configuredMiddleware(request, response, next)).to.throw(InvalidParametersError);
    expect(next).to.be.not.called;
  });
});
