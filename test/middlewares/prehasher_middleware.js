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
import {ValidationError} from '../../src/errors/errors';
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
  const exampleDataWithHash = {
    id: '0x66666',
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

  it('does nothing if given path has value already assigned', () => {
    const configuredMiddleware = prehasherMiddleware(mockIdentityManager, 'content.idData', 'id');
    request = httpMocks.createRequest({
      body: exampleDataWithHash
    });
    configuredMiddleware(request, response, next);

    expect(request.body).to.deep.equal(exampleDataWithHash);
    expect(next).to.be.calledOnce;
  });

  it('throws exception when path not accessible', () => {
    const configuredMiddleware = prehasherMiddleware(mockIdentityManager, 'content.wrongPath', 'id');

    expect(() => configuredMiddleware(request, response, next)).to.throw(ValidationError);
    expect(next).to.be.not.called;
  });
});
