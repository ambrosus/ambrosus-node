import chai from 'chai';
import sinonChai from 'sinon-chai';

import ProofRepository from '../../src/services/proof_repository';
import {createWeb3, deployContract, getDefaultAddress} from '../../src/utils/web3_tools';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';


chai.use(sinonChai);
const {expect} = chai;

describe('Proof repository', () => {
  const exampleVendorAddress = '0xF459bFCf1f20Fe43E1082E7f0c1A2bd68718a85B';
  const exampleBundleId = '0x0001000000000000000000000000000000000000000000000000000000000000';
  const exampleBundleId2 = '0x0002000000000000000000000000000000000000000000000000000000000000';

  let web3;
  let contract;
  let nodeAddress;
  let repository;

  beforeEach(async () => {
    web3 = await createWeb3();
    contract = await deployContract(web3, BundleRegistry.abi, BundleRegistry.bytecode);
    nodeAddress = getDefaultAddress(web3);
    repository = new ProofRepository(web3, nodeAddress, contract);
    await repository.addVendor(nodeAddress, 'node.example.com');
  });

  it('get url for vendor', async () => {
    expect(repository.getVendorUrl(nodeAddress)).to.eventually.eq('node.example.com');
  });

  it('test if vendor is on the list', async () => {
    expect(repository.isWhitelisted(nodeAddress)).to.eventually.be.true;
  });

  it('test if vendor is not on the list', async () => {
    expect(repository.isWhitelisted(exampleVendorAddress)).to.eventually.be.false;
  });

  it('uploads proof', async () => {
    await repository.uploadProof(exampleBundleId);
    const node = await repository.getNodeForBundle(exampleBundleId);
    expect(node).to.eq(nodeAddress);
  });

  it('Can get bundle by index', async () => {
    await repository.uploadProof(exampleBundleId);
    expect(await repository.getBundleCount()).to.eq(1);
    expect(await repository.getBundleByIndex(0)).to.eq(exampleBundleId);
  });

  it('Can get bundle by index (multiple bundles)', async () => {
    await repository.uploadProof(exampleBundleId);
    await repository.uploadProof(exampleBundleId2);
    expect(await repository.getBundleCount()).to.eq(2);
    expect(await repository.getBundleByIndex(0)).to.eq(exampleBundleId);
    expect(await repository.getBundleByIndex(1)).to.eq(exampleBundleId2);
  });
});
