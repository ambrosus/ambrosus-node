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
import ShelteringWrapper from '../../../src/services/contract_wrappers/sheltering_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Sheltering Wrapper', () => {
  let contractManagerMock;
  let shelteringWrapper;

  describe('isSheltering', () => {
    let isShelteringStub;
    let isShelteringCallStub;
    const bundleId = 'bundle';
    const defaultAddress = '0x123';

    beforeEach(async () => {
      isShelteringStub = sinon.stub();
      isShelteringCallStub = sinon.stub();
      contractManagerMock = {
        shelteringContract: async () => ({
          methods: {
            isSheltering: isShelteringStub.returns({
              call: isShelteringCallStub.resolves(true)
            })
          }
        }),
        defaultAddress: () => defaultAddress
      };
      shelteringWrapper = new ShelteringWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringWrapper.isSheltering(bundleId)).to.equal(true);
      expect(isShelteringStub).to.be.calledOnceWith(bundleId, defaultAddress);
      expect(isShelteringCallStub).to.be.calledOnce;
    });
  });

  describe('shelteringExpirationDate', () => {
    let shelteringExpirationDateStub;
    let shelteringExpirationDateCallStub;
    const bundleId = 'bundle';
    const expirationDate = 123;
    const defaultAddress = '0x123';

    beforeEach(async () => {
      shelteringExpirationDateStub = sinon.stub();
      shelteringExpirationDateCallStub = sinon.stub();
      contractManagerMock = {
        shelteringContract: async () => ({
          methods: {
            getShelteringExpirationDate: shelteringExpirationDateStub.returns({
              call: shelteringExpirationDateCallStub.resolves(expirationDate)
            })
          }
        }),
        defaultAddress: () => defaultAddress
      };
      shelteringWrapper = new ShelteringWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringWrapper.shelteringExpirationDate(bundleId)).to.equal(expirationDate);
      expect(shelteringExpirationDateStub).to.be.calledOnceWith(bundleId, defaultAddress);
      expect(shelteringExpirationDateCallStub).to.be.calledOnce;
    });
  });
});
