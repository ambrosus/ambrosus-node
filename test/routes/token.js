/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import {createTokenHandler} from '../../src/routes/token';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Auth token', () => {
  const mockSecret = '0x123456';
  const requestData = {
    validUntil: 42
  };
  let mockTokenAuthenticator = null;
  let req = null;
  let res = null;

  beforeEach(() => {
    mockTokenAuthenticator = {
      generateToken: sinon.spy()
    };
    req = httpMocks.createRequest({ambSecret: mockSecret, body: requestData});
    res = httpMocks.createResponse();
  });

  it('passes args to generateToken', async () => {
    createTokenHandler(mockTokenAuthenticator)(req, res);
    expect(mockTokenAuthenticator.generateToken).to.be.calledWith(mockSecret, requestData.validUntil);
  });
});

