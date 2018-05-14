/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import EntityDownloader from '../../src/services/entity_downloader';
import {createBundle} from '../fixtures/assets_events';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Entity downloader', () => {
  let entityDownloader;
  let mockHttpsClient;

  before(async () => {
    mockHttpsClient = {
      performHTTPSGet : sinon.stub(),
      validateIncomingStatusCode : sinon.stub()
    };
    entityDownloader = new EntityDownloader(mockHttpsClient);
  });
  
  describe('download bundle', () => {
    const exampleVendorId = '0x123';
    const exampleBundleId = '0x321';
    const examplePath = `/bundle/${exampleBundleId}`;
    const processedBundle = createBundle();

    it('returns downloaded bundle', async () => {
      const OKStatusCode = 200;
      mockHttpsClient.performHTTPSGet.resolves({statusCode : OKStatusCode, body : processedBundle});
      mockHttpsClient.validateIncomingStatusCode.resolves();
      const res = await expect(entityDownloader.downloadBundle(exampleVendorId, exampleBundleId)).to.be.fulfilled;
      expect(mockHttpsClient.performHTTPSGet).to.have.been.calledWith(exampleVendorId, examplePath);
      expect(mockHttpsClient.validateIncomingStatusCode).to.have.been.calledWith(OKStatusCode);
      expect(res).to.deep.equal(processedBundle);
    });

    it(`throws if download wasn't successful`, async () => {
      const failureStatusCode = 500;
      mockHttpsClient.performHTTPSGet.resolves({statusCode : failureStatusCode});
      mockHttpsClient.validateIncomingStatusCode.throws(new Error());
      await expect(entityDownloader.downloadBundle(exampleVendorId, exampleBundleId)).to.be.rejectedWith(Error);
      expect(mockHttpsClient.performHTTPSGet).to.have.been.calledWith(exampleVendorId, examplePath);
      expect(mockHttpsClient.validateIncomingStatusCode).to.have.been.calledWith(failureStatusCode);
    });
  });
});
