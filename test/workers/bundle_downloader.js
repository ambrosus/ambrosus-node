import chai from 'chai';
import sinonChai from 'sinon-chai';
import {createWeb3, getDefaultAddress} from '../../src/utils/web3_tools';
import Apparatus from '../helpers/apparatus';
import nullConsole from '../helpers/null_console';
import BundleDownloader from '../../src/workers/bundle_downloader';
import ContractManager from '../../src/services/contract_manager';
import Builder from '../../src/builder';
import Config from '../../src/utils/config';

chai.use(sinonChai);
const {expect} = chai;

describe('Bundle downloader - integration', () => {
  let web3;
  let client;
  let bundleId;
  let apparatus;
  let dataModelEngine;
  let bundleDownloader;  

  before(async () => {
    web3 = await createWeb3();
  });

  const mongoUri = 'mongodb://localhost:27017/ambrosus_gateway_test2';

  beforeEach(async () => {    
    const bundleRegistryContractAddress = await ContractManager.deploy(web3);

    apparatus = new Apparatus();
    await apparatus.start(web3, Config.default({bundleRegistryContractAddress}));
    
    const builder = new Builder();
    ({dataModelEngine, client} = await builder.build({web3}, Config.default({bundleRegistryContractAddress, mongoUri})));
    
    await dataModelEngine.proofRepository.addVendor(getDefaultAddress(web3), apparatus.url());
    
    bundleDownloader = new BundleDownloader(dataModelEngine, 5000, nullConsole);        
    await bundleDownloader.beforeStart();
    ({bundleId} = await apparatus.dataModelEngine.finaliseBundle(1));
  });

  afterEach(async () => {
    client.close();
    await apparatus.stop();
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
    const bundle2 = await apparatus.dataModelEngine.finaliseBundle(2);
    const bundle3 = await apparatus.dataModelEngine.finaliseBundle(3);
  
    await bundleDownloader.downloadAllNew();  
    let bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle.bundleId).to.eq(bundleId);
    bundle = await dataModelEngine.entityRepository.getBundle(bundle2.bundleId);
    expect(bundle.bundleId).to.eq(bundle2.bundleId);
    bundle = await dataModelEngine.entityRepository.getBundle(bundle3.bundleId);
    expect(bundle.bundleId).to.eq(bundle3.bundleId);
  });
});
