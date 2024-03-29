/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Mitm from 'mitm';

import HttpsClient from '../../src/utils/https_client';
import {NotFoundError, PermissionError, ValidationError, AuthenticationError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Https client', () => {
  let httpsClient;

  const url = 'google.com';

  beforeEach(() => {
    this.mitm = new Mitm();
    httpsClient = new HttpsClient();
  });
  afterEach(() => {
    this.mitm.disable();
  });

  describe('validate status code', () => {
    it('should resolve when status code 200 provided', async () => {
      httpsClient.validateIncomingStatusCode(200, url);
    });
    it('throws ValidationError when status code 400 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(400)).to.throw(ValidationError);
    });
    it('throws AuthenticationError when status code 401 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(401, url)).to.throw(AuthenticationError)
        .with.property('message', 'Authentication failed: Received code 401 at google.com');
    });

    it('throws PermissionError when status code 403 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(403, url)).to.throw(PermissionError)
        .with.property('message', 'Permission denied: Received code 403 at google.com');
    });

    it('throws NotFoundError when status code 404 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(404, url)).to.throw(NotFoundError)
        .with.property('message', 'Not found: Received code 404 at google.com');
    });

    it('throws Error when unknown status code provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(500, url)).to.throw(Error);
    });
  });

  describe('handles connection reset errors', () => {
    beforeEach(() => {
      this.mitm.on('connect', (socket) => {
        setImmediate(() => {
          socket.destroy();
        });
      });
    });

    it('in fetch', async () => {
      await expect(httpsClient.performHTTPSGet('http://not-an-url.com', '/foo')).to.be.rejectedWith('getaddrinfo ENOTFOUND not-an-url.com');
    });

    it('in open stream', async () => {
      await expect(httpsClient.openHTTPSGetStream('http://not-an-url.com', '/foo')).to.be.rejectedWith('getaddrinfo ENOTFOUND not-an-url.com');
    });
  });

  describe('handles response timeout', () => {
    it('in fetch', async () => {
      await expect(httpsClient.performHTTPSGet('http://not-an-url.com', '/foo', {timeout: 50})).to.be.rejectedWith(/^(Request timed out|getaddrinfo ENOTFOUND not-an-url.com)/);
    });

    it('in open stream', async () => {
      await expect(httpsClient.openHTTPSGetStream('http://not-an-url.com', '/foo', {timeout: 50})).to.be.rejectedWith(/^(Request timed out|getaddrinfo ENOTFOUND not-an-url.com)/);
    });
  });
});
