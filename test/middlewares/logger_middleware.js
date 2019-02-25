/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import sinon from 'sinon';
import loggerMiddleware from '../../src/middlewares/logger_middleware';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import httpMocks from 'node-mocks-http';

const {expect} = chai;
chai.use(sinonChai);

describe('Logger middleware', () => {
  let mockLogger;
  let logger;
  let response;
  const flushAllPromises = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(async () => {
    mockLogger = {
      info: sinon.stub()
    };
    logger = loggerMiddleware(mockLogger);
    response = httpMocks.createResponse();
    response.end();
    // eslint-disable-next-line no-underscore-dangle
    response.getHeaders = response._getHeaders;
  });

  it('logs a request', async () => {
    const request = httpMocks.createRequest({
      url: '/some'
    });

    logger(request, response, () => {
    });

    await flushAllPromises();
    expect(mockLogger.info.args[0][0]).to.include('"url":"/some"');
  });

  [
    '/health',
    '/metrics'
  ].forEach((urlToSkip) => {
    it(`skips ${urlToSkip}`, async () => {
      const request = httpMocks.createRequest({
        url: urlToSkip
      });

      logger(request, response, () => {
      });

      await flushAllPromises();
      expect(mockLogger.info).to.not.have.been.called;
    });
  });
});
