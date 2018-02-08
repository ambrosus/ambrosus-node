import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon, {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import identityMiddleware from '../../src/middlewares/identity_middleware';
import {createWeb3} from '../../src/utils/web3_tools';
import {ValidationError, PermissionError} from '../../src/errors/errors';
import {put} from '../../src/utils/dict_utils';

chai.use(sinonChai);
const {expect} = chai;

describe('Identity middleware', () => {
  const correctSignature = '0x12345678';
  const exampleData = {
    content: {
      idData: {
        foo: 1,
        bar: 2
      }
    }
  };
  let request;
  let response;
  let account;
  let signMiddleware;
  let identityManager;

  beforeEach(async () => {
    const web3 = await createWeb3();
    identityManager = {
      sign: sinon.stub(),
      validateSignature: sinon.stub()
    };
    account = web3.eth.accounts.create();
    identityManager.sign.returns(correctSignature);
    identityManager.validateSignature.returns(true);
  });

  describe('Signing', () => {
    let next;

    beforeEach(() => {
      request = httpMocks.createRequest({
        method: 'POST',
        params: {
          Authorisation: account.privateKey
        },
        body: exampleData
      });
      response = httpMocks.createResponse();
      signMiddleware = identityMiddleware(identityManager, '', 'content.idData', 'content.signature').sign;
      next = spy();
    });

    it('should add signature when secret provided', () => {
      signMiddleware(request, response, next);
      expect(next).to.be.calledOnce;
      expect(request.body.content).to.include.key('signature');
    });

    it('should not sign if no PK in Auth when secret not provided', () => {
      delete request.params.Authorisation;
      signMiddleware(request, response, next);
      expect(identityManager.sign).to.be.not.called;
      expect(next).to.be.calledOnce;
    });

    it('should throw exception when path not accessible', () => {
      signMiddleware = identityMiddleware(identityManager, '', 'content.wrongPath', 'content.signature').sign;
      expect(() => signMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.be.not.called;
    });
  });

  describe('Validating', () => {
    let next;
    let validateSignature;
    let signedData;

    beforeEach(() => {
      signedData = put(exampleData, {'content.idData.owner': account.address, 'content.signature': correctSignature});
      request = httpMocks.createRequest({
        method: 'POST',
        body: signedData
      });
      response = httpMocks.createResponse();
      next = spy();
      ({validateSignature} =
        identityMiddleware(identityManager, 'content.idData.owner', 'content.idData', 'content.signature'));
    });

    it('should call next if signature is correct', () => {
      validateSignature(request, response, next);
      expect(next).to.be.calledOnce;
    });

    it('throws if no address found at ownerPath', async () => {
      delete request.body.content.idData.owner;
      expect(() => validateSignature(request, response, next)).to.throw(ValidationError);
      expect(next).to.be.not.called;
    });

    it('throws if no content found at toSignPath', async () => {
      delete request.body.content.idData;
      expect(() => validateSignature(request, response, next)).to.throw(ValidationError);
      expect(next).to.be.not.called;
    });

    it('throws if no signature found at signaturePath', async () => {
      delete request.body.content.signature;
      expect(() => validateSignature(request, response, next)).to.throw(ValidationError);
      expect(next).to.be.not.called;
    });

    it('throws PermissionError signature is not valid', () => {
      identityManager.validateSignature.returns(false);
      expect(() => validateSignature(request, response, next))
        .to.throw(PermissionError);
      expect(next).to.be.not.called;
    });
  });
});
