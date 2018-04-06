import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import resetHistory from '../helpers/reset_history';

import ContractManager from '../../src/services/contract_manager';
import * as Web3Tools from '../../src/utils/web3_tools';
import Config from '../../src/utils/config';

chai.use(sinonChai);
const {expect} = chai;

describe('Contract Manager', () => {
  let mockWeb3;
  let loadContractStub;
  let deployContractStub;
  let bundleContractAddressStub;

  const exampleContract = 'a contract';
  let manager;

  before(async () => {
    loadContractStub = sinon.stub(Web3Tools, 'loadContract').returns(exampleContract);
    deployContractStub = sinon.stub(Web3Tools, 'deployContract').returns(exampleContract);
    bundleContractAddressStub = sinon.stub(Config, 'bundleRegistryContractAddress');

    mockWeb3 = {

    };
  });

  beforeEach(() => {
    resetHistory({loadContractStub, deployContractStub, bundleContractAddressStub}, mockWeb3);
  });

  after(async () => {
    bundleContractAddressStub.restore();
    loadContractStub.restore();
    deployContractStub.restore();
  });

  describe('constructing', () => {
    it('should load the contracts', () => {
      bundleContractAddressStub.returns('0xABCD');

      manager = new ContractManager(mockWeb3);

      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.have.callCount(1);
      expect(manager.bundleRegistry).to.equal(exampleContract);
    });

    it('should throw if addresses are not configured and allowMissing = false', () => {
      bundleContractAddressStub.returns(null);

      expect(() => new ContractManager(mockWeb3)).to.throw();

      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.not.have.been.called;
    });

    it('should silently ignore if addresses are not configured and allowMissing = true', () => {
      bundleContractAddressStub.returns(null);

      manager = new ContractManager(mockWeb3, true);

      expect(deployContractStub).to.not.have.been.called;
      expect(loadContractStub).to.not.have.been.called;
    });
  });

  it('deployIfNeeded loads missing contracts', async () => {
    bundleContractAddressStub.returns(null);
    manager = new ContractManager(mockWeb3, true);

    await manager.deployIfNeeded();

    expect(deployContractStub).to.have.callCount(1);
    expect(manager.bundleRegistry).to.equal(exampleContract);
  });
});
