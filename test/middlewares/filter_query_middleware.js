import chai from 'chai';
import httpMocks from 'node-mocks-http';
import {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import filterQueryMiddleware from '../../src/middlewares/filter_query_middleware';

chai.use(sinonChai);
const {expect} = chai;

describe('Filter Query Parameters middleware', () => {
  let request;
  let response;
  let next;

  beforeEach(async () => {
    next = spy();
    request = httpMocks.createRequest({});
    response = httpMocks.createResponse();
  });

  it('removes query parameters that are not in the provided list', () => {
    const validParameter = ['first', 'second', 'last'];
    request.query = {
      first: 'some',
      last: 123,
      other: 'different'
    };

    const configuredMiddleware = filterQueryMiddleware(validParameter);

    configuredMiddleware(request, response, next);

    expect(request.query).to.deep.eq({
      first: 'some',
      last: 123
    });
    expect(next).to.be.calledOnce;
  });
});
