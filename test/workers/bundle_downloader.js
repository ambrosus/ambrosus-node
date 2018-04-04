import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {deployContract, createWeb3} from '../../src/utils/web3_tools';
import Apparatus from '../helpers/apparatus';
import buildWith from '../helpers/build_with';

import BundleRegistry from '../../build/contracts/BundleRegistry.json';
import BundleDownloader from '../../src/workers/bundle_downloader';

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
  });

  beforeEach(async () => {
    ({dataModelEngine, client, registryContractAddressStub} = await buildWith({web3,
      dbUri: 'mongodb://localhost:27017/ambrosus_gateway_test2',
      db: 'ambrosus_gateway_test2',
      bundleRegistryContract: await deployContract(web3, BundleRegistry.abi, BundleRegistry.bytecode),
      otherVendorUri: 'http://127.0.0.1:9876'
    }));

    bundleDownloader = new BundleDownloader(dataModelEngine);
    apparatus = new Apparatus();
    await apparatus.start(web3);
    
    await bundleDownloader.beforeStart();
    ({bundleId} = await apparatus.modelEngine.finaliseBundle(1));
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    registryContractAddressStub.restore();
    consoleLogStub.restore();
    client.close();
    apparatus.stop();
  });

  it('has no bundles initially', async () => {
    const bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle).to.be.null;
  });

  it('download one bundle', async () => {
    await bundleDownloader.downloadOne(0);
    const bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle.bundleId).to.eq(bundleId);
  });

  it('download all new bundles', async () => {
    const bundle2 = await apparatus.modelEngine.finaliseBundle(2);
    const bundle3 = await apparatus.modelEngine.finaliseBundle(3);
  
    await bundleDownloader.downloadAllNew();  
    let bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle.bundleId).to.eq(bundleId);
    bundle = await dataModelEngine.entityRepository.getBundle(bundle2.bundleId);
    expect(bundle.bundleId).to.eq(bundle2.bundleId);
    bundle = await dataModelEngine.entityRepository.getBundle(bundle3.bundleId);
    expect(bundle.bundleId).to.eq(bundle3.bundleId);
  });
});
