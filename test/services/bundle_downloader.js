import chai from 'chai';
import {buildWith} from '../../src/build';
import BundleRegistry from '../../build/contracts/BundleRegistry.json';
import sinonChai from 'sinon-chai';
import {deployContract, createWeb3} from '../../src/utils/web3_tools';
import Apparatus from '../helpers/apparatus';
import BundleDownloader from '../../src/services/bundle_downloader';
import sinon from 'sinon';

chai.use(sinonChai);
const {expect} = chai;

describe('Bundle downloader - integration', () => {
  let web3;
  let client;
  let bundleId;
  let apparatus;
  let dataModelEngine;
  let bundleDownloader;  
  
  let registryContractAddressStub;
  let consoleLogStub;

  before(async () => {
    web3 = await createWeb3();
    ({dataModelEngine, client, registryContractAddressStub} = await buildWith({web3,
      dbUri: 'mongodb://localhost:27017/ambrosus_gateway_test2',
      db: 'ambrosus_gateway_test2',
      bundleRegistryContract: await deployContract(web3, BundleRegistry.abi, BundleRegistry.bytecode),
      otherVendorUri: 'http://localhost:9876'
    }));

    bundleDownloader = new BundleDownloader(dataModelEngine);
    apparatus = new Apparatus();
    await apparatus.start(web3);
    
    consoleLogStub = sinon.stub(console, 'log');
    
    ({bundleId} = await apparatus.modelEngine.finaliseBundle(1));
  });

  it('has no bundles initialy', async () => {
    const bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle).to.be.null;
  });

  it('download one bundle', async () => {
    await bundleDownloader.downloadOne(bundleId);
    const bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle.bundleId).to.eq(bundleId);
  });

  after(() => {
    registryContractAddressStub.restore();
    consoleLogStub.restore();
    client.close();
    apparatus.stop();
  });
});
