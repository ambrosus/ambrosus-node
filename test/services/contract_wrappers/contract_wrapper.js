/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import ContractWrapper from '../../../src/services/contract_wrappers/contract_wrapper';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('Contract Wrapper', () => {
  let contractWrapper;
  let mockHeadWrapper;
  let mockWeb3;
  let contractNameStub;
  const defaultAddress = '0xdeadface';
  const exampleContractName = 'fees';

  before(() => {
    mockWeb3 = {
      eth: {
        Contract: sinon.stub()
      },
      utils: {
        toWei: sinon.stub()
      }
    };
    mockHeadWrapper = {
      contractAddressByName: sinon.stub()
    };
    contractWrapper = new ContractWrapper(mockHeadWrapper, mockWeb3, defaultAddress);
  });

  describe('getting contract', () => {
    before(async () => {
      contractNameStub = sinon.stub(contractWrapper, 'getContractName').get(() => (exampleContractName));
      await expect(contractWrapper.contract()).to.have.been.eventually.fulfilled;
    });

    after(() => {
      contractNameStub.restore();
    });

    it('asks headWrapper for contract address', async () => {
      expect(mockHeadWrapper.contractAddressByName).to.have.been.calledWith(exampleContractName);
    });

    it('constructs new contract', async () => {
      expect(mockWeb3.eth.Contract).to.have.been.called;
    });
  });

  describe('getting name', () => {
    it('should throw if name getter is not overloaded', async () => {
      expect(() => contractWrapper.getContractName()).to.throw('Abstract method getContractName needs to be overridden');
    });
  });
});

