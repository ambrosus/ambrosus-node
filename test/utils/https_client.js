/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import HttpsClient from '../../src/utils/https_client';
import {NotFoundError, PermissionError, ValidationError, AuthenticationError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Https client', () => {
  let httpsClient;

  before(async () => {
    httpsClient = new HttpsClient();
  });

  describe('validate status code', () => {
    it('should resolve when status code 200 provided', async () => {
      httpsClient.validateIncomingStatusCode(200);
    });
    it('should throw ValidationError when status code 400 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(400)).to.throw(ValidationError);
    });
    it('should throw AuthenticationError when status code 401 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(401)).to.throw(AuthenticationError);
    });
    it('should throw PermissionError when status code 403 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(403)).to.throw(PermissionError);
    });
    it('should throw NotFoundError when status code 404 provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(404)).to.throw(NotFoundError);
    });
    it('should throw Error when unknown status code provided', async () => {
      expect(() => httpsClient.validateIncomingStatusCode(500)).to.throw(Error);
    });
  });
});
