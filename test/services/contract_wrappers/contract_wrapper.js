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
import ContractWrapper from '../../../src/services/contract_wrappers/contract_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Contract Wrapper', () => {
  const contract = 'contractStub';
  let contractWrapper;
  let doGetContractStub;

  before(() => {
    contractWrapper = new ContractWrapper({});
    doGetContractStub = sinon.stub(contractWrapper, 'doGetContract').resolves(contract);
  });

  it('contract getter asks contract manager for the contract only once', async () => {
    expect(await contractWrapper.contract()).to.equal(contract);
    expect(await contractWrapper.contract()).to.equal(contract);
    expect(doGetContractStub).to.be.calledOnce;
  });
});
