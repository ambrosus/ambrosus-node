/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import httpMocks from 'node-mocks-http';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {getNodeInfoHandler} from '../../src/routes/nodeinfo';

chai.use(sinonChai);
const {expect} = chai;

describe('Node info', () => {
  let req = null;
  let res = null;
  let mockIdentityManager;
  const mockAddress = '0x33323df655da4e8eBF343E73b7703D2188389f20';

  beforeEach(async () => {
    mockIdentityManager = {
      nodeAddress: sinon.stub()
    };
    mockIdentityManager.nodeAddress.returns(mockAddress);
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  it('gets info on node', async () => {
    await getNodeInfoHandler(mockIdentityManager)(req, res);
    const responseBody = res._getData();
    expect(responseBody.version).to.match(/^\d+\.\d+\.\d+$/);
    expect(responseBody.nodeAddress).to.equal(mockAddress);
  });
});

