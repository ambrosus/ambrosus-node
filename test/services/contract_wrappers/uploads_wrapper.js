/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import UploadsWrapper from '../../../src/services/contract_wrappers/uploads_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Uploads Wrapper', () => {
  let contractManagerMock;
  let uploadsWrapper;

  describe('registerBundle', () => {
    const bundleId = '0xc0ffee';
    const storagePeriods = 23;
    const defaultAccount = '0x123';
    const fee = '100';
    const registerBundleStub = sinon.stub();
    const registerBundleSendStub = sinon.stub();

    beforeEach(async () => {
      contractManagerMock = {
        uploadsContract: async () => ({
          methods: {
            registerBundle: registerBundleStub
          }
        }),
        web3: {
          eth: {
            defaultAccount
          }
        }
      };
      registerBundleStub.returns({
        send: registerBundleSendStub
      });
      uploadsWrapper = new UploadsWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      await uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
      expect(registerBundleStub).to.be.calledOnceWith(bundleId, storagePeriods);
      expect(registerBundleSendStub).to.be.calledOnceWith({from: defaultAccount, value: fee});
    });
  });
});
