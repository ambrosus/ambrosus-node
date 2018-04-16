import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import httpMocks from 'node-mocks-http';
import {InvalidParametersError} from '../../src/errors/errors';

import queryParameterProcessorMiddleware from '../../src/middlewares/query_parameter_processor_middleware';

chai.use(sinonChai);
const {expect} = chai;

describe('Query Parameter Processor Middleware', () => {
  let response;
  let next;

  const createRequest = (query) => httpMocks.createRequest({
    query
  });

  beforeEach(async () => {
    response = httpMocks.createResponse();
    next = sinon.spy();
  });

  describe('number decorator', () => {
    it('casts decorated value to number', async () => {
      // from ?entry[subparam1]=exampleString&entry[subparam2]=number(2)&param1=number(5)&param2=example2String
      const request = createRequest({
        entry: {
          subparam1: 'exampleString', 
          subparam2: 'number(2)'
        },
        param1: 'number(5)',
        param2: 'example2String'
      });

      queryParameterProcessorMiddleware(request, response, next);

      expect(request.query.entry.subparam2).to.be.a('number').and.equal(2);
      expect(request.query.param1).to.be.a('number').and.equal(5);
      expect(request.query.entry.subparam1).to.be.a('string').and.equal('exampleString');
      expect(request.query.param2).to.be.a('string').and.equal('example2String');
      expect(next).to.have.been.calledOnce;
    });

    it('throws if decorated value is not presenting a number', async () => {
      const request = createRequest({
        something: 'number(someText)',
        somethingElse: '1234'
      });

      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(InvalidParametersError);
      expect(next).to.not.have.been.called;
    });
  });
});
