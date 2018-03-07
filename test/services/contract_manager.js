import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import resetHistory from '../helpers/reset_history';

import ContractManager from '../../src/services/contract_manager';
import * as Web3Tools from '../../src/utils/web3_tools';

chai.use(sinonChai);
const {expect} = chai;

describe.only('Contract Manager', () => {
  let mockWeb3;
  let loadContractStub;
  let deployContractStub;

  const exampleContract = 'a contract';
  let manager;

  before(async () => {
    loadContractStub = sinon.stub(Web3Tools, 'loadContract').returns(exampleContract);
    deployContractStub = sinon.stub(Web3Tools, 'deployContract');

    mockWeb3 = {

    };
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
      manager = new ContractManager(mockWeb3);

      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.have.callCount(1);
      expect(manager.bundleRegistry).to.equal(exampleContract);
    });

    it('should throw if addresses are not configured and allowMissing = false)', () => {
      expect(() => new ContractManager(mockWeb3)).to.throw;

      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.not.have.been.called;
    });

    it('should silently ignore if addresses are not configured and allowMissing = true)', () => {
      manager = new ContractManager(mockWeb3, true);

      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.not.have.been.called;
    });
  });
});
