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
import ContractManager from '../../src/services/contract_manager';
import * as Web3Tools from '../../src/utils/web3_tools';
import resetHistory from '../helpers/reset_history';

chai.use(sinonChai);
const {expect} = chai;

describe('Contract Manager', () => {
  let mockWeb3;
  let loadContractStub;
  let deployContractStub;
  const exampleContract = 'a contract';

  before(async () => {
    loadContractStub = sinon.stub(Web3Tools, 'loadContract').returns(exampleContract);
    deployContractStub = sinon.stub(Web3Tools, 'deployContract').returns(exampleContract);
    mockWeb3 = {};
  });

  beforeEach(() => {
    resetHistory({loadContractStub, deployContractStub}, mockWeb3);
  });

  after(async () => {
    loadContractStub.restore();
    deployContractStub.restore();
  });

  describe('constructing', () => {
    it('should load the contracts', () => {
      const contract = ContractManager.loadBundleRegistryContract(mockWeb3, '0xABCD');
      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.have.callCount(1);
      expect(contract).to.equal(exampleContract);
    });

    it('should throw if addresses are not configured', () => {
      expect(() => ContractManager.loadBundleRegistryContract(mockWeb3)).to.throw();
      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.not.have.been.called;
    });
  });
});
