/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import httpMocks from 'node-mocks-http';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import errorHandling from '../../src/middlewares/error_handling';

import {InvalidParametersError, ValidationError, PermissionError, NotFoundError, AuthenticationError} from '../../src/errors/errors';

chai.use(sinonChai);
const {expect} = chai;

describe('Error handling middleware', () => {
  let request;
  let response;
  let next;

  beforeEach(async () => {
    request = httpMocks.createRequest({});
    response = httpMocks.createResponse();
    next = sinon.spy();
  });


  it('should return 400 if InvalidParametersError', async () => {
    errorHandling(new InvalidParametersError(), request, response, next);
    expect(response._getStatusCode()).to.eq(400);
    expect(next).to.be.calledOnce;
  });

  it('should return 400 if ValidationError', async () => {
    errorHandling(new ValidationError(), request, response, next);
    expect(response._getStatusCode()).to.eq(400);
    expect(next).to.be.calledOnce;
  });

  it('should return 401 if AuthenticationError', async () => {
    errorHandling(new AuthenticationError(), request, response, next);
    expect(response._getStatusCode()).to.eq(401);
    expect(next).to.be.calledOnce;
  });

  it('should return 403 if PermissionError', async () => {
    errorHandling(new PermissionError(), request, response, next);
    expect(response._getStatusCode()).to.eq(403);
    expect(next).to.be.calledOnce;
  });

  it('should return 404 if NotFoundError', async () => {
    errorHandling(new NotFoundError(), request, response, next);
    expect(response._getStatusCode()).to.eq(404);
    expect(next).to.be.calledOnce;
  });

  it('should return 500 if other error', async () => {
    sinon.stub(console, 'error');
    errorHandling(new Error(), request, response, next);    
    expect(console.error).to.be.calledOnce;    
    console.error.restore();
    expect(response._getStatusCode()).to.eq(500);
    expect(next).to.be.calledOnce;
  });
});
