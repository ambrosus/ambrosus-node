import sinon from 'sinon';
import Config from '../../src/utils/config';
import {getDefaultAddress} from '../../src/utils/web3_tools';
import build from '../../src/build';

export default async function buildWith({web3, dbUri, db, bundleRegistryContract, otherVendorUri}) {
  const registryContractAddressStub = sinon.stub(Config, 'bundleRegistryContractAddress');
  registryContractAddressStub.returns(bundleRegistryContract.options.address);
  const {dataModelEngine, client} = await build(web3, dbUri, db);
  await dataModelEngine.proofRepository.addVendor(getDefaultAddress(web3), otherVendorUri);
  return {dataModelEngine, client, registryContractAddressStub};
}
