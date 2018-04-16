import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {InvalidParametersError} from '../../src/errors/errors';
import prehasherMiddleware from '../../src/middlewares/prehasher_middleware';

chai.use(sinonChai);
const {expect} = chai;

describe('Prehasher middleware', () => {
  const exampleHash = '0x66666';
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
    next = sinon.spy();
    mockIdentityManager = {
      calculateHash: sinon.stub()
    };
    request = httpMocks.createRequest({
      body: exampleData
    });
    response = httpMocks.createResponse();

    mockIdentityManager.calculateHash.returns(exampleHash);
  });

  it('adds hash based on provided paths', () => {
    const configuredMiddleware = prehasherMiddleware(mockIdentityManager, 'content.idData', 'id');
    configuredMiddleware(request, response, next);
    
    expect(request.body).to.include.key('id');
    expect(request.body.id).to.equal(exampleHash);
    expect(next).to.be.calledOnce;
    expect(mockIdentityManager.calculateHash).to.have.been.called;
  });

  it('throws exception when path not accessible', () => {
    const configuredMiddleware = prehasherMiddleware(mockIdentityManager, 'content.wrongPath', 'id');

    expect(() => configuredMiddleware(request, response, next)).to.throw(InvalidParametersError);
    expect(next).to.be.not.called;
  });
});
