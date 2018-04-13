import chai from 'chai';
import httpMocks from 'node-mocks-http';
import {spy} from 'sinon';
import sinonChai from 'sinon-chai';
import cachePreventionMiddleware from '../../src/middlewares/cache_prevention_middleware';

chai.use(sinonChai);
const {expect} = chai;

describe('Cache prevention middleware', () => {
  let request;
  let response;
  let next;

  beforeEach(async () => {
    next = spy();
    request = httpMocks.createRequest();
    response = httpMocks.createResponse();
  });

  it('adds `no-store` to `cache-control` header', () => {
    cachePreventionMiddleware(request, response, next);

    /* eslint no-underscore-dangle: ["error", { "allow": ["_headers"] }] */
    expect(response._headers['cache-control']).to.equal('no-store');
    expect(next).to.be.calledOnce;
  });
});
