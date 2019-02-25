/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import BundleDownloader from '../../src/services/bundle_downloader';
import {createBundle} from '../fixtures/assets_events';
import StringReadStream from '../../src/utils/string_read_stream';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Bundle downloader', () => {
  let bundleDownloader;
  let mockHttpsClient;

  before(async () => {
    mockHttpsClient = {
      performHTTPSGet : sinon.stub(),
      openHTTPSGetStream: sinon.stub(),
      validateIncomingStatusCode : sinon.stub()
    };
    bundleDownloader = new BundleDownloader(mockHttpsClient);
  });

  describe('download bundle using stream', () => {
    const exampleVendorId = '0x123';
    const exampleBundleId = '0x321';
    const examplePath = `/bundle/${exampleBundleId}`;
    const processedBundle = createBundle();
    const bundleStream = new StringReadStream(JSON.stringify(processedBundle));

    it('returns downloaded bundle', async () => {
      const OKStatusCode = 200;
      mockHttpsClient.openHTTPSGetStream.resolves({statusCode : OKStatusCode, response : bundleStream});
      mockHttpsClient.validateIncomingStatusCode.resolves();
      const res = await expect(bundleDownloader.openBundleDownloadStream(exampleVendorId, exampleBundleId)).to.be.fulfilled;
      expect(mockHttpsClient.openHTTPSGetStream).to.have.been.calledWith(exampleVendorId, examplePath);
      expect(mockHttpsClient.validateIncomingStatusCode).to.have.been.calledWith(OKStatusCode);
      expect(res).to.deep.equal(bundleStream);
    });

    it(`throws if download wasn't successful`, async () => {
      const failureStatusCode = 500;
      mockHttpsClient.openHTTPSGetStream.resolves({statusCode : failureStatusCode});
      mockHttpsClient.validateIncomingStatusCode.throws(new Error());
      await expect(bundleDownloader.openBundleDownloadStream(exampleVendorId, exampleBundleId)).to.be.rejectedWith(Error);
      expect(mockHttpsClient.openHTTPSGetStream).to.have.been.calledWith(exampleVendorId, examplePath);
      expect(mockHttpsClient.validateIncomingStatusCode).to.have.been.calledWith(failureStatusCode);
    });
  });

  describe('download bundle metadata', () => {
    const exampleVendorId = '0x123';
    const exampleBundleId = '0x321';
    const examplePath = `/bundle/${exampleBundleId}/info`;
    const processedBundleMetadata = {
      bundleId: exampleBundleId,
      storagePeriods: 1,
      bundleProofBlock: 100
    };

    it('returns downloaded bundle metadata', async () => {
      const OKStatusCode = 200;
      mockHttpsClient.performHTTPSGet.resolves({statusCode : OKStatusCode, body : processedBundleMetadata});
      mockHttpsClient.validateIncomingStatusCode.resolves();
      const res = await expect(bundleDownloader.downloadBundleMetadata(exampleVendorId, exampleBundleId)).to.be.fulfilled;
      expect(mockHttpsClient.performHTTPSGet).to.have.been.calledWith(exampleVendorId, examplePath);
      expect(mockHttpsClient.validateIncomingStatusCode).to.have.been.calledWith(OKStatusCode);
      expect(res).to.deep.equal(processedBundleMetadata);
    });

    it(`throws if download wasn't successful`, async () => {
      const failureStatusCode = 500;
      mockHttpsClient.performHTTPSGet.resolves({statusCode : failureStatusCode});
      mockHttpsClient.validateIncomingStatusCode.throws(new Error());
      await expect(bundleDownloader.downloadBundleMetadata(exampleVendorId, exampleBundleId)).to.be.rejectedWith(Error);
      expect(mockHttpsClient.performHTTPSGet).to.have.been.calledWith(exampleVendorId, examplePath);
      expect(mockHttpsClient.validateIncomingStatusCode).to.have.been.calledWith(failureStatusCode);
    });
  });
});
