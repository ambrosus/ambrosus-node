import sinon from 'sinon';
import Config from '../../src/utils/config';
import {getDefaultAddress} from '../../src/utils/web3_tools';
import Builder from '../../src/builder';

export default async function buildWith({web3, mongoUri, mongoDatabase, bundleRegistryContract, otherVendorUri}) {
  const registryContractAddressStub = sinon.stub(Config, 'bundleRegistryContractAddress');
  registryContractAddressStub.returns(bundleRegistryContract.options.address);  
  const builder = new Builder({web3, mongoUri, mongoDatabase});
  const {dataModelEngine, client} = await builder.build();
  await dataModelEngine.proofRepository.addVendor(getDefaultAddress(web3), otherVendorUri);
  return {dataModelEngine, client, registryContractAddressStub};
}
