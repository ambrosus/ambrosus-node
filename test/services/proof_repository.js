import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import ProofRepository from '../../src/services/proof_repository';
import * as Web3Tools from '../../src/utils/web3_tools';

chai.use(sinonChai);
const {expect} = chai;

describe('Proof repository', () => {
  let mockWeb3;
  let mockContractManager;
  let mockIdentityManager;
  let mockBundleProofRegistryContract;
  let mockAddBundleContractMethod;
  let repository;
  let getDefaultAddressStub;

  const exampleNodeAddress = '0xABCD';
  const exampleDefaultAddress = '0xBEEF';
  const exampleBundleId = '0x1234';

  before(async () => {
    getDefaultAddressStub = sinon.stub(Web3Tools, 'getDefaultAddress').returns(exampleDefaultAddress);

    mockWeb3 = {

    };

    mockIdentityManager = {
      nodeAddress: sinon.stub().returns(exampleNodeAddress)
    };

    mockAddBundleContractMethod = {
      send: sinon.stub()
    };

    mockBundleProofRegistryContract = {
      methods: {
        addBundle: sinon.stub().returns(mockAddBundleContractMethod)
      }
    };

    mockContractManager = {
      bundleProofRegistryContract: sinon.stub().returns(mockBundleProofRegistryContract)
    };

    repository = new ProofRepository(mockWeb3, mockContractManager, mockIdentityManager);
  });

  after(async () => {
    getDefaultAddressStub.restore();
  });

  describe('upload of proof', () => {
    it('should call the contract method', async () => {
      await repository.uploadProof(exampleBundleId);

      expect(mockIdentityManager.nodeAddress).to.have.been.called;
      expect(mockContractManager.bundleProofRegistryContract).to.have.been.called;
      expect(mockBundleProofRegistryContract.methods.addBundle).to.have.been.calledWith(exampleBundleId, exampleNodeAddress);
      expect(mockAddBundleContractMethod.send).to.have.been.called;
    });
  });
});
