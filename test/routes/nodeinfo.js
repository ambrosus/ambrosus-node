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

import {getNodeInfoHandler} from '../../src/routes/nodeinfo';

chai.use(sinonChai);
const {expect} = chai;

describe('Node info', () => {
  let req = null;
  let res = null;
  let mockIdentityManager;
  let mockModel;
  const mockAddress = '0x33323df655da4e8eBF343E73b7703D2188389f20';
  const mockLogs = [{foo: 'bar'}, {foo2: 'bar2'}, {foo3: 'bar3'}];

  beforeEach(async () => {
    mockIdentityManager = {
      nodeAddress: sinon.stub().returns(mockAddress)
    };
    mockModel = {
      getWorkerLogs: sinon.stub().resolves(mockLogs)
    };
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  it('asks for worker logs', async () => {
    await getNodeInfoHandler(mockModel, mockIdentityManager)(req, res);
    const responseBody = res._getData();
    expect(responseBody.workerLogs).to.equal(mockLogs);
    expect(mockModel.getWorkerLogs).to.have.been.calledOnce;
  });

  it('gets info on node', async () => {
    await getNodeInfoHandler(mockModel, mockIdentityManager)(req, res);
    const responseBody = res._getData();
    expect(responseBody.version).to.match(/^\d+\.\d+\.\d+$/);
    expect(responseBody.nodeAddress).to.equal(mockAddress);
  });
});

