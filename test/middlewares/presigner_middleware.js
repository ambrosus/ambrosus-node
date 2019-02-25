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
  const exampleDataWithSignature = {
    content: {
      signature: '0x12345678',
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
      sign: sinon.stub()
    };
    request = httpMocks.createRequest({
      ambSecret: pkPair.secret,
      body: exampleData
    });
    response = httpMocks.createResponse();

    mockIdentityManager.sign.returns(exampleSignature);
  });

  it('adds signature if AMB secret was provided', () => {
    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.idData', 'content.signature');
    configuredMiddleware(request, response, next);

    expect(request.body.content).to.include.key('signature');
    expect(request.body.content.signature).to.equal(exampleSignature);
    expect(next).to.be.calledOnce;
    expect(mockIdentityManager.sign).to.have.been.calledWith(pkPair.secret, request.body.content.idData);
  });

  it('doesn\'t do anything if given path has value already assigned', () => {
    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.idData', 'content.signature');
    request = httpMocks.createRequest({
      ambSecret: pkPair.secret,
      body: exampleDataWithSignature
    });
    configuredMiddleware(request, response, next);

    expect(mockIdentityManager.sign).to.be.not.called;
    expect(next).to.be.calledOnce;
  });

  it('doesn\'t do anything if no AMB secret in request', () => {
    delete request.ambSecret;

    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.idData', 'content.signature');
    configuredMiddleware(request, response, next);

    expect(mockIdentityManager.sign).to.be.not.called;
    expect(next).to.be.calledOnce;
  });

  it('throws exception when path not accessible', () => {
    const configuredMiddleware = presignerMiddleware(mockIdentityManager, 'content.wrongPath', 'content.signature');

    expect(() => configuredMiddleware(request, response, next)).to.throw(ValidationError);
    expect(next).to.be.not.called;
  });
});
