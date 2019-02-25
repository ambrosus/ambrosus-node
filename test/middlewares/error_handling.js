/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import errorHandling from '../../src/middlewares/error_handling';

import {ValidationError, PermissionError, NotFoundError, AuthenticationError} from '../../src/errors/errors';

chai.use(sinonChai);
const {expect} = chai;

describe('Error handling middleware', () => {
  let errorHandlingMiddleware;
  let request;
  let response;
  let next;
  let mockLogger;

  beforeEach(async () => {
    mockLogger = {
      info: sinon.stub(),
      error: sinon.stub()
    };
    request = httpMocks.createRequest({});
    response = httpMocks.createResponse();
    next = sinon.spy();
    errorHandlingMiddleware = errorHandling(mockLogger);
  });


  it('should return 400 if ValidationError', async () => {
    errorHandlingMiddleware(new ValidationError(), request, response, next);
    expect(response._getStatusCode()).to.eq(400);
    expect(next).to.be.calledOnce;
  });

  it('should return 400 if ValidationError', async () => {
    errorHandlingMiddleware(new ValidationError(), request, response, next);
    expect(response._getStatusCode()).to.eq(400);
    expect(next).to.be.calledOnce;
  });

  it('should return 401 if AuthenticationError', async () => {
    errorHandlingMiddleware(new AuthenticationError(), request, response, next);
    expect(response._getStatusCode()).to.eq(401);
    expect(next).to.be.calledOnce;
  });

  it('should return 403 if PermissionError', async () => {
    errorHandlingMiddleware(new PermissionError(), request, response, next);
    expect(response._getStatusCode()).to.eq(403);
    expect(next).to.be.calledOnce;
  });

  it('should return 404 if NotFoundError', async () => {
    errorHandlingMiddleware(new NotFoundError(), request, response, next);
    expect(response._getStatusCode()).to.eq(404);
    expect(next).to.be.calledOnce;
  });

  it('should return 500 if other error', async () => {
    errorHandlingMiddleware(new Error(), request, response, next);
    expect(mockLogger.error).to.be.calledOnce;
    expect(response._getStatusCode()).to.eq(500);
    expect(next).to.be.calledOnce;
  });
});
